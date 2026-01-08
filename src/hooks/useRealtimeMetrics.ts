import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

export const useRealtimeMetrics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<FinancialMetric[]>([]);
  const [kpis, setKpis] = useState<RealtimeKpis>({
    revenue: 0,
    ebitda: 0,
    netIncome: 0,
    grossProfit: 0,
    opex: 0,
    cogs: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
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

  // Fetch initial metrics
  const fetchMetrics = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('financial_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const typedData = data as FinancialMetric[];
      setMetrics(typedData);
      setKpis(calculateKpis(typedData));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, calculateKpis]);

  // Save metrics to database
  const saveMetrics = useCallback(async (newMetrics: Partial<FinancialMetric>[]) => {
    if (!user) return;

    try {
      const metricsWithUser = newMetrics.map(m => ({
        ...m,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from('financial_metrics')
        .upsert(metricsWithUser as any, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: '📊 Métricas atualizadas',
        description: 'Seus dados financeiros foram salvos com sucesso.',
      });
    } catch (error) {
      console.error('Error saving metrics:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as métricas.',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchMetrics();

    const channel = supabase
      .channel('financial-metrics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_metrics',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime metric update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setMetrics(prev => {
              const newMetric = payload.new as FinancialMetric;
              const existing = prev.findIndex(m => m.id === newMetric.id);
              
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = newMetric;
                return updated;
              }
              return [...prev, newMetric];
            });
            setLastUpdate(new Date());
          } else if (payload.eventType === 'DELETE') {
            setMetrics(prev => prev.filter(m => m.id !== (payload.old as FinancialMetric).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMetrics]);

  // Update KPIs when metrics change
  useEffect(() => {
    setKpis(calculateKpis(metrics));
  }, [metrics, calculateKpis]);

  return {
    metrics,
    kpis,
    isLoading,
    lastUpdate,
    saveMetrics,
    refetch: fetchMetrics,
  };
};
