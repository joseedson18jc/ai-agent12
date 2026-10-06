import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Building2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  DollarSign,
  BarChart3,
  ArrowLeft,
  CheckCircle2,
  Circle,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/finance';

// --- Types ---

interface CompanyMonthData {
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
}

interface CompanyData {
  id: string;
  name: string;
  sector: string;
  monthlyData: Record<string, CompanyMonthData>;
}

// --- Sample Data Generator for 2026 ---

const MONTHS_2026 = [
  { key: '2026-01', label: 'Janeiro', short: 'Jan' },
  { key: '2026-02', label: 'Fevereiro', short: 'Fev' },
  { key: '2026-03', label: 'Marco', short: 'Mar' },
  { key: '2026-04', label: 'Abril', short: 'Abr' },
  { key: '2026-05', label: 'Maio', short: 'Mai' },
  { key: '2026-06', label: 'Junho', short: 'Jun' },
  { key: '2026-07', label: 'Julho', short: 'Jul' },
  { key: '2026-08', label: 'Agosto', short: 'Ago' },
  { key: '2026-09', label: 'Setembro', short: 'Set' },
  { key: '2026-10', label: 'Outubro', short: 'Out' },
  { key: '2026-11', label: 'Novembro', short: 'Nov' },
  { key: '2026-12', label: 'Dezembro', short: 'Dez' },
];

function generateCompanyMonth(baseRevenue: number, month: number, variance: number): CompanyMonthData {
  const seasonality = 1 + Math.sin((month - 1) * Math.PI / 6) * 0.15;
  const rand = () => 1 + (Math.random() - 0.5) * variance;

  const revenueGross = Math.round(baseRevenue * seasonality * rand());
  const deductions = -Math.round(revenueGross * (0.08 + Math.random() * 0.04));
  const revenueNet = revenueGross + deductions;
  const cogs = -Math.round(revenueNet * (0.30 + Math.random() * 0.15));
  const grossProfit = revenueNet + cogs;
  const opex = -Math.round(revenueNet * (0.15 + Math.random() * 0.10));
  const ebitda = grossProfit + opex;
  const depreciation = -Math.round(revenueNet * 0.03);
  const ebit = ebitda + depreciation;
  const financial = -Math.round(revenueNet * (0.01 + Math.random() * 0.02));
  const ebt = ebit + financial;
  const incomeTax = ebt > 0 ? -Math.round(ebt * 0.34) : 0;
  const netIncome = ebt + incomeTax;

  return { revenueGross, deductions, revenueNet, cogs, grossProfit, opex, ebitda, depreciation, ebit, financial, ebt, incomeTax, netIncome };
}

function generateSampleCompanies(): CompanyData[] {
  const companies: { id: string; name: string; sector: string; baseRevenue: number; variance: number }[] = [
    { id: 'alpha-tech', name: 'Alpha Tech Solutions', sector: 'Tecnologia', baseRevenue: 850000, variance: 0.2 },
    { id: 'beta-log', name: 'Beta Logistica S.A.', sector: 'Logistica', baseRevenue: 1200000, variance: 0.15 },
    { id: 'gamma-saude', name: 'Gamma Saude Digital', sector: 'Saude', baseRevenue: 620000, variance: 0.25 },
    { id: 'delta-edu', name: 'Delta Educacao Online', sector: 'Educacao', baseRevenue: 480000, variance: 0.3 },
    { id: 'epsilon-fin', name: 'Epsilon Fintech', sector: 'Financeiro', baseRevenue: 950000, variance: 0.18 },
    { id: 'zeta-agro', name: 'Zeta Agronegocio', sector: 'Agronegocio', baseRevenue: 1500000, variance: 0.22 },
    { id: 'eta-retail', name: 'Eta Varejo Digital', sector: 'Varejo', baseRevenue: 720000, variance: 0.2 },
    { id: 'theta-energy', name: 'Theta Energia Limpa', sector: 'Energia', baseRevenue: 1100000, variance: 0.12 },
  ];

  return companies.map(c => {
    const monthlyData: Record<string, CompanyMonthData> = {};
    MONTHS_2026.forEach((m, idx) => {
      monthlyData[m.key] = generateCompanyMonth(c.baseRevenue, idx + 1, c.variance);
    });
    return { id: c.id, name: c.name, sector: c.sector, monthlyData };
  });
}

// --- Helper: sum company data across selected months ---

function sumCompanyMonths(company: CompanyData, months: string[]): CompanyMonthData {
  const zero: CompanyMonthData = {
    revenueGross: 0, deductions: 0, revenueNet: 0, cogs: 0, grossProfit: 0,
    opex: 0, ebitda: 0, depreciation: 0, ebit: 0, financial: 0, ebt: 0,
    incomeTax: 0, netIncome: 0,
  };
  return months.reduce((acc, mk) => {
    const d = company.monthlyData[mk];
    if (!d) return acc;
    return {
      revenueGross: acc.revenueGross + d.revenueGross,
      deductions: acc.deductions + d.deductions,
      revenueNet: acc.revenueNet + d.revenueNet,
      cogs: acc.cogs + d.cogs,
      grossProfit: acc.grossProfit + d.grossProfit,
      opex: acc.opex + d.opex,
      ebitda: acc.ebitda + d.ebitda,
      depreciation: acc.depreciation + d.depreciation,
      ebit: acc.ebit + d.ebit,
      financial: acc.financial + d.financial,
      ebt: acc.ebt + d.ebt,
      incomeTax: acc.incomeTax + d.incomeTax,
      netIncome: acc.netIncome + d.netIncome,
    };
  }, zero);
}

// --- Components ---

interface MonthButtonProps {
  month: typeof MONTHS_2026[0];
  isSelected: boolean;
  onClick: () => void;
}

const MonthButton = ({ month, isSelected, onClick }: MonthButtonProps) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`
      relative flex flex-col items-center justify-center w-full py-3 px-2 rounded-2xl
      border-2 transition-all duration-300 cursor-pointer select-none
      ${isSelected
        ? 'border-primary bg-gradient-to-br from-primary/15 to-primary/5 shadow-lg shadow-primary/20'
        : 'border-border/40 bg-card/40 hover:border-primary/40 hover:bg-card/60'
      }
    `}
  >
    <div className={`absolute top-2 right-2 transition-all duration-200 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
      <CheckCircle2 size={14} className="text-primary" />
    </div>
    {!isSelected && (
      <div className="absolute top-2 right-2 opacity-30">
        <Circle size={14} className="text-muted-foreground" />
      </div>
    )}
    <span className={`text-lg font-bold tracking-tight ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
      {month.short}
    </span>
    <span className={`text-[9px] font-semibold uppercase tracking-widest mt-0.5 ${isSelected ? 'text-primary/70' : 'text-muted-foreground/50'}`}>
      2026
    </span>
  </motion.button>
);

interface CompanyRowProps {
  company: CompanyData;
  ytdData: CompanyMonthData;
  isExpanded: boolean;
  onToggle: () => void;
  selectedMonths: string[];
}

const CompanyRow = ({ company, ytdData, isExpanded, onToggle, selectedMonths }: CompanyRowProps) => {
  const margin = ytdData.revenueNet !== 0
    ? ((ytdData.netIncome / ytdData.revenueNet) * 100).toFixed(1)
    : '0.0';
  const ebitdaMargin = ytdData.revenueNet !== 0
    ? ((ytdData.ebitda / ytdData.revenueNet) * 100).toFixed(1)
    : '0.0';
  const netMarginNum = parseFloat(margin);

  return (
    <div className="border border-border/30 rounded-2xl overflow-hidden bg-card/40 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
      {/* Company Header - clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 hover:bg-primary/5 transition-colors text-left"
      >
        <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={18} className="text-muted-foreground" />
        </motion.div>

        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <Building2 size={18} className="text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm truncate">{company.name}</p>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{company.sector}</p>
        </div>

        {/* Summary KPIs inline */}
        <div className="hidden md:flex items-center gap-6">
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Receita Liq.</p>
            <p className="text-sm font-bold font-mono text-foreground">{formatCurrency(ytdData.revenueNet)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">EBITDA</p>
            <p className="text-sm font-bold font-mono text-foreground">{formatCurrency(ytdData.ebitda)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">L. Liquido</p>
            <p className={`text-sm font-bold font-mono ${ytdData.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
              {formatCurrency(ytdData.netIncome)}
            </p>
          </div>
          <div className="text-right min-w-[60px]">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Margem</p>
            <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${
              netMarginNum >= 15 ? 'bg-green-500/15 text-green-600 dark:text-green-400'
              : netMarginNum >= 5 ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
              : 'bg-destructive/15 text-destructive'
            }`}>
              {margin}%
            </span>
          </div>
        </div>
      </button>

      {/* Expandable Detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/20 p-5 space-y-5">
              {/* DRE Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Receita Bruta', value: ytdData.revenueGross, color: '' },
                  { label: 'Deducoes', value: ytdData.deductions, color: 'text-orange-500' },
                  { label: 'Receita Liq.', value: ytdData.revenueNet, color: '' },
                  { label: 'CPV', value: ytdData.cogs, color: 'text-destructive/70' },
                  { label: 'Lucro Bruto', value: ytdData.grossProfit, color: '' },
                  { label: 'EBITDA', value: ytdData.ebitda, color: ytdData.ebitda >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive' },
                  { label: 'L. Liquido', value: ytdData.netIncome, color: ytdData.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-muted/30 rounded-xl p-3 text-center">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                    <p className={`text-xs font-bold font-mono ${item.color || 'text-foreground'}`}>
                      {formatCurrency(item.value)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Monthly Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border/30 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      <th className="px-3 py-3 text-left">Mes</th>
                      <th className="px-3 py-3 text-right">Receita Bruta</th>
                      <th className="px-3 py-3 text-right">Receita Liq.</th>
                      <th className="px-3 py-3 text-right">EBITDA</th>
                      <th className="px-3 py-3 text-right">Margem EBITDA</th>
                      <th className="px-3 py-3 text-right">L. Liquido</th>
                      <th className="px-3 py-3 text-right">Margem Liq.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {selectedMonths.map(mk => {
                      const d = company.monthlyData[mk];
                      if (!d) return null;
                      const mInfo = MONTHS_2026.find(m => m.key === mk);
                      const mEbitdaMargin = d.revenueNet !== 0 ? ((d.ebitda / d.revenueNet) * 100).toFixed(1) : '0.0';
                      const mNetMargin = d.revenueNet !== 0 ? ((d.netIncome / d.revenueNet) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={mk} className="hover:bg-primary/5 transition-colors">
                          <td className="px-3 py-2.5 text-xs font-bold text-foreground">{mInfo?.label}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">
                            {d.revenueGross.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-foreground">
                            {d.revenueNet.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-foreground">
                            {d.ebitda.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-bold text-muted-foreground">{mEbitdaMargin}%</td>
                          <td className={`px-3 py-2.5 text-right font-mono text-xs font-bold ${d.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                            {d.netIncome.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-bold text-muted-foreground">{mNetMargin}%</td>
                        </tr>
                      );
                    })}
                    {/* YTD Total Row */}
                    <tr className="bg-primary/5 font-bold border-t-2 border-primary/20">
                      <td className="px-3 py-3 text-xs text-primary">TOTAL YTD</td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-primary">
                        {ytdData.revenueGross.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-primary">
                        {ytdData.revenueNet.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-primary">
                        {ytdData.ebitda.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-primary">{ebitdaMargin}%</td>
                      <td className={`px-3 py-3 text-right font-mono text-xs ${ytdData.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                        {ytdData.netIncome.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-primary">{margin}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main Page ---

const YtdDashboard = () => {
  const navigate = useNavigate();
  const [companies] = useState<CompanyData[]>(() => generateSampleCompanies());
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    // Default: select Jan through current month (April 2026)
    return MONTHS_2026.slice(0, 4).map(m => m.key);
  });
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const toggleMonth = useCallback((key: string) => {
    setSelectedMonths(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      }
      return [...prev, key].sort();
    });
  }, []);

  const selectAllMonths = useCallback(() => {
    setSelectedMonths(MONTHS_2026.map(m => m.key));
  }, []);

  const selectYtdUpTo = useCallback((monthKey: string) => {
    const idx = MONTHS_2026.findIndex(m => m.key === monthKey);
    if (idx >= 0) {
      setSelectedMonths(MONTHS_2026.slice(0, idx + 1).map(m => m.key));
    }
  }, []);

  const clearMonths = useCallback(() => {
    setSelectedMonths([]);
  }, []);

  const toggleCompany = useCallback((id: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedCompanies(new Set(companies.map(c => c.id)));
  }, [companies]);

  const collapseAll = useCallback(() => {
    setExpandedCompanies(new Set());
  }, []);

  // Aggregated totals
  const consolidatedYtd = useMemo(() => {
    const zero: CompanyMonthData = {
      revenueGross: 0, deductions: 0, revenueNet: 0, cogs: 0, grossProfit: 0,
      opex: 0, ebitda: 0, depreciation: 0, ebit: 0, financial: 0, ebt: 0,
      incomeTax: 0, netIncome: 0,
    };
    return companies.reduce((acc, company) => {
      const compYtd = sumCompanyMonths(company, selectedMonths);
      return {
        revenueGross: acc.revenueGross + compYtd.revenueGross,
        deductions: acc.deductions + compYtd.deductions,
        revenueNet: acc.revenueNet + compYtd.revenueNet,
        cogs: acc.cogs + compYtd.cogs,
        grossProfit: acc.grossProfit + compYtd.grossProfit,
        opex: acc.opex + compYtd.opex,
        ebitda: acc.ebitda + compYtd.ebitda,
        depreciation: acc.depreciation + compYtd.depreciation,
        ebit: acc.ebit + compYtd.ebit,
        financial: acc.financial + compYtd.financial,
        ebt: acc.ebt + compYtd.ebt,
        incomeTax: acc.incomeTax + compYtd.incomeTax,
        netIncome: acc.netIncome + compYtd.netIncome,
      };
    }, zero);
  }, [companies, selectedMonths]);

  const companyYtdData = useMemo(() => {
    const map: Record<string, CompanyMonthData> = {};
    companies.forEach(c => {
      map[c.id] = sumCompanyMonths(c, selectedMonths);
    });
    return map;
  }, [companies, selectedMonths]);

  // Sorted companies by revenue desc
  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => (companyYtdData[b.id]?.revenueNet ?? 0) - (companyYtdData[a.id]?.revenueNet ?? 0));
  }, [companies, companyYtdData]);

  const consolidatedMargin = consolidatedYtd.revenueNet !== 0
    ? ((consolidatedYtd.netIncome / consolidatedYtd.revenueNet) * 100).toFixed(1)
    : '0.0';
  const consolidatedEbitdaMargin = consolidatedYtd.revenueNet !== 0
    ? ((consolidatedYtd.ebitda / consolidatedYtd.revenueNet) * 100).toFixed(1)
    : '0.0';

  const periodLabel = selectedMonths.length === 0
    ? 'Nenhum periodo selecionado'
    : selectedMonths.length === 12
    ? 'Ano completo 2026'
    : `${selectedMonths.length} ${selectedMonths.length === 1 ? 'mes' : 'meses'} selecionado${selectedMonths.length > 1 ? 's' : ''}`;

  return (
    <div className="flex flex-col min-h-screen font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-background/70 border-b border-border/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-xl">
              <ArrowLeft size={18} />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
                <BarChart3 size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">Dashboard YTD</h1>
                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-[0.25em] mt-0.5">
                  Visao Consolidada 2026
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {periodLabel}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Month Selector */}
        <Card className="rounded-[2rem] border border-border/30 shadow-xl bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-6 pb-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CalendarDays size={20} className="text-primary" />
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">Selecione os Periodos YTD</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clique nos meses para incluir ou remover do calculo YTD
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAllMonths} className="rounded-xl text-[10px] font-bold uppercase tracking-wider h-8">
                  Selecionar Todos
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectYtdUpTo('2026-04')} className="rounded-xl text-[10px] font-bold uppercase tracking-wider h-8">
                  YTD Abril
                </Button>
                <Button variant="ghost" size="sm" onClick={clearMonths} className="rounded-xl text-[10px] font-bold uppercase tracking-wider h-8 text-muted-foreground">
                  <RotateCcw size={12} className="mr-1" /> Limpar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
              {MONTHS_2026.map(month => (
                <MonthButton
                  key={month.key}
                  month={month}
                  isSelected={selectedMonths.includes(month.key)}
                  onClick={() => toggleMonth(month.key)}
                />
              ))}
            </div>
            {/* Quick YTD shortcuts */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border/20">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mr-2">
                YTD Rapido:
              </span>
              {MONTHS_2026.map((m, idx) => (
                <button
                  key={m.key}
                  onClick={() => selectYtdUpTo(m.key)}
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-colors ${
                    selectedMonths.length === idx + 1 && selectedMonths[selectedMonths.length - 1] === m.key
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {m.short}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Consolidated KPI Cards */}
        {selectedMonths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {[
              { label: 'Receita Liquida YTD', value: consolidatedYtd.revenueNet, icon: Wallet, color: 'chart-1', subtitle: `${companies.length} empresas` },
              { label: 'EBITDA YTD', value: consolidatedYtd.ebitda, icon: Target, color: 'chart-3', subtitle: `Margem ${consolidatedEbitdaMargin}%` },
              { label: 'Lucro Liquido YTD', value: consolidatedYtd.netIncome, icon: DollarSign, color: 'primary', subtitle: `Margem ${consolidatedMargin}%` },
              { label: 'Lucro Bruto YTD', value: consolidatedYtd.grossProfit, icon: TrendingUp, color: 'chart-2', subtitle: `CPV: ${formatCurrency(consolidatedYtd.cogs)}` },
            ].map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <Card key={idx} className="rounded-[2rem] p-6 border border-border/30 shadow-xl hover:shadow-2xl transition-all duration-300 group bg-card/60 backdrop-blur-sm hover:border-primary/20">
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `hsl(var(--${kpi.color}) / 0.15)` }}
                      >
                        <Icon size={22} style={{ color: `hsl(var(--${kpi.color}))` }} />
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      {kpi.label}
                    </p>
                    <p className={`text-2xl font-bold font-mono tracking-tighter ${
                      kpi.value >= 0 ? 'text-foreground' : 'text-destructive'
                    }`}>
                      {formatCurrency(kpi.value)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{kpi.subtitle}</p>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        )}

        {/* Company Drill-Down */}
        {selectedMonths.length > 0 && (
          <Card className="rounded-[2rem] border border-border/30 shadow-xl bg-card/60 backdrop-blur-sm">
            <CardHeader className="p-6 pb-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Building2 size={20} className="text-primary" />
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground">Empresas no Portfolio</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Clique em cada empresa para ver o detalhamento mensal
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={expandAll} className="rounded-xl text-[10px] font-bold uppercase tracking-wider h-8">
                    <ChevronDown size={12} className="mr-1" /> Expandir Todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={collapseAll} className="rounded-xl text-[10px] font-bold uppercase tracking-wider h-8 text-muted-foreground">
                    Recolher
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {sortedCompanies.map(company => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  ytdData={companyYtdData[company.id]}
                  isExpanded={expandedCompanies.has(company.id)}
                  onToggle={() => toggleCompany(company.id)}
                  selectedMonths={selectedMonths}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {selectedMonths.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <CalendarDays size={48} className="text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-bold text-muted-foreground mb-2">Nenhum periodo selecionado</h3>
            <p className="text-sm text-muted-foreground/70 max-w-md">
              Selecione um ou mais meses acima para visualizar os resultados YTD consolidados do portfolio.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default YtdDashboard;
