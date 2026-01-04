import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { financialData, costCenter, language = 'pt-BR' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Generating financial insights for cost center:', costCenter || 'All');
    console.log('Financial data summary:', JSON.stringify(financialData).substring(0, 500));

    const systemPrompt = `Você é um CFO experiente e estrategista financeiro. Analise os dados DRE (Demonstração do Resultado do Exercício) fornecidos e gere insights estratégicos em português brasileiro.

Sua análise deve incluir:
1. **Comparativo Mensal (MoM)**: Variações percentuais de receita, EBITDA e margem líquida
2. **Diagnóstico de Variação**: Identificar principais drivers de performance
3. **Plano de Ação Estratégico**: Recomendações priorizadas (Alta/Média/Baixa prioridade)

Use emojis estrategicamente para destacar tendências (🟢 positivo, 🟡 neutro, 🔴 negativo).
Formate em Markdown estruturado. Seja conciso mas impactante.`;

    const userPrompt = `Analise os seguintes dados DRE${costCenter && costCenter !== 'all' ? ` para o centro de custo "${costCenter}"` : ' consolidados'}:

${JSON.stringify(financialData, null, 2)}

Gere uma análise estratégica executiva completa.`;

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
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    console.log('Streaming response from AI gateway');
    
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Financial insights error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
