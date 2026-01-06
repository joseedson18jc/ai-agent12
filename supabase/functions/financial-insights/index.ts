import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AIProvider = 'lovable' | 'openai' | 'anthropic' | 'xai';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authentication token' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error('Invalid token:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid authentication token' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;
    console.log('Authenticated user:', userId);

    const { financialData, costCenter, language = 'pt-BR', provider = 'lovable' } = await req.json();
    
    console.log('Using AI provider:', provider);
    console.log('Generating financial insights for cost center:', costCenter || 'All');

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

    let response: Response;

    switch (provider as AIProvider) {
      case 'openai': {
        const OPENAI_API_KEY = Deno.env.get("OPEN_AI_API_KEY");
        if (!OPENAI_API_KEY) {
          throw new Error("OPEN_AI_API_KEY is not configured");
        }
        console.log('Calling OpenAI GPT-4o...');
        
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            stream: true,
            max_tokens: 2000,
          }),
        });
        break;
      }

      case 'anthropic': {
        const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
        if (!ANTHROPIC_API_KEY) {
          throw new Error("ANTHROPIC_API_KEY is not configured");
        }
        console.log('Calling Anthropic Claude Sonnet 4...');
        
        response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            system: systemPrompt,
            messages: [
              { role: "user", content: userPrompt },
            ],
            stream: true,
          }),
        });
        break;
      }

      case 'xai': {
        const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
        if (!XAI_API_KEY) {
          throw new Error("XAI_API_KEY is not configured");
        }
        console.log('Calling XAI Grok...');
        
        response = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${XAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "grok-3",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            stream: true,
          }),
        });
        break;
      }

      case 'lovable':
      default: {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          throw new Error("LOVABLE_API_KEY is not configured");
        }
        console.log('Calling Lovable AI (Gemini)...');
        
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        break;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${provider} API error:`, response.status, errorText);
      
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
      throw new Error(`${provider} API error: ${response.status} - ${errorText}`);
    }

    console.log('Streaming response from', provider);
    
    // For Anthropic, we need to transform the SSE format
    if (provider === 'anthropic') {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const stream = new ReadableStream({
        async start(controller) {
          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                controller.close();
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") continue;
                  
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                      // Transform to OpenAI-compatible format
                      const openAIFormat = {
                        choices: [{
                          delta: { content: parsed.delta.text }
                        }]
                      };
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                    }
                  } catch {
                    // Skip malformed JSON
                  }
                }
              }
            }
          } catch (error) {
            console.error("Stream error:", error);
            controller.error(error);
          }
        }
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

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
