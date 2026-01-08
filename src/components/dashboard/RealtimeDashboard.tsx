import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Wallet,
  Target,
  DollarSign,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRealtimeMetrics, RealtimeKpis } from '@/hooks/useRealtimeMetrics';
import { formatCurrency } from '@/utils/finance';
import { useToast } from '@/hooks/use-toast';

interface RealtimeMetricCardProps {
  label: string;
  value: number;
  previousValue?: number;
  icon: React.ElementType;
  color: string;
  delay?: number;
}

const RealtimeMetricCard = ({ 
  label, 
  value, 
  previousValue, 
  icon: Icon, 
  color,
  delay = 0 
}: RealtimeMetricCardProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [value, displayValue]);

  const variation = previousValue && previousValue !== 0 
    ? ((value - previousValue) / Math.abs(previousValue)) * 100 
    : null;
  const isPositive = variation !== null && variation >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className={`
        relative overflow-hidden rounded-[2rem] border border-border/30 
        bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl
        shadow-xl hover:shadow-2xl transition-all duration-500 group
        hover:border-primary/30 hover:-translate-y-1
      `}>
        {/* Pulse indicator for real-time updates */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <motion.div 
            className="w-2 h-2 rounded-full bg-green-500"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            Live
          </span>
        </div>
        
        <CardContent className="p-8">
          <div className="flex items-start justify-between mb-6">
            <motion.div 
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`} 
              style={{ backgroundColor: `hsl(var(--${color}) / 0.15)` }}
              whileHover={{ rotate: 5 }}
            >
              <Icon size={28} style={{ color: `hsl(var(--${color}))` }} />
            </motion.div>
          </div>
          
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">
            {label}
          </p>
          
          <div className="flex items-end justify-between">
            <motion.p 
              className={`text-4xl font-bold text-foreground font-mono tracking-tighter ${isAnimating ? 'text-primary' : ''}`}
              animate={isAnimating ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {formatCurrency(displayValue)}
            </motion.p>
            
            {variation !== null && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-xl 
                  text-[11px] font-bold uppercase tracking-wider
                  ${isPositive 
                    ? 'bg-green-500/15 text-green-600 dark:text-green-400' 
                    : 'bg-destructive/15 text-destructive'
                  }
                `}
              >
                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {Math.abs(variation).toFixed(1)}%
              </motion.div>
            )}
          </div>
        </CardContent>
        
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </Card>
    </motion.div>
  );
};

interface RealtimeDashboardProps {
  dreByMonth?: Record<string, any>;
  sortedMonths?: string[];
}

export const RealtimeDashboard = ({ dreByMonth, sortedMonths }: RealtimeDashboardProps) => {
  const { kpis, isLoading, lastUpdate, refetch } = useRealtimeMetrics();
  const { toast } = useToast();
  const [isDetecting, setIsDetecting] = useState(false);

  // Calculate previous month KPIs for comparison
  const previousKpis = useMemo(() => {
    if (!dreByMonth || !sortedMonths || sortedMonths.length < 2) return null;
    const prevMonth = sortedMonths[sortedMonths.length - 2];
    return dreByMonth[prevMonth];
  }, [dreByMonth, sortedMonths]);

  const detectAnomalies = async () => {
    if (!dreByMonth) return;
    
    setIsDetecting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-anomalies`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            financialData: dreByMonth,
            metrics: kpis,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: "Limite de requisições",
            description: "Aguarde um momento e tente novamente.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(`HTTP error: ${response.status}`);
      }

      const { anomalies } = await response.json();
      
      if (anomalies.length > 0) {
        toast({
          title: `🚨 ${anomalies.length} anomalia(s) detectada(s)`,
          description: "Verifique o painel de notificações para mais detalhes.",
        });
      } else {
        toast({
          title: "✅ Nenhuma anomalia detectada",
          description: "Seus dados financeiros estão dentro dos padrões esperados.",
        });
      }
    } catch (error) {
      console.error('Anomaly detection error:', error);
      toast({
        title: "Erro na detecção",
        description: "Não foi possível analisar anomalias.",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const metrics = [
    { 
      key: 'revenue', 
      label: 'Receita Líquida', 
      value: kpis.revenue || (dreByMonth && sortedMonths?.length ? dreByMonth[sortedMonths[sortedMonths.length - 1]]?.revenueNet : 0),
      previousValue: previousKpis?.revenueNet,
      icon: Wallet, 
      color: 'chart-1' 
    },
    { 
      key: 'ebitda', 
      label: 'EBITDA', 
      value: kpis.ebitda || (dreByMonth && sortedMonths?.length ? dreByMonth[sortedMonths[sortedMonths.length - 1]]?.ebitda : 0),
      previousValue: previousKpis?.ebitda,
      icon: Target, 
      color: 'chart-3' 
    },
    { 
      key: 'netIncome', 
      label: 'Lucro Líquido', 
      value: kpis.netIncome || (dreByMonth && sortedMonths?.length ? dreByMonth[sortedMonths[sortedMonths.length - 1]]?.netIncome : 0),
      previousValue: previousKpis?.netIncome,
      icon: DollarSign, 
      color: 'primary' 
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header with live indicator */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-green-500/20">
            <Activity size={12} className="animate-pulse" /> 
            Dados em Tempo Real
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">
            Dashboard <span className="gradient-text">Inteligente</span>
          </h2>
          <p className="text-muted-foreground mt-2 font-medium">
            KPIs atualizados automaticamente
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={isLoading}
            className="rounded-xl"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Atualizar
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={detectAnomalies}
            disabled={isDetecting || !dreByMonth}
            className="rounded-xl gap-2"
          >
            <Zap size={14} className={isDetecting ? 'animate-pulse' : ''} />
            {isDetecting ? 'Analisando...' : 'Detectar Anomalias'}
          </Button>
        </div>
      </div>

      {/* Last update timestamp */}
      {lastUpdate && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] text-muted-foreground font-medium"
        >
          Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
        </motion.p>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatePresence mode="wait">
          {metrics.map((metric, index) => (
            <RealtimeMetricCard
              key={metric.key}
              label={metric.label}
              value={metric.value}
              previousValue={metric.previousValue}
              icon={metric.icon}
              color={metric.color}
              delay={index * 0.1}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
