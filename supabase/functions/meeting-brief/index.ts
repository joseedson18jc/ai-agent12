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
    const { financialData, costCenter, meetingTopic, meetingDate } = await req.json();

    console.log('Generating meeting brief with xAI Grok 4');

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) {
      throw new Error("XAI_API_KEY is not configured");
    }

    const systemPrompt = `Você é um CFO experiente preparando um briefing executivo para uma reunião financeira. Gere um documento de preparação para reunião em português brasileiro, estruturado e profissional.

O briefing deve seguir esta estrutura:

## 📋 Resumo Executivo
Visão geral de 2-3 parágrafos sobre a situação financeira atual da empresa.

## 📊 Destaques Financeiros
- Receita, EBITDA, Lucro Líquido e margens do período mais recente
- Variações MoM (mês a mês) relevantes com indicadores visuais (🟢 🟡 🔴)
- Top 3 métricas que merecem atenção especial

## ⚠️ Pontos de Atenção e Riscos
- Áreas com performance abaixo do esperado
- Tendências negativas que precisam ser discutidas
- Riscos identificados nos dados financeiros

## 💬 Pontos de Discussão Sugeridos
- 5-7 perguntas/tópicos estratégicos para a pauta da reunião
- Cada ponto deve ter um breve contexto baseado nos dados

## 🎯 Recomendações e Próximos Passos
- Ações priorizadas (Alta/Média/Baixa prioridade)
- Decisões que precisam ser tomadas na reunião
- Metas sugeridas para o próximo período

Use formatação Markdown estruturada. Seja conciso, objetivo e orientado a decisões. Use emojis estrategicamente para facilitar a leitura rápida.`;

    const topicContext = meetingTopic ? `\nTópico da reunião: "${meetingTopic}"` : '';
    const dateContext = meetingDate ? `\nData da reunião: ${meetingDate}` : '';

    const userPrompt = `Prepare um briefing executivo para reunião financeira com base nos seguintes dados DRE${costCenter && costCenter !== 'all' ? ` do centro de custo "${costCenter}"` : ' consolidados'}:${topicContext}${dateContext}

${JSON.stringify(financialData, null, 2)}

Gere um documento completo de preparação para reunião, com insights acionáveis e pontos de discussão estratégicos.`;

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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Meeting brief error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
