import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Trash2, Edit2, Check, X, TrendingUp, TrendingDown, AlertTriangle, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFinancialGoals, FinancialGoal, GoalProgress, formatGoalValue, getMetricLabel } from '@/hooks/useFinancialGoals';
import { DreKpis } from '@/types/finance';

interface FinancialGoalsProps {
  currentKpis?: DreKpis | null;
}

const STATUS_CONFIG: Record<GoalProgress['status'], { label: string; color: string; icon: typeof TrendingUp; bg: string }> = {
  exceeded: { label: 'Meta Alcançada', color: 'text-green-600', icon: Trophy, bg: 'bg-green-500/10' },
  on_track: { label: 'No Caminho', color: 'text-blue-600', icon: TrendingUp, bg: 'bg-blue-500/10' },
  at_risk: { label: 'Atenção', color: 'text-yellow-600', icon: AlertTriangle, bg: 'bg-yellow-500/10' },
  behind: { label: 'Abaixo', color: 'text-red-600', icon: TrendingDown, bg: 'bg-red-500/10' }
};

const METRIC_OPTIONS: { value: FinancialGoal['metric_type']; label: string }[] = [
  { value: 'revenue', label: 'Receita' },
  { value: 'ebitda', label: 'EBITDA' },
  { value: 'gross_margin', label: 'Margem Bruta (%)' },
  { value: 'net_margin', label: 'Margem Líquida (%)' },
  { value: 'operating_expenses', label: 'Despesas Operacionais' }
];

const PERIOD_OPTIONS: { value: FinancialGoal['period_type']; label: string }[] = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' }
];

export const FinancialGoals = ({ currentKpis }: FinancialGoalsProps) => {
  const { goals, loading, createGoal, updateGoal, deleteGoal, calculateProgress } = useFinancialGoals();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    metricType: 'revenue' as FinancialGoal['metric_type'],
    targetValue: '',
    alertThreshold: '10',
    periodType: 'monthly' as FinancialGoal['period_type']
  });

  const getCurrentValue = (metricType: FinancialGoal['metric_type']): number => {
    if (!currentKpis) return 0;
    
    switch (metricType) {
      case 'revenue': return currentKpis.revenueNet;
      case 'ebitda': return currentKpis.ebitda;
      case 'gross_margin': return parseFloat(currentKpis.grossMargin) || 0;
      case 'net_margin': return parseFloat(currentKpis.netMargin) || 0;
      case 'operating_expenses': return currentKpis.opex;
      default: return 0;
    }
  };

  const handleCreateGoal = async () => {
    const targetValue = parseFloat(formData.targetValue);
    const alertThreshold = parseFloat(formData.alertThreshold);
    
    if (isNaN(targetValue) || targetValue <= 0) return;

    await createGoal(formData.metricType, targetValue, alertThreshold, formData.periodType);
    setShowAddDialog(false);
    setFormData({
      metricType: 'revenue',
      targetValue: '',
      alertThreshold: '10',
      periodType: 'monthly'
    });
  };

  const handleDeleteGoal = async (goalId: string) => {
    await deleteGoal(goalId);
  };

  const toggleGoalActive = async (goal: FinancialGoal) => {
    await updateGoal(goal.id, { is_active: !goal.is_active });
  };

  const activeGoals = goals.filter(g => g.is_active);
  const goalsWithProgress = activeGoals.map(goal => 
    calculateProgress(goal, getCurrentValue(goal.metric_type))
  );

  return (
    <Card className="rounded-3xl border-border/50 overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  Metas Financeiras
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activeGoals.length} {activeGoals.length === 1 ? 'meta ativa' : 'metas ativas'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="gap-2 rounded-xl"
              >
                <Plus size={14} /> Nova Meta
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : goalsWithProgress.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma meta definida</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Crie metas para receita, EBITDA ou margens
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                  className="mt-4 gap-2 rounded-xl"
                >
                  <Plus size={14} /> Criar Primeira Meta
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {goalsWithProgress.map(({ goal, currentValue, percentAchieved, status, distanceToTarget }) => {
                    const config = STATUS_CONFIG[status];
                    const StatusIcon = config.icon;
                    
                    return (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`relative p-5 rounded-2xl border border-border/50 ${config.bg}`}
                      >
                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="absolute top-2 right-2 h-7 w-7 rounded-lg opacity-50 hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </Button>

                        {/* Header */}
                        <div className="flex items-center gap-2 mb-4">
                          <StatusIcon className={`w-5 h-5 ${config.color}`} />
                          <span className="font-semibold text-foreground">
                            {getMetricLabel(goal.metric_type)}
                          </span>
                          <Badge variant="outline" className="text-[10px] ml-auto">
                            {PERIOD_OPTIONS.find(p => p.value === goal.period_type)?.label}
                          </Badge>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3">
                          <Progress 
                            value={Math.min(percentAchieved, 100)} 
                            className="h-3 rounded-full"
                          />
                        </div>

                        {/* Values */}
                        <div className="flex items-end justify-between mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Atual</p>
                            <p className={`text-lg font-bold ${config.color}`}>
                              {formatGoalValue(goal.metric_type, currentValue)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Meta</p>
                            <p className="text-lg font-bold text-foreground">
                              {formatGoalValue(goal.metric_type, goal.target_value)}
                            </p>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center justify-between">
                          <Badge className={`${config.bg} ${config.color} border-0 text-xs`}>
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {percentAchieved.toFixed(0)}% alcançado
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Add Goal Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Nova Meta Financeira
            </DialogTitle>
            <DialogDescription>
              Defina um objetivo e receba alertas quando estiver próximo de alcançá-lo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Metric Type */}
            <div className="space-y-2">
              <Label>Indicador</Label>
              <Select
                value={formData.metricType}
                onValueChange={(v) => setFormData(prev => ({ ...prev, metricType: v as FinancialGoal['metric_type'] }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Value */}
            <div className="space-y-2">
              <Label>
                Valor da Meta
                {(formData.metricType === 'gross_margin' || formData.metricType === 'net_margin') && (
                  <span className="text-muted-foreground ml-1">(%)</span>
                )}
              </Label>
              <Input
                type="number"
                placeholder={formData.metricType.includes('margin') ? 'Ex: 25.5' : 'Ex: 100000'}
                value={formData.targetValue}
                onChange={(e) => setFormData(prev => ({ ...prev, targetValue: e.target.value }))}
                className="rounded-xl"
              />
            </div>

            {/* Period */}
            <div className="space-y-2">
              <Label>Período</Label>
              <Select
                value={formData.periodType}
                onValueChange={(v) => setFormData(prev => ({ ...prev, periodType: v as FinancialGoal['period_type'] }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Alert Threshold */}
            <div className="space-y-2">
              <Label>Alertar quando atingir (%)</Label>
              <Input
                type="number"
                placeholder="90"
                value={formData.alertThreshold}
                onChange={(e) => setFormData(prev => ({ ...prev, alertThreshold: e.target.value }))}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Você receberá um alerta quando atingir {100 - (parseFloat(formData.alertThreshold) || 10)}% da meta
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateGoal}
              disabled={!formData.targetValue || parseFloat(formData.targetValue) <= 0}
              className="rounded-xl gap-2"
            >
              <Check size={14} /> Criar Meta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
