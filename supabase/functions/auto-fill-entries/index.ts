import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entries, existingCategories } = await req.json();
    
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
    const entriesForPrompt = entries.map((e: { 
      idx: number; 
      type: string; 
      category: string; 
      costCenter: string; 
      amount: number; 
      date: string;
      description?: string;
    }) => 
      `${e.idx}. Tipo: ${e.type === 'receivable' ? 'RECEITA' : 'DESPESA'} | Categoria atual: "${e.category || '(vazio)'}" | Centro de Custo: "${e.costCenter || '(vazio)'}" | Valor: R$ ${Math.abs(e.amount).toFixed(2)} | Data: ${e.date}${e.description ? ` | Descrição: "${e.description}"` : ''}`
    ).join('\n');

    // Existing categories for context
    const existingCategoriesContext = existingCategories && existingCategories.length > 0
      ? `\nCATEGORIAS EXISTENTES NO ARQUIVO (use como referência):\n${existingCategories.join(', ')}`
      : '';

    const systemPrompt = `Você é um especialista em classificação contábil brasileira. Sua tarefa é inferir categorias e centros de custo para lançamentos financeiros que estão vazios ou incorretos.

REGRAS DE INFERÊNCIA:
1. Para RECEITAS (receivable):
   - Valores altos e redondos geralmente são "Vendas de Produtos" ou "Prestação de Serviços"
   - Valores menores podem ser "Outras Receitas" ou "Receita Financeira"
   
2. Para DESPESAS (payable):
   - Valores mensais fixos: Aluguel, Salários, Serviços de TI, Internet
   - Valores variáveis baixos: Material de Escritório, Lanches, Transporte
   - Valores variáveis altos: Fornecedores, Matéria Prima, Marketing
   - Valores com padrão bancário: Tarifas Bancárias, Juros
   - Valores no fim do mês com padrão de folha: Salários, Encargos Trabalhistas

3. CENTROS DE CUSTO comuns:
   - "Administrativo" - despesas gerais de escritório
   - "Comercial" - vendas e marketing
   - "Operacional" - produção e logística
   - "Financeiro" - despesas bancárias e financeiras
   - "RH" - despesas de pessoal
   - "TI" - tecnologia e sistemas

4. Analise o VALOR e a DATA para inferir:
   - Valores múltiplos de 1000 no dia 5 ou 25 = provável salário
   - Valores pequenos diários = despesas operacionais
   - Valores grandes no início do mês = aluguel

5. Use as categorias existentes no arquivo como referência para manter consistência
${existingCategoriesContext}

FORMATO DE RESPOSTA:
Retorne APENAS um JSON array com as sugestões:
[
  { "idx": 1, "category": "Categoria Sugerida", "costCenter": "Centro de Custo" },
  { "idx": 2, "category": "Outra Categoria", "costCenter": "Outro Centro" }
]

Se não conseguir inferir com confiança, use:
- Categoria: "Outros" + tipo (ex: "Outras Receitas", "Outras Despesas")
- Centro de Custo: "Geral"

Retorne APENAS o JSON, sem explicações.`;

    const userPrompt = `Infira a categoria e centro de custo para os seguintes lançamentos:

${entriesForPrompt}

Retorne o JSON com as sugestões:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    });

    if (!response.ok) {
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Extract JSON from the response
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

    const suggestions = JSON.parse(jsonStr);

    return new Response(
      JSON.stringify({ suggestions }),
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
