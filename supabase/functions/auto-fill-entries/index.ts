import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EntryPayload {
  idx: number;
  type: string;
  category: string;
  costCenter: string;
  amount: number;
  date: string;
  description?: string;
}

interface AISuggestion {
  idx: number;
  category: string;
  costCenter: string;
  categoryConfidence: number;
  costCenterConfidence: number;
}

interface MergedSuggestion extends AISuggestion {
  categorySource: string;
  costCenterSource: string;
  hasConflict?: boolean;
  conflict?: {
    field: 'category' | 'costCenter';
    geminiValue: string;
    geminiConfidence: number;
    gptValue: string;
    gptConfidence: number;
  };
}

const parseAIResponse = (content: string): AISuggestion[] => {
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();
  return JSON.parse(jsonStr);
};

const buildSystemPrompt = (existingCategoriesContext: string, existingCostCenters: string[]) => {
  const costCentersContext = existingCostCenters.length > 0
    ? `\nCENTROS DE CUSTO EXISTENTES (PRIORIZE usar estes):\n${existingCostCenters.join(', ')}`
    : '';

  return `Você é um especialista em classificação contábil brasileira. Sua tarefa é inferir categorias e centros de custo para lançamentos financeiros que estão vazios ou incorretos.

REGRAS DE INFERÊNCIA PARA CENTROS DE CUSTO:
1. PRIORIZE usar centros de custo já existentes no arquivo
2. Analise a CATEGORIA e DESCRIÇÃO para inferir o centro de custo correto:
   - Transferências financeiras, juros, tarifas → "Financeiro"
   - Salários, benefícios, FGTS, INSS → "RH" ou "Recursos Humanos"
   - Marketing, vendas, comissões → "Comercial"
   - Aluguel, água, luz, manutenção → "Administrativo"
   - Compras de produtos, fornecedores → "Operacional"
   - Sistemas, software, equipamentos de TI → "TI"
   - Impostos → "Fiscal" ou "Tributário"

3. Se a categoria indica o tipo de despesa, use isso para inferir:
   - "Transferência de Entrada/Saída" → "Financeiro"
   - "Rendimentos de Aplicações" → "Financeiro"
   - "Salários" → "RH"

4. Analise padrões no arquivo:
   - Lançamentos similares devem ter o mesmo centro de custo
   - Use o histórico como referência
${existingCategoriesContext}
${costCentersContext}

FORMATO DE RESPOSTA:
Retorne APENAS um JSON array com as sugestões, incluindo confiança de 0 a 100:
[
  { "idx": 1, "category": "Categoria Sugerida", "costCenter": "Centro de Custo", "categoryConfidence": 85, "costCenterConfidence": 70 },
  { "idx": 2, "category": "Outra Categoria", "costCenter": "Outro Centro", "categoryConfidence": 60, "costCenterConfidence": 50 }
]

NÍVEIS DE CONFIANÇA:
- 90-100: Padrão muito claro baseado em categoria/descrição
- 70-89: Inferência baseada em centros de custo similares existentes
- 50-69: Inferência baseada em tipo e valor
- 0-49: Categoria genérica

Se não conseguir inferir com confiança, use:
- Centro de Custo: "Administrativo" (padrão mais comum)
- Confiança baixa (30-50)

Retorne APENAS o JSON, sem explicações.`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entries, existingCategories, existingCostCenters } = await req.json();
    
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return new Response(
        JSON.stringify({ error: "Entries array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Format entries for the prompt
    const entriesForPrompt = entries.map((e: EntryPayload) => 
      `${e.idx}. Tipo: ${e.type === 'receivable' ? 'RECEITA' : 'DESPESA'} | Categoria atual: "${e.category || '(vazio)'}" | Centro de Custo: "${e.costCenter || '(vazio)'}" | Valor: R$ ${Math.abs(e.amount).toFixed(2)} | Data: ${e.date}${e.description ? ` | Descrição: "${e.description}"` : ''}`
    ).join('\n');

    // Existing categories for context
    const existingCategoriesContext = existingCategories && existingCategories.length > 0
      ? `\nCATEGORIAS EXISTENTES NO ARQUIVO (use como referência):\n${existingCategories.join(', ')}`
      : '';

    const costCentersArray = existingCostCenters && Array.isArray(existingCostCenters) 
      ? existingCostCenters 
      : [];

    const systemPrompt = buildSystemPrompt(existingCategoriesContext, costCentersArray);

    const userPrompt = `Infira a categoria e centro de custo para os seguintes lançamentos (FOCO em preencher CENTROS DE CUSTO vazios):

${entriesForPrompt}

Retorne o JSON com as sugestões:`;

    console.log("Calling two AI models in parallel for comparison...");

    // Call both AI models in parallel
    const [response1, response2] = await Promise.all([
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
        }),
      }),
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
        }),
      }),
    ]);

    // Handle rate limits
    if (response1.status === 429 || response2.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response1.status === 402 || response2.status === 402) {
      return new Response(
        JSON.stringify({ error: "Payment required, please add funds." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let suggestions1: AISuggestion[] = [];
    let suggestions2: AISuggestion[] = [];

    // Parse Gemini response
    if (response1.ok) {
      try {
        const data1 = await response1.json();
        const content1 = data1.choices?.[0]?.message?.content;
        if (content1) {
          suggestions1 = parseAIResponse(content1);
          console.log("Gemini suggestions:", suggestions1.length);
        }
      } catch (e) {
        console.error("Failed to parse Gemini response:", e);
      }
    } else {
      console.error("Gemini request failed:", response1.status);
    }

    // Parse GPT-5 response
    if (response2.ok) {
      try {
        const data2 = await response2.json();
        const content2 = data2.choices?.[0]?.message?.content;
        if (content2) {
          suggestions2 = parseAIResponse(content2);
          console.log("GPT-5 suggestions:", suggestions2.length);
        }
      } catch (e) {
        console.error("Failed to parse GPT-5 response:", e);
      }
    } else {
      console.error("GPT-5 request failed:", response2.status);
    }

    // Merge suggestions - compare and choose the best, track conflicts
    const mergedSuggestions: MergedSuggestion[] = [];
    const conflicts: MergedSuggestion['conflict'][] = [];
    
    const allIdxs = new Set([
      ...suggestions1.map(s => s.idx),
      ...suggestions2.map(s => s.idx)
    ]);

    for (const idx of allIdxs) {
      const s1 = suggestions1.find(s => s.idx === idx);
      const s2 = suggestions2.find(s => s.idx === idx);

      if (!s1 && !s2) continue;

      const merged: MergedSuggestion = {
        idx,
        category: '',
        costCenter: '',
        categoryConfidence: 0,
        costCenterConfidence: 0,
        categorySource: '',
        costCenterSource: ''
      };

      if (s1 && s2) {
        // Check for cost center conflict (different values with similar confidence)
        const costCenterConflict = s1.costCenter !== s2.costCenter && 
          Math.abs(s1.costCenterConfidence - s2.costCenterConfidence) < 20;

        if (costCenterConflict) {
          merged.hasConflict = true;
          merged.conflict = {
            field: 'costCenter',
            geminiValue: s1.costCenter,
            geminiConfidence: s1.costCenterConfidence,
            gptValue: s2.costCenter,
            gptConfidence: s2.costCenterConfidence
          };
        }

        // Choose category with highest confidence
        if (s1.categoryConfidence >= s2.categoryConfidence) {
          merged.category = s1.category;
          merged.categoryConfidence = s1.categoryConfidence;
          merged.categorySource = 'Gemini';
        } else {
          merged.category = s2.category;
          merged.categoryConfidence = s2.categoryConfidence;
          merged.categorySource = 'GPT-5';
        }

        // Choose cost center with highest confidence
        if (s1.costCenterConfidence >= s2.costCenterConfidence) {
          merged.costCenter = s1.costCenter;
          merged.costCenterConfidence = s1.costCenterConfidence;
          merged.costCenterSource = 'Gemini';
        } else {
          merged.costCenter = s2.costCenter;
          merged.costCenterConfidence = s2.costCenterConfidence;
          merged.costCenterSource = 'GPT-5';
        }

        // Boost confidence if both AIs agree
        if (s1.costCenter === s2.costCenter) {
          merged.costCenterConfidence = Math.min(100, merged.costCenterConfidence + 15);
        }
        if (s1.category === s2.category) {
          merged.categoryConfidence = Math.min(100, merged.categoryConfidence + 15);
        }
      } else if (s1) {
        merged.category = s1.category;
        merged.costCenter = s1.costCenter;
        merged.categoryConfidence = s1.categoryConfidence;
        merged.costCenterConfidence = s1.costCenterConfidence;
        merged.categorySource = 'Gemini';
        merged.costCenterSource = 'Gemini';
      } else if (s2) {
        merged.category = s2.category;
        merged.costCenter = s2.costCenter;
        merged.categoryConfidence = s2.categoryConfidence;
        merged.costCenterConfidence = s2.costCenterConfidence;
        merged.categorySource = 'GPT-5';
        merged.costCenterSource = 'GPT-5';
      }

      mergedSuggestions.push(merged);
    }

    const conflictCount = mergedSuggestions.filter(s => s.hasConflict).length;
    console.log(`Merged ${mergedSuggestions.length} suggestions, ${conflictCount} conflicts`);

    return new Response(
      JSON.stringify({ 
        suggestions: mergedSuggestions,
        dualAI: true,
        model1: 'google/gemini-2.5-flash',
        model2: 'openai/gpt-5-mini',
        conflictCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Auto-fill error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
