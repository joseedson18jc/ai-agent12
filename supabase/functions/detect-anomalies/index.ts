import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    const { financialData, metrics } = await req.json();

    console.log('Analyzing financial data for anomalies with xAI Grok 4...');

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) {
      throw new Error("XAI_API_KEY is not configured");
    }

    const systemPrompt = `Você é um analista financeiro especializado em detecção de anomalias. 
Analise os dados financeiros e identifique padrões anômalos ou suspeitos.

Retorne APENAS um JSON válido com o seguinte formato (sem markdown, sem código):
{
  "anomalies": [
    {
      "title": "Título curto da anomalia",
      "description": "Descrição detalhada do problema",
      "severity": "critical" | "warning" | "info",
      "metric_type": "revenue" | "ebitda" | "net_income" | "gross_profit" | "opex" | "cogs",
      "expected_value": número esperado,
      "current_value": valor atual,
      "deviation_percent": percentual de desvio
    }
  ]
}

Severidades:
- "critical": Desvio > 30% ou padrão muito suspeito
- "warning": Desvio entre 15-30% ou padrão incomum
- "info": Desvio entre 10-15% ou observação relevante

Se não encontrar anomalias significativas, retorne: {"anomalies": []}`;

    const userPrompt = `Analise os seguintes dados financeiros e detecte anomalias:

${JSON.stringify(financialData, null, 2)}

Métricas recentes: ${JSON.stringify(metrics, null, 2)}

Identifique:
1. Variações bruscas entre meses consecutivos
2. Padrões de gastos fora do normal
3. Margens inconsistentes
4. Qualquer comportamento financeiro suspeito`;

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('xAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`xAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '{"anomalies": []}';
    
    console.log('xAI Grok 4 response:', content);

    // Parse the JSON response
    let anomalies = [];
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      anomalies = parsed.anomalies || [];
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      anomalies = [];
    }

    // Save anomalies to database
    if (anomalies.length > 0) {
      const anomaliesToInsert = anomalies.map((a: any) => ({
        user_id: userId,
        title: a.title,
        description: a.description,
        severity: a.severity || 'info',
        metric_type: a.metric_type,
        expected_value: a.expected_value,
        current_value: a.current_value,
        deviation_percent: a.deviation_percent,
      }));

      const { error: insertError } = await supabase
        .from('financial_anomalies')
        .insert(anomaliesToInsert);

      if (insertError) {
        console.error('Failed to save anomalies:', insertError);
      } else {
        console.log(`Saved ${anomalies.length} anomalies to database`);
      }
    }

    return new Response(JSON.stringify({ anomalies }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
