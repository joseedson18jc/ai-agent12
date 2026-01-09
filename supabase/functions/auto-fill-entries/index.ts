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

const buildSystemPrompt = (existingCategoriesContext: string, existingCostCenters: string[], userPreferences: Array<{ category: string; costCenter: string }>) => {
  const costCentersContext = existingCostCenters.length > 0
    ? `\nCENTROS DE CUSTO EXISTENTES (PRIORIZE usar estes):\n${existingCostCenters.join(', ')}`
    : '';

  const preferencesContext = userPreferences.length > 0
    ? `\nPREFERÊNCIAS DO USUÁRIO (USE estas correspondências aprendidas - ALTA PRIORIDADE):\n${userPreferences.map(p => `- "${p.category}" → "${p.costCenter}"`).join('\n')}`
    : '';

  return `Você é um especialista em classificação contábil brasileira. Sua tarefa é inferir categorias e centros de custo para lançamentos financeiros que estão vazios ou incorretos.

REGRAS DE INFERÊNCIA PARA CENTROS DE CUSTO (em ordem de prioridade):
1. **PRIORIDADE MÁXIMA**: Use as PREFERÊNCIAS DO USUÁRIO abaixo - se uma categoria corresponder, use o centro de custo aprendido
2. PRIORIZE usar centros de custo já existentes no arquivo
3. Analise a CATEGORIA e DESCRIÇÃO para inferir o centro de custo correto:
   - Transferências financeiras, juros, tarifas → "Financeiro"
   - Salários, benefícios, FGTS, INSS → "RH" ou "Recursos Humanos"
   - Marketing, vendas, comissões → "Comercial"
   - Aluguel, água, luz, manutenção → "Administrativo"
   - Compras de produtos, fornecedores → "Operacional"
   - Sistemas, software, equipamentos de TI → "TI"
   - Impostos → "Fiscal" ou "Tributário"

4. Se a categoria indica o tipo de despesa, use isso para inferir:
   - "Transferência de Entrada/Saída" → "Financeiro"
   - "Rendimentos de Aplicações" → "Financeiro"
   - "Salários" → "RH"

5. Analise padrões no arquivo:
   - Lançamentos similares devem ter o mesmo centro de custo
   - Use o histórico como referência
${existingCategoriesContext}
${costCentersContext}
${preferencesContext}

FORMATO DE RESPOSTA:
Retorne APENAS um JSON array com as sugestões, incluindo confiança de 0 a 100:
[
  { "idx": 1, "category": "Categoria Sugerida", "costCenter": "Centro de Custo", "categoryConfidence": 85, "costCenterConfidence": 70 },
  { "idx": 2, "category": "Outra Categoria", "costCenter": "Outro Centro", "categoryConfidence": 60, "costCenterConfidence": 50 }
]

NÍVEIS DE CONFIANÇA:
- 95-100: Correspondência exata com preferências do usuário
- 90-94: Padrão muito claro baseado em categoria/descrição
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
    const { entries, existingCategories, existingCostCenters, userPreferences } = await req.json();
    
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return new Response(
        JSON.stringify({ error: "Entries array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) {
      throw new Error("XAI_API_KEY is not configured");
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

    const preferencesArray = userPreferences && Array.isArray(userPreferences)
      ? userPreferences
      : [];

    const systemPrompt = buildSystemPrompt(existingCategoriesContext, costCentersArray, preferencesArray);

    const userPrompt = `Infira a categoria e centro de custo para os seguintes lançamentos (FOCO em preencher CENTROS DE CUSTO vazios):

${entriesForPrompt}

Retorne o JSON com as sugestões:`;

    console.log("Calling xAI Grok 4 for auto-fill...");

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    // Handle rate limits
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Payment required, please add funds." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("xAI API error:", response.status, errorText);
      throw new Error(`xAI API error: ${response.status}`);
    }

    let suggestions: AISuggestion[] = [];

    try {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        suggestions = parseAIResponse(content);
        console.log("xAI Grok 4 suggestions:", suggestions.length);
      }
    } catch (e) {
      console.error("Failed to parse xAI response:", e);
    }

    // Add source info to suggestions
    const suggestionsWithSource = suggestions.map(s => ({
      ...s,
      categorySource: 'Grok 4',
      costCenterSource: 'Grok 4'
    }));

    console.log(`Processed ${suggestionsWithSource.length} suggestions`);

    return new Response(
      JSON.stringify({ 
        suggestions: suggestionsWithSource,
        model: 'xai/grok-4-latest'
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
