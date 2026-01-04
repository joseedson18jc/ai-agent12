import { TransactionEntry, DreKpis, MonthlyDre, BPSection } from '@/types/finance';

export function parseDecimal(rawAmount: string): number {
  let cleaned = rawAmount.replace(/[^0-9,.\-]/g, '');
  if (!cleaned || cleaned === '-') return 0;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    cleaned = cleaned.replace(',', '.');
  }

  return parseFloat(cleaned) || 0;
}

export function parseContaAzulCsv(content: string): TransactionEntry[] {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
  const header = lines[0].split(delimiter).map(h => h.trim());

  const findIdx = (candidates: string[]) => {
    const lower = header.map(h => h.toLowerCase());
    for (const c of candidates) {
      const idx = lower.indexOf(c.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxTipo = findIdx(['tipo', 'type']);
  const idxCategoria = findIdx(['categoria', 'category']);
  const idxCentro = findIdx(['centro de custo', 'cost center', 'centro']);
  const idxValor = findIdx(['valor', 'value', 'amount']);
  const idxDataComp = findIdx(['data competência', 'competência', 'competencia', 'data', 'vencimento']);

  if (idxTipo === -1 || idxCategoria === -1 || idxValor === -1 || idxDataComp === -1) {
    throw new Error(`Estrutura de colunas não identificada. Colunas obrigatórias: Tipo, Categoria, Valor e Data.`);
  }

  const result: TransactionEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter);
    if (cols.length < 4) continue;
    
    const tipoRaw = cols[idxTipo]?.trim().toLowerCase() || '';
    const type: 'payable' | 'receivable' = tipoRaw.includes('pagar') || tipoRaw.includes('payable') ? 'payable' : 'receivable';
    const category = cols[idxCategoria]?.trim() || '';
    const costCenter = idxCentro !== -1 ? cols[idxCentro]?.trim() || null : null;
    
    if (!category) continue;

    let amount = parseDecimal(cols[idxValor] || '');
    if (type === 'payable' && amount > 0) amount = -amount;
    
    if (amount === 0) continue;

    const competenceDate = cols[idxDataComp]?.trim() || new Date().toISOString().split('T')[0];

    result.push({
      id: i,
      type,
      category,
      costCenter,
      amount,
      competenceDate,
      description: '',
      status: 'paid'
    });
  }
  return result;
}

export function computeDreKpis(entries: TransactionEntry[]): DreKpis {
  const sumBy = (section: BPSection | BPSection[]) => {
    const sections = Array.isArray(section) ? section : [section];
    return entries
      .filter(e => e.bpSection && sections.includes(e.bpSection))
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const revenueGross = sumBy('revenue');
  const deductions = sumBy('deductions');
  const cogs = sumBy('cogs');
  const opex = sumBy(['administrative', 'sales', 'operational_other', 'other']);
  const depreciation = sumBy('depreciation');
  const financial = sumBy('financial');
  const incomeTax = sumBy('income_tax');

  const revenueNet = revenueGross + deductions;
  const grossProfit = revenueNet + cogs;
  const ebitda = grossProfit + opex;
  const ebit = ebitda + depreciation;
  const ebt = ebit + financial;
  const netIncome = ebt + incomeTax;

  const margin = (val: number) => 
    revenueNet !== 0 ? ((val / revenueNet) * 100).toFixed(1) : "0.0";

  return {
    revenueGross, deductions, revenueNet, cogs, grossProfit,
    opex, ebitda, depreciation, ebit, financial, ebt,
    incomeTax, netIncome,
    grossMargin: margin(grossProfit),
    ebitdaMargin: margin(ebitda),
    netMargin: margin(netIncome),
  };
}

export function computeDreByMonth(entries: TransactionEntry[]): MonthlyDre {
  const buckets: Record<string, TransactionEntry[]> = {};
  
  entries.forEach(e => {
    if (!e.bpSection) return;
    const date = new Date(e.competenceDate);
    if (isNaN(date.getTime())) return;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets[monthKey]) buckets[monthKey] = [];
    buckets[monthKey].push(e);
  });
  
  const result: MonthlyDre = {};
  Object.entries(buckets).forEach(([month, ents]) => {
    result[month] = computeDreKpis(ents);
  });
  return result;
}

export function getCategoryKey(category: string, costCenter: string | null) {
  return `${category}|${costCenter || ''}`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    maximumFractionDigits: 0 
  });
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function generateDemoData(): { entries: TransactionEntry[], mappings: Record<string, BPSection> } {
  const demoData = [
    { type: 'receivable', category: 'Vendas Produto A', costCenter: 'Matriz', amount: 50000, competenceDate: '2025-01-15' },
    { type: 'payable', category: 'ICMS Recolher', costCenter: '', amount: -8000, competenceDate: '2025-01-20' },
    { type: 'payable', category: 'Matéria Prima', costCenter: 'Produção', amount: -20000, competenceDate: '2025-01-10' },
    { type: 'payable', category: 'Aluguel Comercial', costCenter: 'Matriz', amount: -5000, competenceDate: '2025-01-05' },
    { type: 'payable', category: 'Salários', costCenter: 'RH', amount: -15000, competenceDate: '2025-01-30' },
    { type: 'payable', category: 'Depreciação Máquinas', costCenter: 'Produção', amount: -2000, competenceDate: '2025-01-01' },
    { type: 'payable', category: 'Juros Empréstimo', costCenter: '', amount: -1500, competenceDate: '2025-01-15' },
    { type: 'payable', category: 'IR Estimado', costCenter: '', amount: -5000, competenceDate: '2025-01-25' },
    { type: 'receivable', category: 'Vendas Produto A', costCenter: 'Matriz', amount: 68000, competenceDate: '2025-02-15' },
    { type: 'payable', category: 'Matéria Prima', costCenter: 'Produção', amount: -24000, competenceDate: '2025-02-10' },
    { type: 'payable', category: 'Salários', costCenter: 'RH', amount: -16000, competenceDate: '2025-02-28' },
    { type: 'payable', category: 'IR Estimado', costCenter: '', amount: -7000, competenceDate: '2025-02-25' },
    { type: 'receivable', category: 'Consultoria', costCenter: 'Digital', amount: 15000, competenceDate: '2025-02-10' },
  ];

  const mappings: Record<string, BPSection> = {};
  
  const entriesWithMappings = demoData.map((d, i) => {
    let bpSection: BPSection = 'other';
    if (d.category.includes('Venda') || d.category.includes('Consultoria')) bpSection = 'revenue';
    else if (d.category.includes('ICMS')) bpSection = 'deductions';
    else if (d.category.includes('Matéria')) bpSection = 'cogs';
    else if (d.category.includes('Aluguel') || d.category.includes('Salários')) bpSection = 'administrative';
    else if (d.category.includes('Depreciação')) bpSection = 'depreciation';
    else if (d.category.includes('Juros')) bpSection = 'financial';
    else if (d.category.includes('IR')) bpSection = 'income_tax';
    
    const key = getCategoryKey(d.category, d.costCenter || null);
    mappings[key] = bpSection;
    
    return { 
      ...d, 
      id: i, 
      bpSection, 
      status: 'paid' as const,
      description: '',
      costCenter: d.costCenter || null
    } as TransactionEntry;
  });

  return { entries: entriesWithMappings, mappings };
}
