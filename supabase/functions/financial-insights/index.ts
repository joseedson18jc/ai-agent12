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
    
    console.log('Using AI provider: xAI Grok 4');
    console.log('Generating financial insights for cost center:', costCenter || 'All');

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) {
      throw new Error("XAI_API_KEY is not configured");
    }

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

    console.log('Calling xAI Grok 4...');
    
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
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('xAI API error:', response.status, errorText);
      
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
      throw new Error(`xAI API error: ${response.status} - ${errorText}`);
    }

    console.log('Streaming response from xAI Grok 4');

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
