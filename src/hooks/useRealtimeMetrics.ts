import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface FinancialMetric {
  id: string;
  user_id: string;
  metric_type: 'revenue' | 'ebitda' | 'net_income' | 'gross_profit' | 'opex' | 'cogs';
  value: number;
  month: string;
  cost_center: string | null;
  created_at: string;
  updated_at: string;
}

export interface RealtimeKpis {
  revenue: number;
  ebitda: number;
  netIncome: number;
  grossProfit: number;
  opex: number;
  cogs: number;
}

// Local storage key
const METRICS_STORAGE_KEY = 'financial-metrics';

const loadMetricsFromStorage = (): FinancialMetric[] => {
  try {
    const stored = localStorage.getItem(METRICS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveMetricsToStorage = (metrics: FinancialMetric[]) => {
  localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metrics));
};

export const useRealtimeMetrics = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<FinancialMetric[]>(() => loadMetricsFromStorage());
  const [kpis, setKpis] = useState<RealtimeKpis>({
    revenue: 0,
    ebitda: 0,
    netIncome: 0,
    grossProfit: 0,
    opex: 0,
    cogs: 0,
  });
  const [isLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Calculate KPIs from metrics
  const calculateKpis = useCallback((metricsData: FinancialMetric[]): RealtimeKpis => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMetrics = metricsData.filter(m => m.month === currentMonth);

    return {
      revenue: currentMetrics.find(m => m.metric_type === 'revenue')?.value || 0,
      ebitda: currentMetrics.find(m => m.metric_type === 'ebitda')?.value || 0,
      netIncome: currentMetrics.find(m => m.metric_type === 'net_income')?.value || 0,
      grossProfit: currentMetrics.find(m => m.metric_type === 'gross_profit')?.value || 0,
      opex: currentMetrics.find(m => m.metric_type === 'opex')?.value || 0,
      cogs: currentMetrics.find(m => m.metric_type === 'cogs')?.value || 0,
    };
  }, []);

  // Save metrics
  const saveMetrics = useCallback(async (newMetrics: Partial<FinancialMetric>[]) => {
    const metricsWithDefaults = newMetrics.map(m => ({
      ...m,
      id: m.id || crypto.randomUUID(),
      user_id: 'local',
      created_at: m.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as FinancialMetric[];

    setMetrics(prev => {
      const updated = [...prev];
      metricsWithDefaults.forEach(newMetric => {
        const idx = updated.findIndex(m => m.id === newMetric.id);
        if (idx >= 0) {
          updated[idx] = newMetric;
        } else {
          updated.push(newMetric);
        }
      });
      saveMetricsToStorage(updated);
      setKpis(calculateKpis(updated));
      return updated;
    });
    
    setLastUpdate(new Date());

    toast({
      title: '📊 Métricas atualizadas',
      description: 'Seus dados financeiros foram salvos com sucesso.',
    });
  }, [toast, calculateKpis]);

  const refetch = useCallback(() => {
    const stored = loadMetricsFromStorage();
    setMetrics(stored);
    setKpis(calculateKpis(stored));
    setLastUpdate(new Date());
  }, [calculateKpis]);

  return {
    metrics,
    kpis,
    isLoading,
    lastUpdate,
    saveMetrics,
    refetch,
  };
};
