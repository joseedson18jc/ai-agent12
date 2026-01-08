import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

export const useFinancialGoals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setGoals((data || []) as FinancialGoal[]);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = useCallback(async (
    metricType: FinancialGoal['metric_type'],
    targetValue: number,
    alertThreshold: number = 10,
    periodType: FinancialGoal['period_type'] = 'monthly'
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .insert({
          user_id: user.id,
          metric_type: metricType,
          target_value: targetValue,
          alert_threshold_percent: alertThreshold,
          period_type: periodType
        })
        .select()
        .single();

      if (error) throw error;

      const newGoal = data as FinancialGoal;
      setGoals(prev => [newGoal, ...prev]);
      
      toast({
        title: '🎯 Meta criada',
        description: `Meta de ${METRIC_LABELS[metricType]} definida para ${formatGoalValue(metricType, targetValue)}`
      });

      return newGoal;
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: 'Erro ao criar meta',
        description: 'Não foi possível salvar a meta.',
        variant: 'destructive'
      });
      return null;
    }
  }, [user, toast]);

  const updateGoal = useCallback(async (
    goalId: string,
    updates: Partial<Pick<FinancialGoal, 'target_value' | 'alert_threshold_percent' | 'is_active' | 'period_type'>>
  ) => {
    try {
      const { error } = await supabase
        .from('financial_goals')
        .update(updates)
        .eq('id', goalId);

      if (error) throw error;

      setGoals(prev => prev.map(g => 
        g.id === goalId ? { ...g, ...updates } : g
      ));

      toast({
        title: '✓ Meta atualizada',
        description: 'As alterações foram salvas.'
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const deleteGoal = useCallback(async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      setGoals(prev => prev.filter(g => g.id !== goalId));

      toast({
        title: 'Meta removida',
        description: 'A meta foi excluída com sucesso.'
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover a meta.',
        variant: 'destructive'
      });
    }
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

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    calculateProgress,
    refetch: fetchGoals
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
