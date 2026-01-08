import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface FinancialGoal {
  id: string;
  user_id: string;
  metric_type: 'revenue' | 'ebitda' | 'gross_margin' | 'net_margin' | 'operating_expenses';
  target_value: number;
  alert_threshold_percent: number;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  goal: FinancialGoal;
  currentValue: number;
  percentAchieved: number;
  status: 'on_track' | 'at_risk' | 'exceeded' | 'behind';
  distanceToTarget: number;
}

const METRIC_LABELS: Record<FinancialGoal['metric_type'], string> = {
  revenue: 'Receita',
  ebitda: 'EBITDA',
  gross_margin: 'Margem Bruta',
  net_margin: 'Margem Líquida',
  operating_expenses: 'Despesas Operacionais'
};

// Local storage key for goals
const GOALS_STORAGE_KEY = 'financial-goals';

const loadGoalsFromStorage = (): FinancialGoal[] => {
  try {
    const stored = localStorage.getItem(GOALS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveGoalsToStorage = (goals: FinancialGoal[]) => {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
};

export const useFinancialGoals = () => {
  const { toast } = useToast();
  const [goals, setGoals] = useState<FinancialGoal[]>(() => loadGoalsFromStorage());
  const [loading] = useState(false);

  const createGoal = useCallback(async (
    metricType: FinancialGoal['metric_type'],
    targetValue: number,
    alertThreshold: number = 10,
    periodType: FinancialGoal['period_type'] = 'monthly'
  ) => {
    const newGoal: FinancialGoal = {
      id: crypto.randomUUID(),
      user_id: 'local',
      metric_type: metricType,
      target_value: targetValue,
      alert_threshold_percent: alertThreshold,
      period_type: periodType,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setGoals(prev => {
      const updated = [newGoal, ...prev];
      saveGoalsToStorage(updated);
      return updated;
    });
    
    toast({
      title: '🎯 Meta criada',
      description: `Meta de ${METRIC_LABELS[metricType]} definida para ${formatGoalValue(metricType, targetValue)}`
    });

    return newGoal;
  }, [toast]);

  const updateGoal = useCallback(async (
    goalId: string,
    updates: Partial<Pick<FinancialGoal, 'target_value' | 'alert_threshold_percent' | 'is_active' | 'period_type'>>
  ) => {
    setGoals(prev => {
      const updated = prev.map(g => 
        g.id === goalId ? { ...g, ...updates, updated_at: new Date().toISOString() } : g
      );
      saveGoalsToStorage(updated);
      return updated;
    });

    toast({
      title: '✓ Meta atualizada',
      description: 'As alterações foram salvas.'
    });
  }, [toast]);

  const deleteGoal = useCallback(async (goalId: string) => {
    setGoals(prev => {
      const updated = prev.filter(g => g.id !== goalId);
      saveGoalsToStorage(updated);
      return updated;
    });

    toast({
      title: 'Meta removida',
      description: 'A meta foi excluída com sucesso.'
    });
  }, [toast]);

  const calculateProgress = useCallback((
    goal: FinancialGoal,
    currentValue: number
  ): GoalProgress => {
    const percentAchieved = goal.target_value > 0 
      ? (currentValue / goal.target_value) * 100 
      : 0;
    
    const distanceToTarget = goal.target_value - currentValue;
    const thresholdPercent = 100 - goal.alert_threshold_percent;

    let status: GoalProgress['status'];
    if (percentAchieved >= 100) {
      status = 'exceeded';
    } else if (percentAchieved >= thresholdPercent) {
      status = 'at_risk';
    } else if (percentAchieved >= 50) {
      status = 'on_track';
    } else {
      status = 'behind';
    }

    return {
      goal,
      currentValue,
      percentAchieved: Math.min(percentAchieved, 150),
      status,
      distanceToTarget
    };
  }, []);

  const refetch = useCallback(() => {
    setGoals(loadGoalsFromStorage());
  }, []);

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    calculateProgress,
    refetch
  };
};

export const formatGoalValue = (metricType: FinancialGoal['metric_type'], value: number): string => {
  if (metricType === 'gross_margin' || metricType === 'net_margin') {
    return `${value.toFixed(1)}%`;
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const getMetricLabel = (metricType: FinancialGoal['metric_type']): string => {
  return METRIC_LABELS[metricType];
};
