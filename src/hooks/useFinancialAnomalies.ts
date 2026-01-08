import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FinancialAnomaly {
  id: string;
  user_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric_type: string | null;
  current_value: number | null;
  expected_value: number | null;
  deviation_percent: number | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

export const useFinancialAnomalies = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [anomalies, setAnomalies] = useState<FinancialAnomaly[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch anomalies
  const fetchAnomalies = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('financial_anomalies')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = data as FinancialAnomaly[];
      setAnomalies(typedData);
      setUnreadCount(typedData.filter(a => !a.is_read).length);
    } catch (error) {
      console.error('Error fetching anomalies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark anomaly as read
  const markAsRead = useCallback(async (anomalyId: string) => {
    try {
      const { error } = await supabase
        .from('financial_anomalies')
        .update({ is_read: true } as any)
        .eq('id', anomalyId);

      if (error) throw error;

      setAnomalies(prev =>
        prev.map(a => (a.id === anomalyId ? { ...a, is_read: true } : a))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking anomaly as read:', error);
    }
  }, []);

  // Dismiss anomaly
  const dismissAnomaly = useCallback(async (anomalyId: string) => {
    try {
      const { error } = await supabase
        .from('financial_anomalies')
        .update({ is_dismissed: true } as any)
        .eq('id', anomalyId);

      if (error) throw error;

      setAnomalies(prev => prev.filter(a => a.id !== anomalyId));
      toast({
        title: 'Alerta dispensado',
        description: 'O alerta foi removido da sua lista.',
      });
    } catch (error) {
      console.error('Error dismissing anomaly:', error);
    }
  }, [toast]);

  // Create a new anomaly (for AI detection)
  const createAnomaly = useCallback(async (anomaly: Omit<FinancialAnomaly, 'id' | 'user_id' | 'is_read' | 'is_dismissed' | 'created_at'>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('financial_anomalies')
        .insert({
          ...anomaly,
          user_id: user.id,
        } as any);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating anomaly:', error);
    }
  }, [user]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchAnomalies();

    const channel = supabase
      .channel('financial-anomalies-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'financial_anomalies',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New anomaly detected:', payload);
          const newAnomaly = payload.new as FinancialAnomaly;
          
          setAnomalies(prev => [newAnomaly, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast notification
          const severityIcons: Record<string, string> = {
            low: '💡',
            medium: '⚠️',
            high: '🔶',
            critical: '🚨',
          };

          toast({
            title: `${severityIcons[newAnomaly.severity]} ${newAnomaly.title}`,
            description: newAnomaly.description,
            variant: newAnomaly.severity === 'critical' ? 'destructive' : 'default',
          });

          // Browser push notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newAnomaly.title, {
              body: newAnomaly.description,
              icon: '/favicon.ico',
              tag: newAnomaly.id,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAnomalies, toast]);

  return {
    anomalies,
    unreadCount,
    isLoading,
    markAsRead,
    dismissAnomaly,
    createAnomaly,
    refetch: fetchAnomalies,
  };
};
