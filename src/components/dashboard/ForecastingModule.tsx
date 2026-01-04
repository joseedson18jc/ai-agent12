import { useMemo } from 'react';
import { TrendingUp, Calculator, Calendar, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DreKpis } from '@/types/finance';
import { formatCurrency } from '@/utils/finance';
import { SimpleChart } from './SimpleChart';

interface ForecastingModuleProps {
  dreByMonth: Record<string, DreKpis>;
  sortedMonths: string[];
}

export const ForecastingModule = ({ dreByMonth, sortedMonths }: ForecastingModuleProps) => {
  const forecast = useMemo(() => {
    if (sortedMonths.length < 2) return null;

    // Calculate growth rates for revenue and EBITDA
    const revenues = sortedMonths.map(m => dreByMonth[m].revenueNet);
    const ebitdas = sortedMonths.map(m => dreByMonth[m].ebitda);

    // Calculate average monthly growth rate
    const calcGrowthRate = (values: number[]) => {
      if (values.length < 2) return 0;
      const rates: number[] = [];
      for (let i = 1; i < values.length; i++) {
        if (values[i - 1] !== 0) {
          rates.push((values[i] - values[i - 1]) / Math.abs(values[i - 1]));
        }
      }
      return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    };

    const revenueGrowthRate = calcGrowthRate(revenues);
    const ebitdaGrowthRate = calcGrowthRate(ebitdas);

    // Get last values
    const lastRevenue = revenues[revenues.length - 1];
    const lastEbitda = ebitdas[ebitdas.length - 1];
    const lastMonth = sortedMonths[sortedMonths.length - 1];

    // Parse last month to generate future months
    const [year, month] = lastMonth.split('-').map(Number);
    
    // Generate 6-month forecast
    const forecastMonths: string[] = [];
    const forecastRevenue: number[] = [];
    const forecastEbitda: number[] = [];

    let currentRevenue = lastRevenue;
    let currentEbitda = lastEbitda;

    for (let i = 1; i <= 6; i++) {
      const futureMonth = month + i;
      const futureYear = year + Math.floor((futureMonth - 1) / 12);
      const adjustedMonth = ((futureMonth - 1) % 12) + 1;
      forecastMonths.push(`${futureYear}-${String(adjustedMonth).padStart(2, '0')}`);
      
      currentRevenue = currentRevenue * (1 + revenueGrowthRate);
      currentEbitda = currentEbitda * (1 + ebitdaGrowthRate);
      
      forecastRevenue.push(Math.round(currentRevenue));
      forecastEbitda.push(Math.round(currentEbitda));
    }

    return {
      revenueGrowthRate: (revenueGrowthRate * 100).toFixed(1),
      ebitdaGrowthRate: (ebitdaGrowthRate * 100).toFixed(1),
      forecastMonths,
      forecastRevenue,
      forecastEbitda,
      totalForecastRevenue: forecastRevenue.reduce((a, b) => a + b, 0),
      totalForecastEbitda: forecastEbitda.reduce((a, b) => a + b, 0),
    };
  }, [dreByMonth, sortedMonths]);

  if (!forecast) {
    return (
      <Card className="glass-card rounded-[2.5rem] p-8 border border-border/50">
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Dados insuficientes para projeção (mínimo 2 meses)</p>
        </CardContent>
      </Card>
    );
  }

  // Build chart data combining historical and forecast
  const chartData = [
    ...sortedMonths.slice(-3).map(month => ({
      month: month.split('-').reverse().join('/'),
      'Receita Histórica': Math.round(dreByMonth[month].revenueNet),
      'EBITDA Histórico': Math.round(dreByMonth[month].ebitda),
      'Receita Projetada': null as number | null,
      'EBITDA Projetado': null as number | null,
    })),
    ...forecast.forecastMonths.map((month, i) => ({
      month: month.split('-').reverse().join('/'),
      'Receita Histórica': null as number | null,
      'EBITDA Histórico': null as number | null,
      'Receita Projetada': forecast.forecastRevenue[i],
      'EBITDA Projetado': forecast.forecastEbitda[i],
    })),
  ];

  const forecastMetrics = [
    { key: 'Receita Histórica', color: 'hsl(var(--chart-1))' },
    { key: 'EBITDA Histórico', color: 'hsl(var(--chart-3))' },
    { key: 'Receita Projetada', color: 'hsl(var(--chart-1))', dashed: true },
    { key: 'EBITDA Projetado', color: 'hsl(var(--chart-3))', dashed: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Forecast Header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-chart-3/10 text-chart-3 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-chart-3/20">
            <Calculator size={12} /> Financial Forecasting
          </div>
          <h2 className="text-4xl font-bold text-foreground tracking-tight leading-none uppercase">
            Projeção 6 Meses.
          </h2>
          <p className="text-muted-foreground mt-3 font-medium text-lg">
            Tendências baseadas em análise de regressão histórica.
          </p>
        </div>
      </div>

      {/* Forecast KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card rounded-[2rem] p-6 border border-border/50">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-chart-1/15 flex items-center justify-center">
                <TrendingUp size={22} className="text-chart-1" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Taxa Cresc. Receita
            </p>
            <p className={`text-2xl font-bold font-mono ${parseFloat(forecast.revenueGrowthRate) >= 0 ? 'text-chart-3' : 'text-destructive'}`}>
              {parseFloat(forecast.revenueGrowthRate) >= 0 ? '+' : ''}{forecast.revenueGrowthRate}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Média mensal</p>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-[2rem] p-6 border border-border/50">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-chart-3/15 flex items-center justify-center">
                <Target size={22} className="text-chart-3" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Taxa Cresc. EBITDA
            </p>
            <p className={`text-2xl font-bold font-mono ${parseFloat(forecast.ebitdaGrowthRate) >= 0 ? 'text-chart-3' : 'text-destructive'}`}>
              {parseFloat(forecast.ebitdaGrowthRate) >= 0 ? '+' : ''}{forecast.ebitdaGrowthRate}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Média mensal</p>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-[2rem] p-6 border border-border/50">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                <Calendar size={22} className="text-primary" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Receita Projetada (6M)
            </p>
            <p className="text-2xl font-bold font-mono text-foreground">
              {formatCurrency(forecast.totalForecastRevenue)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Acumulado</p>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-[2rem] p-6 border border-border/50">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-chart-3/15 flex items-center justify-center">
                <Calculator size={22} className="text-chart-3" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              EBITDA Projetado (6M)
            </p>
            <p className="text-2xl font-bold font-mono text-chart-3">
              {formatCurrency(forecast.totalForecastEbitda)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Acumulado</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card className="glass-card rounded-[3rem] border border-border/50 shadow-2xl overflow-hidden">
        <CardHeader className="p-10 pb-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground tracking-tight uppercase">
                Histórico vs Projeção
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-2">
                Comparativo de dados reais com projeções futuras
              </p>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Receita Hist.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full border-2 border-dashed" style={{ borderColor: 'hsl(var(--chart-1))' }} />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Receita Proj.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">EBITDA Hist.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full border-2 border-dashed" style={{ borderColor: 'hsl(var(--chart-3))' }} />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">EBITDA Proj.</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-10 h-[400px]">
          <SimpleChart data={chartData} metrics={forecastMetrics} />
        </CardContent>
      </Card>

      {/* Forecast Table */}
      <Card className="glass-card rounded-[3rem] border border-border/50 shadow-xl overflow-hidden">
        <CardHeader className="p-8 pb-0">
          <CardTitle className="text-xl font-bold text-foreground tracking-tight uppercase">
            Projeções Mensais Detalhadas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <th className="px-4 py-4 text-left">Mês Projetado</th>
                <th className="px-4 py-4 text-right">Receita Líquida</th>
                <th className="px-4 py-4 text-right">EBITDA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {forecast.forecastMonths.map((month, i) => (
                <tr key={month} className="hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-4 font-bold text-foreground text-sm uppercase tracking-tight">
                    {month.split('-').reverse().join('/')}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-xs font-bold text-foreground">
                    {formatCurrency(forecast.forecastRevenue[i])}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-xs font-bold" style={{ color: 'hsl(var(--chart-3))' }}>
                    {formatCurrency(forecast.forecastEbitda[i])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </motion.div>
  );
};
