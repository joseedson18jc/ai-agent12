import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// DRE sections with detailed descriptions for the AI
const DRE_SECTIONS = [
  { value: 'revenue', label: 'Receita', description: 'Vendas de produtos, serviços, consultoria, licenciamento, assinaturas, comissões recebidas' },
  { value: 'deductions', label: 'Deduções', description: 'ICMS, PIS, COFINS, ISS, IPI, devoluções, abatimentos, descontos concedidos sobre vendas' },
  { value: 'cogs', label: 'Custo de Vendas (CPV)', description: 'Matéria-prima, insumos, custo de mercadoria vendida, mão de obra direta, embalagens, frete de compras, custos de produção' },
  { value: 'administrative', label: 'Despesa Administrativa', description: 'Aluguel de escritório, salários administrativos, material de escritório, telefone, internet, contador, advogado, limpeza, segurança, TI, software, energia elétrica, água' },
  { value: 'sales', label: 'Despesa de Vendas', description: 'Comissões de vendas, propaganda, marketing, publicidade, frete de vendas, viagens comerciais, representantes, brindes, feiras' },
  { value: 'operational_other', label: 'Operacional Outro', description: 'Outras despesas operacionais não classificadas, multas operacionais, indenizações, perdas operacionais' },
  { value: 'depreciation', label: 'Depreciação', description: 'Depreciação de máquinas, equipamentos, veículos, móveis, amortização de intangíveis, provisões para perdas' },
  { value: 'financial', label: 'Resultado Financeiro', description: 'Juros pagos, juros recebidos, tarifas bancárias, IOF, variação cambial, rendimentos de aplicações, multas financeiras, empréstimos, financiamentos' },
  { value: 'income_tax', label: 'IR/CSLL', description: 'Imposto de Renda Pessoa Jurídica, Contribuição Social sobre Lucro Líquido, impostos sobre o resultado' },
  { value: 'other', label: 'Outros', description: 'Itens não recorrentes, ganhos/perdas extraordinárias, venda de ativos, provisões especiais' },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categories } = await req.json();
    
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return new Response(
        JSON.stringify({ error: "Categories array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) {
      throw new Error("XAI_API_KEY is not configured");
    }

    // Format the sections for the prompt
    const sectionsDescription = DRE_SECTIONS.map(s => 
      `- "${s.value}": ${s.label} - ${s.description}`
    ).join('\n');

    // Format categories for the prompt
    const categoriesForPrompt = categories.map((c: { key: string; category: string; costCenter: string | null; type: string; totalAmount: number }, i: number) => 
      `${i + 1}. Key: "${c.key}" | Categoria: "${c.category}" | Centro de Custo: "${c.costCenter || 'N/A'}" | Tipo: ${c.type === 'receivable' ? 'ENTRADA' : 'SAÍDA'} | Valor Total: R$ ${c.totalAmount.toFixed(2)}`
    ).join('\n');

    const systemPrompt = `Você é um especialista em contabilidade gerencial brasileira e classificação de contas para DRE (Demonstração do Resultado do Exercício). Sua tarefa é classificar cada categoria contábil na seção correta do DRE.

SEÇÕES DO DRE DISPONÍVEIS:
${sectionsDescription}

REGRAS CRÍTICAS DE CLASSIFICAÇÃO:
1. ENTRADAS (receivable) geralmente são "revenue", mas podem ser "financial" se forem rendimentos de aplicações ou juros recebidos
2. SAÍDAS (payable) devem ser classificadas conforme a natureza da despesa:
   - Impostos sobre vendas (ICMS, PIS, COFINS, ISS, IPI) = "deductions"
   - Impostos sobre lucro (IRPJ, CSLL) = "income_tax"
   - Custos de produção/mercadoria = "cogs"
   - Despesas de escritório, RH, TI, contabilidade = "administrative"
   - Despesas comerciais, marketing, comissões = "sales"
   - Juros, tarifas bancárias, empréstimos = "financial"
   - Depreciação, amortização = "depreciation"

3. Analise o nome da categoria E o centro de custo para decidir
4. Se uma categoria mencionar "vendas" mas for uma SAÍDA, verifique se é custo de vendas (cogs), despesa de vendas (sales) ou comissão (sales)
5. Categorias ambíguas devem ser classificadas como "other"

FORMATO DE RESPOSTA:
Retorne APENAS um JSON array com a classificação de cada categoria, na mesma ordem recebida:
[
  { "key": "categoria_key", "section": "revenue" },
  { "key": "outra_categoria_key", "section": "administrative" }
]

Não inclua explicações, apenas o JSON.`;

    const userPrompt = `Classifique as seguintes categorias contábeis:

${categoriesForPrompt}

Retorne o JSON com as classificações:`;

    console.log("Calling xAI Grok 4 for category mapping...");

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
        temperature: 0.1, // Low temperature for more deterministic results
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
      console.error("xAI API error:", response.status, errorText);
      throw new Error(`xAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Extract JSON from the response (handle markdown code blocks)
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

    const mappings = JSON.parse(jsonStr);

    // Validate the response
    const validSections = DRE_SECTIONS.map(s => s.value);
    const validatedMappings = mappings.map((m: { key: string; section: string }) => ({
      key: m.key,
      section: validSections.includes(m.section) ? m.section : 'other'
    }));

    return new Response(
      JSON.stringify({ mappings: validatedMappings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Auto-map error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
