import { BPSection } from '@/types/finance';

// Auto-mapping rules for Conta Azul categories to DRE sections
// These rules are based on common Brazilian accounting patterns

interface MappingRule {
  keywords: string[];
  section: BPSection;
  priority: number; // Higher priority = checked first
}

const CONTA_AZUL_MAPPING_RULES: MappingRule[] = [
  // Revenue (Receitas)
  {
    keywords: ['venda', 'vendas', 'faturamento', 'receita operacional', 'servicos prestados', 'serviços prestados', 'consultoria', 'honorarios', 'honorários', 'comissoes recebidas', 'comissões recebidas', 'receita de vendas'],
    section: 'revenue',
    priority: 100
  },
  
  // Financial Income (Receitas Financeiras) - positive financial items
  {
    keywords: ['rendimentos de aplicacoes', 'rendimentos de aplicações', 'rendimento aplicacao', 'rendimento aplicação', 'juros recebidos', 'receita financeira', 'rendimentos financeiros', 'ganhos financeiros', 'juros ativos', 'desconto obtido', 'descontos obtidos'],
    section: 'financial',
    priority: 95
  },

  // Deductions (Deduções da Receita)
  {
    keywords: ['icms', 'pis', 'cofins', 'iss', 'ipi', 'impostos sobre vendas', 'devolucao', 'devolução', 'abatimento', 'desconto concedido', 'descontos concedidos', 'tributos sobre vendas'],
    section: 'deductions',
    priority: 90
  },

  // COGS (Custo dos Produtos/Serviços Vendidos)
  {
    keywords: ['materia prima', 'matéria prima', 'custo mercadoria', 'cmv', 'cpv', 'custo produto', 'custo producao', 'custo produção', 'insumos', 'embalagem', 'frete compra', 'custo servico', 'custo serviço'],
    section: 'cogs',
    priority: 85
  },

  // Administrative Expenses (Despesas Administrativas)
  {
    keywords: ['aluguel', 'salario', 'salário', 'salarios', 'salários', 'folha de pagamento', 'beneficios', 'benefícios', 'vale transporte', 'vale alimentacao', 'vale alimentação', 'encargos sociais', 'inss', 'fgts', 'telefone', 'internet', 'energia', 'agua', 'água', 'luz', 'condominio', 'condomínio', 'material escritorio', 'material escritório', 'limpeza', 'manutencao', 'manutenção', 'seguro', 'contador', 'contabilidade', 'assessoria', 'honorarios contabeis', 'honorários contábeis', 'pro labore', 'pró-labore', 'software', 'sistema', 'licenca', 'licença', 'assinatura'],
    section: 'administrative',
    priority: 75
  },

  // Sales Expenses (Despesas Comerciais)
  {
    keywords: ['marketing', 'publicidade', 'propaganda', 'anuncio', 'anúncio', 'google ads', 'facebook ads', 'instagram', 'midia', 'mídia', 'comissao vendedor', 'comissão vendedor', 'comissoes', 'comissões', 'frete venda', 'entrega', 'representante comercial', 'promocao', 'promoção', 'eventos', 'feira', 'brindes', 'material promocional'],
    section: 'sales',
    priority: 70
  },

  // Other Operational Expenses
  {
    keywords: ['despesas diversas', 'outras despesas', 'viagem', 'hospedagem', 'alimentacao', 'alimentação', 'combustivel', 'combustível', 'estacionamento', 'taxi', 'uber', 'pedagio', 'pedágio', 'cartorio', 'cartório', 'taxa', 'multa', 'despesa operacional'],
    section: 'operational_other',
    priority: 65
  },

  // Depreciation & Amortization
  {
    keywords: ['depreciacao', 'depreciação', 'amortizacao', 'amortização', 'exaustao', 'exaustão'],
    section: 'depreciation',
    priority: 60
  },

  // Financial Expenses (Despesas Financeiras)
  {
    keywords: ['juros pago', 'juros pagos', 'juros passivos', 'juros emprestimo', 'juros empréstimo', 'despesas bancarias', 'despesas bancárias', 'tarifa bancaria', 'tarifa bancária', 'iof', 'encargos financeiros', 'multa atraso', 'mora', 'variacao cambial', 'variação cambial'],
    section: 'financial',
    priority: 55
  },

  // Income Tax (Impostos sobre o Lucro)
  {
    keywords: ['imposto de renda', 'irpj', 'csll', 'ir estimado', 'contribuicao social', 'contribuição social', 'simples nacional', 'das', 'imposto lucro'],
    section: 'income_tax',
    priority: 50
  },
];

/**
 * Normalize a string for comparison (remove accents, lowercase, etc.)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Auto-map a category to a DRE section based on Conta Azul patterns
 * Returns the section if found, null if no match
 */
export function autoMapContaAzulCategory(category: string): BPSection | null {
  const normalizedCategory = normalizeText(category);
  
  // Sort rules by priority (highest first)
  const sortedRules = [...CONTA_AZUL_MAPPING_RULES].sort((a, b) => b.priority - a.priority);
  
  for (const rule of sortedRules) {
    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      
      // Check if category contains the keyword
      if (normalizedCategory.includes(normalizedKeyword)) {
        return rule.section;
      }
      
      // Check if keyword contains the category (for short category names)
      if (normalizedKeyword.includes(normalizedCategory) && normalizedCategory.length > 3) {
        return rule.section;
      }
    }
  }
  
  return null;
}

/**
 * Auto-map multiple categories at once
 * Returns a map of category -> section for successfully mapped categories
 */
export function autoMapContaAzulCategories(categories: string[]): Map<string, BPSection> {
  const result = new Map<string, BPSection>();
  
  for (const category of categories) {
    const section = autoMapContaAzulCategory(category);
    if (section) {
      result.set(category, section);
    }
  }
  
  return result;
}

/**
 * Get confidence level for a mapping
 */
export function getMappingConfidence(category: string): 'high' | 'medium' | 'low' | 'none' {
  const section = autoMapContaAzulCategory(category);
  
  if (!section) return 'none';
  
  const normalizedCategory = normalizeText(category);
  
  // Find which rule matched
  for (const rule of CONTA_AZUL_MAPPING_RULES) {
    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (normalizedCategory.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedCategory)) {
        if (rule.priority >= 90) return 'high';
        if (rule.priority >= 70) return 'medium';
        return 'low';
      }
    }
  }
  
  return 'low';
}
