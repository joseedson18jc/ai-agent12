import { useState, useCallback } from 'react';
import { TransactionEntry } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

export interface ValidationError {
  type: 'missing_field' | 'invalid_format' | 'duplicate' | 'suspicious_value';
  message: string;
  entryIndex?: number;
  field?: string;
  severity: 'critical' | 'error';
}

export interface ValidationWarning {
  type: 'unusual_value' | 'possible_duplicate' | 'missing_optional';
  message: string;
  entryIndex?: number;
  field?: string;
}

export interface ValidationSuggestion {
  type: 'auto_fill' | 'category_fix' | 'date_fix' | 'value_fix';
  message: string;
  entryIndex: number;
  field: string;
  suggestedValue: string | number;
  confidence: number;
}

export const useDataValidation = () => {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateEntries = useCallback(async (entries: TransactionEntry[]): Promise<ValidationResult> => {
    setIsValidating(true);
    
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    try {
      // 1. Basic field validation
      entries.forEach((entry, index) => {
        // Check required fields
        if (!entry.category || entry.category.trim() === '') {
          errors.push({
            type: 'missing_field',
            message: `Linha ${index + 1}: Categoria obrigatória está vazia`,
            entryIndex: index,
            field: 'category',
            severity: 'error'
          });
        }

        if (!entry.competenceDate || entry.competenceDate.trim() === '') {
          errors.push({
            type: 'missing_field',
            message: `Linha ${index + 1}: Data obrigatória está vazia`,
            entryIndex: index,
            field: 'competenceDate',
            severity: 'error'
          });
        } else {
          // Validate date format
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(entry.competenceDate)) {
            errors.push({
              type: 'invalid_format',
              message: `Linha ${index + 1}: Formato de data inválido (esperado: YYYY-MM-DD)`,
              entryIndex: index,
              field: 'competenceDate',
              severity: 'error'
            });
          }
        }

        if (entry.amount === undefined || entry.amount === null || isNaN(entry.amount)) {
          errors.push({
            type: 'missing_field',
            message: `Linha ${index + 1}: Valor obrigatório está vazio ou inválido`,
            entryIndex: index,
            field: 'amount',
            severity: 'critical'
          });
        }

        // Check for suspicious values
        if (Math.abs(entry.amount) > 10000000) {
          warnings.push({
            type: 'unusual_value',
            message: `Linha ${index + 1}: Valor muito alto (${entry.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`,
            entryIndex: index,
            field: 'amount'
          });
        }

        if (entry.amount === 0) {
          warnings.push({
            type: 'unusual_value',
            message: `Linha ${index + 1}: Valor zero detectado`,
            entryIndex: index,
            field: 'amount'
          });
        }

        // Check for missing optional fields
        if (!entry.costCenter || entry.costCenter.trim() === '') {
          warnings.push({
            type: 'missing_optional',
            message: `Linha ${index + 1}: Centro de custo não informado`,
            entryIndex: index,
            field: 'costCenter'
          });
        }
      });

      // 2. Check for duplicates
      const seen = new Map<string, number>();
      entries.forEach((entry, index) => {
        const key = `${entry.competenceDate}-${entry.category}-${entry.amount}`;
        if (seen.has(key)) {
          warnings.push({
            type: 'possible_duplicate',
            message: `Linha ${index + 1}: Possível duplicata da linha ${seen.get(key)! + 1}`,
            entryIndex: index
          });
        } else {
          seen.set(key, index);
        }
      });

      // 3. Statistical anomaly detection
      const amounts = entries.map(e => Math.abs(e.amount));
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDev = Math.sqrt(amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length);

      entries.forEach((entry, index) => {
        const zScore = Math.abs((Math.abs(entry.amount) - mean) / stdDev);
        if (zScore > 3) {
          warnings.push({
            type: 'unusual_value',
            message: `Linha ${index + 1}: Valor estatisticamente anômalo (${zScore.toFixed(1)} desvios padrão)`,
            entryIndex: index,
            field: 'amount'
          });
        }
      });

      // 4. Date sequence validation
      const sortedByDate = [...entries].sort((a, b) => 
        new Date(a.competenceDate).getTime() - new Date(b.competenceDate).getTime()
      );
      
      const firstDate = new Date(sortedByDate[0]?.competenceDate || new Date());
      const lastDate = new Date(sortedByDate[sortedByDate.length - 1]?.competenceDate || new Date());
      const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 365) {
        warnings.push({
          type: 'unusual_value',
          message: `Período de dados muito longo (${Math.round(daysDiff)} dias). Considere filtrar por período.`
        });
      }

      const result: ValidationResult = {
        isValid: errors.filter(e => e.severity === 'critical').length === 0,
        errors,
        warnings,
        suggestions
      };

      setValidationResult(result);

      // Show toast with summary
      if (errors.length > 0 || warnings.length > 0) {
        const criticalCount = errors.filter(e => e.severity === 'critical').length;
        const errorCount = errors.filter(e => e.severity === 'error').length;
        
        if (criticalCount > 0) {
          toast({
            title: "⚠️ Erros críticos encontrados",
            description: `${criticalCount} erro(s) crítico(s), ${errorCount} erro(s), ${warnings.length} aviso(s)`,
            variant: "destructive"
          });
        } else if (errorCount > 0) {
          toast({
            title: "⚠️ Problemas encontrados",
            description: `${errorCount} erro(s), ${warnings.length} aviso(s) - Verifique antes de continuar`,
            variant: "destructive"
          });
        } else if (warnings.length > 0) {
          toast({
            title: "ℹ️ Avisos de validação",
            description: `${warnings.length} aviso(s) encontrado(s). Revise os dados.`
          });
        }
      } else {
        toast({
          title: "✅ Dados validados",
          description: `${entries.length} transações verificadas sem problemas.`
        });
      }

      return result;
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Erro na validação",
        description: "Não foi possível validar os dados",
        variant: "destructive"
      });
      
      return {
        isValid: false,
        errors: [{
          type: 'invalid_format',
          message: 'Erro interno na validação',
          severity: 'critical'
        }],
        warnings: [],
        suggestions: []
      };
    } finally {
      setIsValidating(false);
    }
  }, [toast]);

  const runAIValidation = useCallback(async (entries: TransactionEntry[]): Promise<void> => {
    if (entries.length === 0) return;

    try {
      // Prepare financial data for anomaly detection
      const financialData = entries.reduce((acc, entry) => {
        const month = entry.competenceDate.substring(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = { revenue: 0, expenses: 0, count: 0 };
        }
        if (entry.type === 'receivable') {
          acc[month].revenue += entry.amount;
        } else {
          acc[month].expenses += Math.abs(entry.amount);
        }
        acc[month].count++;
        return acc;
      }, {} as Record<string, { revenue: number; expenses: number; count: number }>);

      const metrics = Object.entries(financialData).map(([month, data]) => ({
        month,
        ...data,
        net: data.revenue - data.expenses
      }));

      // Call AI anomaly detection
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-anomalies`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            financialData,
            metrics
          })
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: "Limite de requisições",
            description: "Tente novamente em alguns segundos.",
            variant: "destructive"
          });
          return;
        }
        if (response.status === 402) {
          toast({
            title: "Créditos insuficientes",
            description: "Adicione créditos para usar a IA.",
            variant: "destructive"
          });
          return;
        }
        throw new Error(`HTTP error: ${response.status}`);
      }

      const { anomalies } = await response.json();

      if (anomalies && anomalies.length > 0) {
        toast({
          title: "🔍 Anomalias detectadas pela IA",
          description: `${anomalies.length} padrão(ões) incomum(ns) identificado(s). Verifique o painel de notificações.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "✅ Análise IA concluída",
          description: "Nenhuma anomalia significativa detectada nos dados."
        });
      }
    } catch (error) {
      console.error('AI validation error:', error);
      // Don't show error toast for AI validation - it's optional
    }
  }, [toast]);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    isValidating,
    validationResult,
    validateEntries,
    runAIValidation,
    clearValidation
  };
};
