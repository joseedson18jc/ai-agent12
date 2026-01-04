import { useMemo } from 'react';
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
  Lightbulb,
  Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionEntry, MonthlyDre } from '@/types/finance';
import { computeDreByMonth, formatCurrency } from '@/utils/finance';
import { SimpleChart } from './SimpleChart';

interface AnalyticsTabProps {
  entries: TransactionEntry[];
  selectedCostCenter: string;
  uniqueCostCenters: string[];
  onCostCenterChange: (value: string) => void;
  aiInsight: string | null;
  isAiLoading: boolean;
  onGenerateInsight: () => void;
}

export const AnalyticsTab = ({
  entries,
  selectedCostCenter,
  uniqueCostCenters,
  onCostCenterChange,
  aiInsight,
  isAiLoading,
  onGenerateInsight
}: AnalyticsTabProps) => {
  const analyticsEntries = useMemo(() => {
    if (selectedCostCenter === 'all') return entries;
    return entries.filter(e => e.costCenter === selectedCostCenter);
  }, [entries, selectedCostCenter]);

  const dreByMonth = useMemo(() => computeDreByMonth(analyticsEntries), [analyticsEntries]);
  const sortedMonths = useMemo(() => Object.keys(dreByMonth).sort(), [dreByMonth]);
  
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
      className="space-y-12 pb-24"
    >
      {/* FILTER BAR & HEADER */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-primary/20">
            <LayoutDashboard size={12} /> Strategic Analytics
          </div>
          <h2 className="text-4xl font-bold text-foreground tracking-tight leading-none uppercase">
            Performance Gerencial.
          </h2>
          <p className="text-muted-foreground mt-3 font-medium text-lg">
            Diagnóstico consolidado de rentabilidade e ROI.
          </p>
        </div>

        <div className="glass-card flex items-center gap-4 p-3 rounded-[2rem] border border-border/50 shadow-2xl">
          <div className="flex items-center gap-3 pl-4 pr-2 border-r border-border">
            <Filter size={16} className="text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
              Filtrar por Centro:
            </span>
          </div>
          <div className="relative group">
            <select 
              value={selectedCostCenter}
              onChange={(e) => onCostCenterChange(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold text-foreground outline-none pr-10 cursor-pointer uppercase tracking-[0.15em] hover:text-primary transition-colors"
            >
              <option value="all">TODOS OS CENTROS (CONSOLIDADO)</option>
              {uniqueCostCenters.map(cc => (
                <option key={cc} value={cc}>{cc.toUpperCase()}</option>
              ))}
            </select>
            <ChevronRight size={14} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* KPI TOP STRIP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          const isPositive = kpi.variation !== null && kpi.variation >= 0;
          
          return (
            <Card key={index} className="glass-card rounded-[2.5rem] p-8 border border-border/50 shadow-xl hover:shadow-2xl transition-all group">
              <CardContent className="p-0">
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg`} style={{ backgroundColor: `hsl(var(--${kpi.color}) / 0.15)` }}>
                    <Icon size={26} style={{ color: `hsl(var(--${kpi.color}))` }} />
                  </div>
                  {kpi.variation !== null && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest ${isPositive ? 'bg-chart-3/20 text-chart-3' : 'bg-destructive/20 text-destructive'}`}>
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
      <Card className="glass-card rounded-[3rem] border border-border/50 shadow-2xl overflow-hidden">
        <CardHeader className="p-10 pb-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground tracking-tight uppercase">
                Evolução Mensal
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-2">
                Comparativo de métricas financeiras ao longo do tempo
              </p>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Receita</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">EBITDA</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lucro</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-10 h-[400px]">
          <SimpleChart data={chartData} />
        </CardContent>
      </Card>

      {/* AI INSIGHTS SECTION */}
      <Card className="bg-gradient-to-br from-foreground to-secondary rounded-[3rem] text-background border-0 shadow-2xl overflow-hidden">
        <CardContent className="p-10 md:p-14">
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="lg:w-1/3 space-y-6">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl">
                <BrainCircuit size={32} className="text-primary-foreground" />
              </div>
              <h3 className="text-3xl font-bold tracking-tight uppercase">
                Análise Estratégica AI
              </h3>
              <p className="text-muted font-medium leading-relaxed">
                Utilize inteligência artificial para gerar diagnósticos executivos e planos de ação personalizados.
              </p>
              <Button
                onClick={onGenerateInsight}
                disabled={isAiLoading}
                className="px-8 py-4 h-auto bg-primary text-primary-foreground rounded-2xl font-bold text-[11px] tracking-[0.2em] hover:bg-primary/90 transition-all shadow-xl flex items-center gap-3"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    ANALISANDO...
                  </>
                ) : (
                  <>
                    <Lightbulb size={16} />
                    GERAR INSIGHTS
                  </>
                )}
              </Button>
            </div>
            
            <div className="lg:w-2/3 bg-background/10 rounded-[2rem] p-8 min-h-[300px] backdrop-blur-sm border border-background/20">
              {aiInsight ? (
                <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: aiInsight.replace(/\n/g, '<br/>') }} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted space-y-4">
                  <Layers size={48} className="opacity-30" />
                  <p className="text-sm font-medium text-center">
                    Clique em "Gerar Insights" para receber uma análise estratégica personalizada
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
                    <td className="px-6 py-6 text-right font-mono text-xs font-bold" style={{ color: 'hsl(var(--chart-3))' }}>
                      {dre.ebitda.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`px-6 py-6 text-right font-mono text-xs font-bold ${dre.netIncome >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {dre.netIncome.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-6 text-right">
                      <span className={`text-[9px] font-bold px-3.5 py-1.5 rounded-xl uppercase tracking-widest ${
                        netMargin >= 15 
                          ? 'bg-chart-3 text-primary-foreground shadow-lg' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {dre.netMargin}%
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
