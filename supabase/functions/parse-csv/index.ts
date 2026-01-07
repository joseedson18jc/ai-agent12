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
    const { csvContent } = await req.json();
    
    if (!csvContent || typeof csvContent !== 'string') {
      return new Response(
        JSON.stringify({ error: 'CSV content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get first 30 lines as sample for AI analysis
    const lines = csvContent.split(/\r?\n/).filter(l => l.trim());
    const sampleLines = lines.slice(0, 30).join('\n');

    const systemPrompt = `You are a CSV parser expert. Your task is to analyze CSV data and convert it to a standardized format for a Brazilian financial system.

The output format MUST have these exact columns (in Portuguese):
- Tipo: "Pagar" for expenses/outflows or "Receber" for income/inflows
- Categoria: The category or description of the transaction
- Centro de Custo: Cost center or department (can be empty)
- Valor: The numeric value (positive for income, negative for expenses)
- Data: The date in YYYY-MM-DD format

IMPORTANT RULES:
1. Analyze the input CSV header and data to understand the structure
2. Map columns intelligently:
   - Look for columns indicating type: tipo, type, natureza, movimento, d/c, débito/crédito, entrada/saída
   - Look for description/category: descrição, categoria, histórico, conta, item
   - Look for amounts: valor, value, amount, total, montante
   - Look for dates: data, date, vencimento, competência, emissão
   - Look for cost centers: centro de custo, departamento, setor, projeto
3. For the Tipo field:
   - If there's a D/C or Débito/Crédito column: D or Débito = "Pagar", C or Crédito = "Receber"
   - If there's an Entrada/Saída column: Saída = "Pagar", Entrada = "Receber"
   - If the value is negative: "Pagar"
   - If the value is positive: "Receber"
4. For dates: Convert any date format to YYYY-MM-DD
5. For values: Remove currency symbols and convert to number format with dot as decimal separator
6. Skip empty rows and header rows
7. If you can't determine a required field, make a reasonable inference based on context

Return ONLY valid CSV data with the header row first, then data rows. No explanations or markdown.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analyze and convert this CSV data to the standardized format. Here's the CSV content:\n\n${sampleLines}\n\nConvert ALL ${lines.length} rows (I'm showing you a sample of the first 30 lines). Return the converted CSV with header: Tipo;Categoria;Centro de Custo;Valor;Data` 
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const normalizedCsv = data.choices?.[0]?.message?.content?.trim();

    if (!normalizedCsv) {
      throw new Error('No response from AI');
    }

    // Clean up the response (remove markdown code blocks if present)
    let cleanCsv = normalizedCsv
      .replace(/```csv\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log('AI normalized CSV (first 500 chars):', cleanCsv.substring(0, 500));

    return new Response(
      JSON.stringify({ normalizedCsv: cleanCsv }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in parse-csv function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});