import { useMemo, useState } from 'react';
import { 
  LayoutDashboard, 
  Filter, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  Target,
  Wallet,
  TrendingUp,
  BrainCircuit,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionEntry, DreKpis } from '@/types/finance';
import { computeDreByMonth, formatCurrency } from '@/utils/finance';
import { SimpleChart } from './SimpleChart';
import { PdfExport } from './PdfExport';
import { AIComparisonMode } from './AIComparisonMode';

interface AnalyticsTabProps {
  entries: TransactionEntry[];
  selectedCostCenter: string;
  uniqueCostCenters: string[];
  onCostCenterChange: (value: string) => void;
  aiInsight: string | null;
  isAiLoading: boolean;
  onGenerateInsight: () => void;
  dreByMonth?: Record<string, DreKpis>;
  sortedMonths?: string[];
}

export const AnalyticsTab = ({
  entries,
  selectedCostCenter,
  uniqueCostCenters,
  onCostCenterChange,
  aiInsight,
  isAiLoading,
  onGenerateInsight,
  dreByMonth: propDreByMonth,
  sortedMonths: propSortedMonths,
}: AnalyticsTabProps) => {
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  
  const analyticsEntries = useMemo(() => {
    if (selectedCostCenter === 'all') return entries;
    return entries.filter(e => e.costCenter === selectedCostCenter);
  }, [entries, selectedCostCenter]);

  const computedDreByMonth = useMemo(() => computeDreByMonth(analyticsEntries), [analyticsEntries]);
  const computedSortedMonths = useMemo(() => Object.keys(computedDreByMonth).sort(), [computedDreByMonth]);
  
  const dreByMonth = propDreByMonth ?? computedDreByMonth;
  const sortedMonths = propSortedMonths ?? computedSortedMonths;

  const chartData = useMemo(() => 
    sortedMonths.map(month => ({
      month: month.split('-').reverse().join('/'),
      'Receita Líquida': Math.round(dreByMonth[month].revenueNet),
      'EBITDA': Math.round(dreByMonth[month].ebitda),
      'Lucro Líquido': Math.round(dreByMonth[month].netIncome),
    }))
  , [sortedMonths, dreByMonth]);

  if (sortedMonths.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Nenhum dado disponível</p>
      </div>
    );
  }

  const lastMonth = sortedMonths[sortedMonths.length - 1];
  const currentDre = dreByMonth[lastMonth];
  const prevMonthKey = sortedMonths.length > 1 ? sortedMonths[sortedMonths.length - 2] : null;
  const prevDre = prevMonthKey ? dreByMonth[prevMonthKey] : null;

  const calcVariation = (current: number, prev: number | null) => {
    if (prev === null || prev === 0) return null;
    return ((current - prev) / Math.abs(prev)) * 100;
  };

  const kpis = [
    {
      label: 'Receita Líquida',
      value: currentDre.revenueNet,
      variation: prevDre ? calcVariation(currentDre.revenueNet, prevDre.revenueNet) : null,
      icon: Wallet,
      color: 'chart-1'
    },
    {
      label: 'EBITDA',
      value: currentDre.ebitda,
      variation: prevDre ? calcVariation(currentDre.ebitda, prevDre.ebitda) : null,
      icon: Target,
      color: 'chart-3'
    },
    {
      label: 'Lucro Líquido',
      value: currentDre.netIncome,
      variation: prevDre ? calcVariation(currentDre.netIncome, prevDre.netIncome) : null,
      icon: TrendingUp,
      color: 'primary'
    }
  ];

  return (
    <motion.div 
      key="analytics"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-10 pb-24"
    >
      {/* FILTER BAR & HEADER */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-primary/10 to-secondary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-primary/20">
            <LayoutDashboard size={12} /> Strategic Analytics
          </div>
          <h2 className="text-4xl font-bold text-foreground tracking-tight leading-none">
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Performance</span>{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Gerencial.</span>
          </h2>
          <p className="text-muted-foreground mt-3 font-medium text-lg">
            Diagnóstico consolidado de rentabilidade e ROI.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <PdfExport 
            dreByMonth={dreByMonth}
            sortedMonths={sortedMonths}
            aiInsight={aiInsight}
            selectedCostCenter={selectedCostCenter}
          />
          <div className="flex items-center gap-4 p-3 rounded-2xl border border-border/30 shadow-lg bg-card/60 backdrop-blur-sm">
            <div className="flex items-center gap-3 pl-4 pr-2 border-r border-border/50">
              <Filter size={16} className="text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                Centro:
              </span>
            </div>
            <div className="relative group">
              <select 
                value={selectedCostCenter}
                onChange={(e) => onCostCenterChange(e.target.value)}
                className="bg-transparent border-none text-[11px] font-bold text-foreground outline-none pr-10 cursor-pointer uppercase tracking-[0.1em] hover:text-primary transition-colors"
              >
                <option value="all">TODOS (CONSOLIDADO)</option>
                {uniqueCostCenters.map(cc => (
                  <option key={cc} value={cc}>{cc.toUpperCase()}</option>
                ))}
              </select>
              <ChevronRight size={14} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI TOP STRIP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          const isPositive = kpi.variation !== null && kpi.variation >= 0;
          
          return (
            <Card key={index} className="rounded-[2rem] p-7 border border-border/30 shadow-xl hover:shadow-2xl transition-all duration-300 group bg-card/60 backdrop-blur-sm hover:border-primary/20">
              <CardContent className="p-0">
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`} style={{ backgroundColor: `hsl(var(--${kpi.color}) / 0.15)` }}>
                    <Icon size={26} style={{ color: `hsl(var(--${kpi.color}))` }} />
                  </div>
                  {kpi.variation !== null && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest ${isPositive ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-destructive/15 text-destructive'}`}>
                      {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {Math.abs(kpi.variation).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  {kpi.label}
                </p>
                <p className="text-3xl font-bold text-foreground font-mono tracking-tighter">
                  {formatCurrency(kpi.value)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CHART SECTION */}
      <Card className="rounded-[2.5rem] border border-border/30 shadow-2xl overflow-hidden bg-card/60 backdrop-blur-sm">
        <CardHeader className="p-8 pb-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <CardTitle className="text-xl font-bold text-foreground tracking-tight">
                Evolução Mensal
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-1.5">
                Comparativo de métricas financeiras ao longo do tempo
              </p>
            </div>
            <div className="flex items-center gap-6 px-5 py-3 bg-muted/30 rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Receita</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">EBITDA</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lucro</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 h-[380px]">
          <SimpleChart data={chartData} />
        </CardContent>
      </Card>

      {/* AI INSIGHTS SECTION - GROK 4 ONLY */}
      <AIComparisonMode
        dreByMonth={dreByMonth}
        sortedMonths={sortedMonths}
        selectedCostCenter={selectedCostCenter}
      />

      {/* DRE TABLE */}
      <Card className="glass-card rounded-[3rem] border border-border/50 shadow-2xl overflow-hidden">
        <CardHeader className="p-10 pb-0">
          <CardTitle className="text-2xl font-bold text-foreground tracking-tight uppercase">
            DRE Mensal Detalhado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-10 overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b-2 border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <th className="px-6 py-6 text-left">Mês Fiscal</th>
                <th className="px-6 py-6 text-right">Faturamento Bruto</th>
                <th className="px-6 py-6 text-right">Receita Líquida</th>
                <th className="px-6 py-6 text-right">CPV (Custo)</th>
                <th className="px-6 py-6 text-right">Lucro Bruto</th>
                <th className="px-6 py-6 text-right">OpEx</th>
                <th className="px-6 py-6 text-right font-bold text-foreground">EBITDA</th>
                <th className="px-6 py-6 text-right">L. Líquido</th>
                <th className="px-6 py-6 text-right">Status ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedMonths.map(month => {
                const dre = dreByMonth[month];
                const netMargin = parseFloat(dre.netMargin);
                return (
                  <tr key={month} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-6 font-bold text-foreground text-sm group-hover:text-primary transition-colors uppercase tracking-tight">
                      {month}
                    </td>
                    <td className="px-6 py-6 text-right font-mono text-xs font-bold text-muted-foreground">
                      {dre.revenueGross.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-6 text-right font-mono text-xs font-bold text-foreground">
                      {dre.revenueNet.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-6 text-right font-mono text-xs font-bold text-destructive/60">
                      {dre.cogs.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-6 text-right font-mono text-xs font-bold text-foreground">
                      {dre.grossProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-6 text-right font-mono text-xs font-bold text-destructive/60">
                      {dre.opex.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-6 text-right font-mono text-sm font-bold text-foreground">
                      {dre.ebitda.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`px-6 py-6 text-right font-mono text-xs font-bold ${dre.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                      {dre.netIncome.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-6 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                        netMargin >= 20 
                          ? 'bg-green-500/15 text-green-600 dark:text-green-400' 
                          : netMargin >= 10 
                          ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' 
                          : 'bg-destructive/15 text-destructive'
                      }`}>
                        {netMargin >= 20 ? '🟢' : netMargin >= 10 ? '🟡' : '🔴'} {dre.netMargin}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </motion.div>
  );
};
