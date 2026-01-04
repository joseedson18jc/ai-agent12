export type TransactionType = 'payable' | 'receivable';

export type BPSection = 
  | 'revenue'
  | 'deductions'
  | 'cogs'
  | 'administrative'
  | 'sales'
  | 'operational_other'
  | 'depreciation'
  | 'financial'
  | 'income_tax'
  | 'other';

export interface TransactionEntry {
  id: number;
  type: TransactionType;
  category: string;
  costCenter: string | null;
  amount: number;
  competenceDate: string;
  bpSection?: BPSection;
  description: string;
  status: 'paid' | 'pending';
}

export interface DreKpis {
  revenueGross: number;
  deductions: number;
  revenueNet: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  ebitda: number;
  depreciation: number;
  ebit: number;
  financial: number;
  ebt: number;
  incomeTax: number;
  netIncome: number;
  grossMargin: string;
  ebitdaMargin: string;
  netMargin: string;
}

export interface MonthlyDre {
  [month: string]: DreKpis;
}

export const BP_SECTIONS = [
  { value: 'revenue', label: 'Receita' },
  { value: 'deductions', label: 'Deduções' },
  { value: 'cogs', label: 'Custo de Vendas (CPV)' },
  { value: 'administrative', label: 'Despesa Administrativa' },
  { value: 'sales', label: 'Despesa de Vendas' },
  { value: 'operational_other', label: 'Operacional Outro' },
  { value: 'depreciation', label: 'Depreciação' },
  { value: 'financial', label: 'Resultado Financeiro' },
  { value: 'income_tax', label: 'IR/CSLL' },
  { value: 'other', label: 'Outros' },
] as const;
