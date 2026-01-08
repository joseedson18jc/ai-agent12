import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, LineChart, Activity, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ChartDataPoint {
  month: string;
  'Receita Líquida': number;
  'EBITDA': number;
  'Lucro Líquido': number;
}

interface RealtimeChartProps {
  data: ChartDataPoint[];
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-2xl"
    >
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
        {label}
      </p>
      <div className="space-y-2">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs font-medium text-foreground">
                {entry.name}
              </span>
            </div>
            <span className="text-xs font-bold font-mono text-foreground">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0,
              }).format(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export const RealtimeChart = ({ data, isLoading }: RealtimeChartProps) => {
  const [chartType, setChartType] = useState<'area' | 'line'>('area');
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Card className="rounded-[2.5rem] border border-border/30 shadow-2xl bg-card/60 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-2xl flex items-center justify-center">
              <Activity size={32} className="text-muted-foreground opacity-30" />
            </div>
            <p className="text-muted-foreground font-medium">
              Aguardando dados para visualização
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[2.5rem] border border-border/30 shadow-2xl overflow-hidden bg-card/60 backdrop-blur-sm">
      <CardHeader className="p-8 pb-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[9px] font-bold uppercase tracking-wider mb-3 border border-primary/20">
              <Activity size={10} className="animate-pulse" />
              Atualização em tempo real
            </div>
            <CardTitle className="text-2xl font-bold text-foreground tracking-tight">
              Evolução Financeira
            </CardTitle>
            <p className="text-muted-foreground text-sm mt-1.5">
              Métricas atualizadas automaticamente
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Chart type toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl">
              <Button
                variant={chartType === 'area' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('area')}
                className="rounded-lg px-3 h-8"
              >
                <AreaChart size={14} />
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className="rounded-lg px-3 h-8"
              >
                <LineChart size={14} />
              </Button>
            </div>

            {/* Legend */}
            <div className="hidden md:flex items-center gap-6 px-5 py-3 bg-muted/30 rounded-2xl">
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
        </div>
      </CardHeader>
      
      <CardContent className="p-8 h-[420px]">
        <motion.div
          key={animationKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientEbitda" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.5}
              />
              
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: 11, 
                  fontWeight: 600, 
                  fill: 'hsl(var(--muted-foreground))' 
                }}
                dy={10}
              />
              
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: 10, 
                  fontWeight: 600, 
                  fill: 'hsl(var(--muted-foreground))' 
                }}
                tickFormatter={(value) => 
                  new Intl.NumberFormat('pt-BR', { 
                    notation: 'compact', 
                    compactDisplay: 'short' 
                  }).format(value)
                }
                dx={-10}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {chartType === 'area' ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="Receita Líquida"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={3}
                    fill="url(#gradientRevenue)"
                    dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--chart-1))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="EBITDA"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={3}
                    fill="url(#gradientEbitda)"
                    dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--chart-3))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Lucro Líquido"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fill="url(#gradientProfit)"
                    dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="Receita Líquida"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={3}
                    dot={{ r: 5, strokeWidth: 2, fill: 'hsl(var(--card))' }}
                    activeDot={{ r: 7, strokeWidth: 0, fill: 'hsl(var(--chart-1))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="EBITDA"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={3}
                    dot={{ r: 5, strokeWidth: 2, fill: 'hsl(var(--card))' }}
                    activeDot={{ r: 7, strokeWidth: 0, fill: 'hsl(var(--chart-3))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Lucro Líquido"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 5, strokeWidth: 2, fill: 'hsl(var(--card))' }}
                    activeDot={{ r: 7, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  );
};
