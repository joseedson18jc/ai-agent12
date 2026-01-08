import { useState, useCallback } from 'react';
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

// Local storage key for anomalies
const ANOMALIES_STORAGE_KEY = 'financial-anomalies';

const loadAnomaliesFromStorage = (): FinancialAnomaly[] => {
  try {
    const stored = localStorage.getItem(ANOMALIES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveAnomaliesToStorage = (anomalies: FinancialAnomaly[]) => {
  localStorage.setItem(ANOMALIES_STORAGE_KEY, JSON.stringify(anomalies));
};

export const useFinancialAnomalies = () => {
  const { toast } = useToast();
  const [anomalies, setAnomalies] = useState<FinancialAnomaly[]>(() => 
    loadAnomaliesFromStorage().filter(a => !a.is_dismissed)
  );
  const [unreadCount, setUnreadCount] = useState(() => 
    loadAnomaliesFromStorage().filter(a => !a.is_read && !a.is_dismissed).length
  );
  const [isLoading] = useState(false);

  // Mark anomaly as read
  const markAsRead = useCallback(async (anomalyId: string) => {
    setAnomalies(prev => {
      const updated = prev.map(a => (a.id === anomalyId ? { ...a, is_read: true } : a));
      saveAnomaliesToStorage(updated);
      return updated;
    });
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Dismiss anomaly
  const dismissAnomaly = useCallback(async (anomalyId: string) => {
    setAnomalies(prev => {
      const updated = prev.filter(a => a.id !== anomalyId);
      saveAnomaliesToStorage(updated);
      return updated;
    });
    toast({
      title: 'Alerta dispensado',
      description: 'O alerta foi removido da sua lista.',
    });
  }, [toast]);

  // Create a new anomaly (for AI detection)
  const createAnomaly = useCallback(async (anomaly: Omit<FinancialAnomaly, 'id' | 'user_id' | 'is_read' | 'is_dismissed' | 'created_at'>) => {
    const newAnomaly: FinancialAnomaly = {
      ...anomaly,
      id: crypto.randomUUID(),
      user_id: 'local',
      is_read: false,
      is_dismissed: false,
      created_at: new Date().toISOString(),
    };

    setAnomalies(prev => {
      const updated = [newAnomaly, ...prev];
      saveAnomaliesToStorage(updated);
      return updated;
    });
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
  }, [toast]);

  const refetch = useCallback(() => {
    const stored = loadAnomaliesFromStorage().filter(a => !a.is_dismissed);
    setAnomalies(stored);
    setUnreadCount(stored.filter(a => !a.is_read).length);
  }, []);

  return {
    anomalies,
    unreadCount,
    isLoading,
    markAsRead,
    dismissAnomaly,
    createAnomaly,
    refetch,
  };
};
