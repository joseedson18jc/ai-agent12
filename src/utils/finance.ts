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

  // Auto-detect delimiter: try semicolon, tab, then comma
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes(';')) delimiter = ';';
  else if (firstLine.includes('\t')) delimiter = '\t';
  
  // Parse header handling quoted values
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const header = parseRow(firstLine).map(h => h.replace(/^["']|["']$/g, ''));

  // Flexible column matching with partial/fuzzy matching
  const findIdx = (candidates: string[]) => {
    const lowerHeader = header.map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    for (const c of candidates) {
      const normalizedCandidate = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Exact match first
      const exactIdx = lowerHeader.indexOf(normalizedCandidate);
      if (exactIdx !== -1) return exactIdx;
      // Partial match (column contains the candidate)
      const partialIdx = lowerHeader.findIndex(h => h.includes(normalizedCandidate) || normalizedCandidate.includes(h));
      if (partialIdx !== -1) return partialIdx;
    }
    return -1;
  };

  // Extended list of possible column names for each field - now includes Conta Azul specific columns
  const idxTipo = findIdx([
    'tipo da operacao', 'tipo da operação', 'tipo operacao', 'tipo operação',
    'tipo', 'type', 'movimento', 'natureza', 'operacao', 'operação', 
    'lancamento', 'lançamento', 'transacao', 'transação', 'debito/credito', 
    'débito/crédito', 'd/c', 'entrada/saida', 'entrada/saída'
  ]);
  
  // Priority: "Categoria 1" column from Conta Azul, then fallback to description columns
  const idxCategoria = findIdx([
    'categoria 1', 'categoria1', 'categoria',
    'descricao', 'descrição', 'historico', 'histórico',
    'conta', 'plano de contas', 'classificacao', 'classificação', 'nome',
    'item', 'rubrica', 'natureza financeira', 'category'
  ]);
  
  // Priority: "Centro de Custo 1" column from Conta Azul
  const idxCentro = findIdx([
    'centro de custo 1', 'centro de custo1', 'centro de custo',
    'cost center', 'centro', 'departamento', 'setor',
    'unidade', 'filial', 'projeto', 'area', 'área'
  ]);
  
  // Look for "Valor (R$)" first (Conta Azul format), then others
  const idxValor = findIdx([
    'valor (r$)', 'valor(r$)', 'valor r$',
    'valor', 'value', 'amount', 'total', 'montante', 'quantia', 
    'valor total', 'valor liquido', 'valor líquido', 'valor bruto',
    'preco', 'preço', 'custo', 'receita', 'despesa'
  ]);
  
  // Look for "Data movimento" first (Conta Azul format)
  const idxDataComp = findIdx([
    'data movimento', 'data movimentacao', 'data movimentação',
    'data competência', 'data competencia', 'competência', 'competencia', 
    'data', 'vencimento', 'date', 'data vencimento', 'data pagamento',
    'data emissao', 'data emissão', 'data lancamento', 'data lançamento',
    'periodo', 'período', 'mes', 'mês', 'data ref', 'data referencia'
  ]);

  // Build helpful error message showing what was found and what's missing
  const foundColumns: string[] = [];
  const missingColumns: string[] = [];
  
  if (idxTipo !== -1) foundColumns.push(`Tipo: "${header[idxTipo]}"`);
  else missingColumns.push('Tipo (tipo, natureza, movimento, d/c)');
  
  if (idxCategoria !== -1) foundColumns.push(`Categoria: "${header[idxCategoria]}"`);
  else missingColumns.push('Categoria (categoria, descrição, conta, histórico)');
  
  if (idxValor !== -1) foundColumns.push(`Valor: "${header[idxValor]}"`);
  else missingColumns.push('Valor (valor, total, montante, amount)');
  
  if (idxDataComp !== -1) foundColumns.push(`Data: "${header[idxDataComp]}"`);
  else missingColumns.push('Data (data, competência, vencimento, período)');

  if (missingColumns.length > 0) {
    const headerPreview = header.slice(0, 10).join(', ');
    throw new Error(
      `Estrutura de colunas não identificada.\n\n` +
      `📋 Colunas encontradas no arquivo: ${headerPreview}${header.length > 10 ? '...' : ''}\n\n` +
      `✅ Mapeadas: ${foundColumns.length > 0 ? foundColumns.join(', ') : 'nenhuma'}\n` +
      `❌ Faltando: ${missingColumns.join(', ')}\n\n` +
      `💡 Dica: Renomeie as colunas do seu arquivo para incluir: Tipo, Categoria, Valor e Data.`
    );
  }

  const result: TransactionEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    if (cols.length < 3) continue;
    
    const tipoRaw = (cols[idxTipo] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Flexible type detection - Conta Azul uses "Crédito" for income and "Débito" for expenses
    const isPayable = 
      tipoRaw.includes('pagar') || 
      tipoRaw.includes('payable') || 
      tipoRaw.includes('despesa') || 
      tipoRaw.includes('saida') || 
      tipoRaw.includes('debito') ||
      (tipoRaw.includes('d') && tipoRaw.length <= 2) ||
      tipoRaw === 'p' ||
      tipoRaw === 's';
    
    const type: 'payable' | 'receivable' = isPayable ? 'payable' : 'receivable';
    const category = cols[idxCategoria]?.trim() || '';
    const costCenter = idxCentro !== -1 ? cols[idxCentro]?.trim() || null : null;
    
    if (!category) continue;

    let amount = parseDecimal(cols[idxValor] || '');
    
    // If amount is already negative, it's an expense (Saída)
    // If positive, determine by type
    if (amount === 0) continue;

    // Parse date - handle DD/MM/YYYY format common in Brazilian systems
    let competenceDate = cols[idxDataComp]?.trim() || '';
    if (competenceDate.includes('/')) {
      const parts = competenceDate.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        competenceDate = `${year}-${month}-${day}`;
      }
    }
    if (!competenceDate || competenceDate.length < 8) {
      competenceDate = new Date().toISOString().split('T')[0];
    }

    // Determine final type based on amount sign - negative is always 'payable' (saída)
    const finalType: 'payable' | 'receivable' = amount < 0 ? 'payable' : type;

    result.push({
      id: i,
      type: finalType,
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
