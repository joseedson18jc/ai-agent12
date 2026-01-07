import { motion } from 'framer-motion';
import { FileCheck, ArrowRight, X, Sparkles, TrendingUp, TrendingDown, Calendar, Tag, AlertTriangle, AlertCircle, Download, Pencil, Check, XCircle, Trash2, CheckSquare, History, RefreshCw, Filter, Loader2, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { TransactionEntry, BPSection } from '@/types/finance';
import { formatCurrency } from '@/utils/finance';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

type IssueFilter = 'all' | 'errors' | 'warnings' | 'issues';

interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  count: number;
}

interface CsvPreviewProps {
  entries: TransactionEntry[];
  isAiParsed: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onEntriesChange?: (entries: TransactionEntry[]) => void;
  pendingSavedMappings?: Record<string, BPSection> | null;
  onApplySavedMappings?: () => void;
  onDismissSavedMappings?: () => void;
}

interface FieldIssue {
  field: 'type' | 'category' | 'costCenter' | 'amount' | 'date';
  severity: 'error' | 'warning';
  message: string;
}

interface AIConfidence {
  categoryConfidence?: number;
  costCenterConfidence?: number;
}

const validateEntries = (entries: TransactionEntry[]): { 
  issues: ValidationIssue[], 
  entryIssues: Map<number, string[]>,
  fieldIssues: Map<number, FieldIssue[]>
} => {
  const issues: ValidationIssue[] = [];
  const entryIssues = new Map<number, string[]>();
  const fieldIssues = new Map<number, FieldIssue[]>();

  const addFieldIssue = (idx: number, issue: FieldIssue) => {
    const existing = fieldIssues.get(idx) || [];
    existing.push(issue);
    fieldIssues.set(idx, existing);
  };

  const invalidDates = entries.filter((e, idx) => {
    const date = new Date(e.competenceDate);
    const invalid = isNaN(date.getTime());
    if (invalid) {
      entryIssues.set(idx, [...(entryIssues.get(idx) || []), 'Data inválida']);
      addFieldIssue(idx, { field: 'date', severity: 'error', message: 'Data inválida' });
    }
    return invalid;
  });
  if (invalidDates.length > 0) {
    issues.push({ type: 'error', message: 'Datas inválidas', count: invalidDates.length });
  }

  const emptyCategories = entries.filter((e, idx) => {
    const empty = !e.category || e.category.trim() === '';
    if (empty) {
      entryIssues.set(idx, [...(entryIssues.get(idx) || []), 'Categoria vazia']);
      addFieldIssue(idx, { field: 'category', severity: 'error', message: 'Categoria vazia' });
    }
    return empty;
  });
  if (emptyCategories.length > 0) {
    issues.push({ type: 'error', message: 'Categorias vazias', count: emptyCategories.length });
  }

  // Check for empty cost centers (warning, not error)
  const emptyCostCenters = entries.filter((e, idx) => {
    const empty = !e.costCenter || e.costCenter.trim() === '';
    if (empty) {
      addFieldIssue(idx, { field: 'costCenter', severity: 'warning', message: 'Centro de custo vazio' });
    }
    return empty;
  });
  if (emptyCostCenters.length > 0) {
    issues.push({ type: 'warning', message: 'Centros de custo vazios', count: emptyCostCenters.length });
  }

  const zeroValues = entries.filter((e, idx) => {
    const isZero = e.amount === 0;
    if (isZero) {
      entryIssues.set(idx, [...(entryIssues.get(idx) || []), 'Valor zero']);
      addFieldIssue(idx, { field: 'amount', severity: 'warning', message: 'Valor zero' });
    }
    return isZero;
  });
  if (zeroValues.length > 0) {
    issues.push({ type: 'warning', message: 'Valores zerados', count: zeroValues.length });
  }

  const largeValues = entries.filter((e, idx) => {
    const isLarge = Math.abs(e.amount) > 1000000;
    if (isLarge) {
      entryIssues.set(idx, [...(entryIssues.get(idx) || []), 'Valor atípico']);
      addFieldIssue(idx, { field: 'amount', severity: 'warning', message: 'Valor atípico (>R$1M)' });
    }
    return isLarge;
  });
  if (largeValues.length > 0) {
    issues.push({ type: 'warning', message: 'Valores acima de R$ 1M', count: largeValues.length });
  }

  const futureDates = entries.filter((e, idx) => {
    const date = new Date(e.competenceDate);
    const isFuture = date > new Date();
    if (isFuture) {
      entryIssues.set(idx, [...(entryIssues.get(idx) || []), 'Data futura']);
      addFieldIssue(idx, { field: 'date', severity: 'warning', message: 'Data no futuro' });
    }
    return isFuture;
  });
  if (futureDates.length > 0) {
    issues.push({ type: 'warning', message: 'Datas futuras', count: futureDates.length });
  }

  return { issues, entryIssues, fieldIssues };
};

const exportToCsv = (entries: TransactionEntry[]) => {
  const headers = ['Tipo', 'Categoria', 'Centro de Custo', 'Valor', 'Data'];
  const rows = entries.map(e => [
    e.type === 'receivable' ? 'Receita' : 'Despesa',
    e.category,
    e.costCenter || '',
    e.amount.toFixed(2),
    e.competenceDate
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dados_validados_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const CsvPreview = ({ 
  entries, 
  isAiParsed, 
  onConfirm, 
  onCancel, 
  onEntriesChange,
  pendingSavedMappings,
  onApplySavedMappings,
  onDismissSavedMappings
}: CsvPreviewProps) => {
  const { toast } = useToast();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    type: 'receivable' | 'payable';
    category: string;
    costCenter: string;
    amount: string;
    date: string;
  } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all');
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<Map<number, AIConfidence>>(new Map());
  const editInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts for editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingIdx !== null) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          saveEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingIdx, editForm]);

  // Focus first input when editing starts
  useEffect(() => {
    if (editingIdx !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingIdx]);

  const { issues, entryIssues, fieldIssues } = useMemo(() => validateEntries(entries), [entries]);
  const hasErrors = issues.some(i => i.type === 'error');
  const hasWarnings = issues.some(i => i.type === 'warning');

  // Helper to get field-specific styling
  const getFieldClass = (idx: number, field: FieldIssue['field']) => {
    const issues = fieldIssues.get(idx) || [];
    const fieldIssue = issues.find(i => i.field === field);
    if (!fieldIssue) return '';
    if (fieldIssue.severity === 'error') return 'ring-2 ring-destructive/50 bg-destructive/10';
    return 'ring-2 ring-yellow-500/50 bg-yellow-500/10';
  };

  const getFieldTooltip = (idx: number, field: FieldIssue['field']) => {
    const issues = fieldIssues.get(idx) || [];
    const fieldIssue = issues.find(i => i.field === field);
    return fieldIssue?.message || '';
  };

  // Get confidence color and badge for AI-inferred fields
  const getConfidenceInfo = (idx: number, field: 'category' | 'costCenter') => {
    const conf = aiConfidence.get(idx);
    if (!conf) return null;
    
    const value = field === 'category' ? conf.categoryConfidence : conf.costCenterConfidence;
    if (value === undefined) return null;
    
    if (value >= 90) return { color: 'bg-green-500', label: 'Alta', textColor: 'text-green-600' };
    if (value >= 70) return { color: 'bg-blue-500', label: 'Média', textColor: 'text-blue-600' };
    if (value >= 50) return { color: 'bg-yellow-500', label: 'Baixa', textColor: 'text-yellow-600' };
    return { color: 'bg-red-500', label: 'Incerta', textColor: 'text-red-600' };
  };

  // Filter entries based on issue filter
  const filteredEntries = useMemo(() => {
    const base = entries.slice(0, 50);
    if (issueFilter === 'all') return base;
    
    return base.filter((_, idx) => {
      const issues = fieldIssues.get(idx) || [];
      if (issueFilter === 'errors') return issues.some(i => i.severity === 'error');
      if (issueFilter === 'warnings') return issues.some(i => i.severity === 'warning');
      if (issueFilter === 'issues') return issues.length > 0;
      return true;
    });
  }, [entries, issueFilter, fieldIssues]);

  // Count issues for filter badges
  const issueCounts = useMemo(() => {
    const base = entries.slice(0, 50);
    let errors = 0;
    let warnings = 0;
    base.forEach((_, idx) => {
      const issues = fieldIssues.get(idx) || [];
      if (issues.some(i => i.severity === 'error')) errors++;
      if (issues.some(i => i.severity === 'warning')) warnings++;
    });
    return { errors, warnings, total: errors + warnings };
  }, [entries, fieldIssues]);

  const receivableCount = entries.filter(e => e.type === 'receivable').length;
  const payableCount = entries.filter(e => e.type === 'payable').length;
  const totalReceivable = entries.filter(e => e.type === 'receivable').reduce((sum, e) => sum + e.amount, 0);
  const totalPayable = entries.filter(e => e.type === 'payable').reduce((sum, e) => sum + Math.abs(e.amount), 0);
  const uniqueCategories = new Set(entries.map(e => e.category)).size;
  const dateRange = entries.length > 0 
    ? {
        min: entries.reduce((min, e) => e.competenceDate < min ? e.competenceDate : min, entries[0].competenceDate),
        max: entries.reduce((max, e) => e.competenceDate > max ? e.competenceDate : max, entries[0].competenceDate)
      }
    : null;

  const previewEntries = filteredEntries;

  const toggleRowSelection = useCallback((idx: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedRows.size === previewEntries.length && previewEntries.length > 0) {
      setSelectedRows(new Set());
    } else {
      // Get original indices for filtered entries
      const originalIndices = previewEntries.map((e) => entries.findIndex(orig => orig.id === e.id || (orig.category === e.category && orig.amount === e.amount && orig.competenceDate === e.competenceDate)));
      setSelectedRows(new Set(originalIndices.filter(i => i !== -1)));
    }
  }, [selectedRows.size, previewEntries, entries]);

  const deleteSelectedRows = useCallback(() => {
    if (!onEntriesChange || selectedRows.size === 0) return;
    const updatedEntries = entries.filter((_, idx) => !selectedRows.has(idx));
    onEntriesChange(updatedEntries);
    setSelectedRows(new Set());
  }, [entries, onEntriesChange, selectedRows]);

  const startEdit = useCallback((idx: number, entry: TransactionEntry) => {
    setEditingIdx(idx);
    setEditForm({
      type: entry.type,
      category: entry.category,
      costCenter: entry.costCenter || '',
      amount: Math.abs(entry.amount).toString(),
      date: entry.competenceDate
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingIdx(null);
    setEditForm(null);
  }, []);

  const saveEdit = useCallback(() => {
    if (editingIdx === null || !editForm || !onEntriesChange) return;
    
    const parsedAmount = parseFloat(editForm.amount) || 0;
    const signedAmount = editForm.type === 'payable' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
    
    const updatedEntries = [...entries];
    updatedEntries[editingIdx] = {
      ...updatedEntries[editingIdx],
      type: editForm.type,
      category: editForm.category.trim(),
      costCenter: editForm.costCenter.trim() || undefined,
      amount: signedAmount,
      competenceDate: editForm.date
    };
    
    onEntriesChange(updatedEntries);
    setEditingIdx(null);
    setEditForm(null);
  }, [editingIdx, editForm, entries, onEntriesChange]);

  // AI Auto-fill for missing categories and cost centers
  const autoFillWithAi = useCallback(async () => {
    if (!onEntriesChange) return;
    
    // Find entries with missing category or cost center
    const entriesToFill = entries.map((e, idx) => ({
      idx,
      entry: e,
      needsCategory: !e.category || e.category.trim() === '',
      needsCostCenter: !e.costCenter || e.costCenter.trim() === ''
    })).filter(e => e.needsCategory || e.needsCostCenter);

    if (entriesToFill.length === 0) {
      toast({
        title: "Nenhum campo vazio",
        description: "Todos os registros já possuem categoria e centro de custo."
      });
      return;
    }

    setIsAutoFilling(true);
    
    try {
      // Get existing categories for context
      const existingCategories = [...new Set(entries.filter(e => e.category).map(e => e.category))];
      
      // Prepare entries for AI
      const entriesPayload = entriesToFill.slice(0, 50).map(({ idx, entry }) => ({
        idx,
        type: entry.type,
        category: entry.category || '',
        costCenter: entry.costCenter || '',
        amount: entry.amount,
        date: entry.competenceDate
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-fill-entries`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            entries: entriesPayload,
            existingCategories 
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: "Limite de requisições",
            description: "Por favor, aguarde um momento e tente novamente.",
            variant: "destructive",
          });
          throw new Error("Rate limit exceeded");
        }
        if (response.status === 402) {
          toast({
            title: "Créditos insuficientes",
            description: "Adicione créditos para continuar usando a IA.",
            variant: "destructive",
          });
          throw new Error("Payment required");
        }
        throw new Error(`HTTP error: ${response.status}`);
      }

      const { suggestions } = await response.json();
      
      // Apply suggestions to entries and store confidence
      const updatedEntries = [...entries];
      let filledCount = 0;
      const newConfidence = new Map<number, AIConfidence>();
      
      suggestions.forEach((s: { idx: number; category: string; costCenter: string; categoryConfidence?: number; costCenterConfidence?: number }) => {
        if (updatedEntries[s.idx]) {
          const entry = updatedEntries[s.idx];
          const needsCategory = !entry.category || entry.category.trim() === '';
          const needsCostCenter = !entry.costCenter || entry.costCenter.trim() === '';
          
          // Store confidence values
          newConfidence.set(s.idx, {
            categoryConfidence: needsCategory ? s.categoryConfidence : undefined,
            costCenterConfidence: needsCostCenter ? s.costCenterConfidence : undefined
          });
          
          if (needsCategory && s.category) {
            updatedEntries[s.idx] = { ...updatedEntries[s.idx], category: s.category };
            filledCount++;
          }
          if (needsCostCenter && s.costCenter) {
            updatedEntries[s.idx] = { ...updatedEntries[s.idx], costCenter: s.costCenter };
          }
        }
      });
      
      setAiConfidence(prev => new Map([...prev, ...newConfidence]));
      onEntriesChange(updatedEntries);
      
      toast({
        title: "✨ Preenchimento automático concluído",
        description: `${filledCount} campos foram preenchidos com sugestões da IA.`
      });
    } catch (error) {
      console.error("Auto-fill error:", error);
      if (!(error instanceof Error) || (!error.message.includes("Rate limit") && !error.message.includes("Payment required"))) {
        toast({
          title: "Erro no preenchimento automático",
          description: "Não foi possível inferir os dados. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsAutoFilling(false);
    }
  }, [entries, onEntriesChange, toast]);

  const deleteEntry = useCallback((idx: number) => {
    if (!onEntriesChange) return;
    const updatedEntries = entries.filter((_, i) => i !== idx);
    onEntriesChange(updatedEntries);
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
  }, [entries, onEntriesChange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
            <FileCheck className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Prévia dos Dados Importados
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Revise e corrija os dados antes de continuar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAiParsed && (
            <Badge variant="secondary" className="gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border-primary/20">
              <Sparkles size={14} /> Processado com IA
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCsv(entries)}
            className="gap-2 rounded-xl"
          >
            <Download size={14} /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Saved Mappings Banner */}
      {pendingSavedMappings && Object.keys(pendingSavedMappings).length > 0 && (
        <Alert className="border-primary/30 bg-primary/5 rounded-2xl">
          <History className="h-5 w-5 text-primary" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="font-semibold text-foreground">Mapeamento anterior encontrado!</span>
              <span className="text-muted-foreground ml-2">
                {Object.keys(pendingSavedMappings).length} categorias podem ser mapeadas automaticamente.
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onDismissSavedMappings}
                className="rounded-xl gap-2"
              >
                <X size={14} /> Ignorar
              </Button>
              <Button
                size="sm"
                onClick={onApplySavedMappings}
                className="rounded-xl gap-2"
              >
                <RefreshCw size={14} /> Aplicar Mapeamentos
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Receitas</p>
                <p className="text-lg font-bold text-foreground">{receivableCount}</p>
                <p className="text-xs text-green-500 font-semibold">{formatCurrency(totalReceivable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Despesas</p>
                <p className="text-lg font-bold text-foreground">{payableCount}</p>
                <p className="text-xs text-red-500 font-semibold">-{formatCurrency(totalPayable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Tag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Categorias</p>
                <p className="text-lg font-bold text-foreground">{uniqueCategories}</p>
                <p className="text-xs text-muted-foreground">únicas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Período</p>
                <p className="text-sm font-bold text-foreground">
                  {dateRange ? new Date(dateRange.min).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">
                  até {dateRange ? new Date(dateRange.max).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Alerts */}
      {(hasErrors || hasWarnings) && (
        <div className="space-y-3">
          {issues.filter(i => i.type === 'error').map((issue, idx) => (
            <Alert key={`err-${idx}`} variant="destructive" className="rounded-xl border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">
                {issue.count} {issue.count === 1 ? 'registro com' : 'registros com'} {issue.message.toLowerCase()} — clique no ícone de lápis para corrigir
              </AlertDescription>
            </Alert>
          ))}
          {issues.filter(i => i.type === 'warning').map((issue, idx) => (
            <Alert key={`warn-${idx}`} className="rounded-xl border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="font-medium">
                {issue.count} {issue.count === 1 ? 'registro com' : 'registros com'} {issue.message.toLowerCase()} — verifique se está correto
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedRows.size > 0 && onEntriesChange && (
        <Card className="rounded-2xl border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">
                {selectedRows.size} {selectedRows.size === 1 ? 'linha selecionada' : 'linhas selecionadas'}
              </span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSelectedRows}
              className="gap-2 rounded-xl"
            >
              <Trash2 size={14} /> Excluir Selecionadas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Preview Table */}
      <Card className="rounded-3xl border-border/50 overflow-hidden">
        <CardHeader className="bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Dados ({previewEntries.length} de {entries.length} transações)
              {issueFilter !== 'all' && (
                <Badge variant="outline" className="ml-2 text-xs">Filtrado</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Issue Filter */}
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-muted-foreground" />
                <Select value={issueFilter} onValueChange={(v) => setIssueFilter(v as IssueFilter)}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as linhas</SelectItem>
                    <SelectItem value="issues">
                      Com problemas ({issueCounts.total})
                    </SelectItem>
                    <SelectItem value="errors">
                      Apenas erros ({issueCounts.errors})
                    </SelectItem>
                    <SelectItem value="warnings">
                      Apenas avisos ({issueCounts.warnings})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AI Auto-fill button */}
              {onEntriesChange && issueCounts.total > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={autoFillWithAi}
                  disabled={isAutoFilling}
                  className="gap-2 rounded-xl bg-primary/5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  {isAutoFilling ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Inferindo...
                    </>
                  ) : (
                    <>
                      <Wand2 size={14} /> Preencher com IA
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  {onEntriesChange && (
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedRows.size === previewEntries.length && previewEntries.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecionar todas"
                      />
                    </TableHead>
                  )}
                  <TableHead className="font-bold text-xs uppercase tracking-wide w-[100px]">Tipo</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide">Categoria</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide">Centro de Custo</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide text-right w-[120px]">Valor</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide w-[120px]">Data</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewEntries.map((entry) => {
                  // Get original index from full entries array
                  const originalIdx = entries.findIndex(e => 
                    e.id === entry.id || (e.category === entry.category && e.amount === entry.amount && e.competenceDate === entry.competenceDate)
                  );
                  const idx = originalIdx !== -1 ? originalIdx : 0;
                  const rowIssues = entryIssues.get(idx) || [];
                  const hasRowIssue = rowIssues.length > 0;
                  const isEditing = editingIdx === idx;

                  if (isEditing && editForm) {
                    return (
                      <TableRow key={entry.id || idx} className="bg-primary/5">
                        {onEntriesChange && <TableCell />}
                        <TableCell>
                          <Select
                            value={editForm.type}
                            onValueChange={(v) => setEditForm({ ...editForm, type: v as 'receivable' | 'payable' })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="receivable">Receita</SelectItem>
                              <SelectItem value="payable">Despesa</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            ref={editInputRef}
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="h-8 text-sm"
                            placeholder="Categoria"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editForm.costCenter}
                            onChange={(e) => setEditForm({ ...editForm, costCenter: e.target.value })}
                            className="h-8 text-sm"
                            placeholder="Centro de Custo"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                            className="h-8 text-sm text-right"
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow 
                      key={entry.id || idx} 
                      className={`hover:bg-muted/10 ${hasRowIssue ? 'bg-yellow-500/5' : ''} ${selectedRows.has(idx) ? 'bg-primary/10' : ''}`}
                    >
                      {onEntriesChange && (
                        <TableCell>
                          <Checkbox 
                            checked={selectedRows.has(idx)}
                            onCheckedChange={() => toggleRowSelection(idx)}
                            aria-label={`Selecionar linha ${idx + 1}`}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] font-bold uppercase ${
                            entry.amount < 0 || entry.type === 'payable'
                              ? 'bg-red-500/10 text-red-600 border-red-500/30' 
                              : 'bg-green-500/10 text-green-600 border-green-500/30'
                          }`}
                        >
                          {entry.amount < 0 || entry.type === 'payable' ? 'Saída' : 'Entrada'}
                        </Badge>
                      </TableCell>
                      <TableCell 
                        className={`font-medium text-sm max-w-[200px] truncate rounded-md px-2 py-1 ${getFieldClass(idx, 'category')} ${!entry.category ? 'text-destructive italic' : ''}`} 
                        title={getFieldTooltip(idx, 'category') || entry.category || 'Categoria vazia'}
                      >
                        <div className="flex items-center gap-1">
                          {!entry.category && <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />}
                          <span className="truncate">{entry.category || '(vazio)'}</span>
                          {getConfidenceInfo(idx, 'category') && (
                            <span 
                              className={`flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${getConfidenceInfo(idx, 'category')!.textColor} bg-current/10`}
                              title={`Confiança IA: ${aiConfidence.get(idx)?.categoryConfidence}%`}
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              {aiConfidence.get(idx)?.categoryConfidence}%
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell 
                        className={`text-sm rounded-md px-2 py-1 ${getFieldClass(idx, 'costCenter')} ${!entry.costCenter ? 'text-muted-foreground/50 italic' : 'text-muted-foreground'}`}
                        title={getFieldTooltip(idx, 'costCenter') || entry.costCenter || 'Centro de custo vazio'}
                      >
                        <div className="flex items-center gap-1">
                          {!entry.costCenter && <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
                          <span className="truncate">{entry.costCenter || '(vazio)'}</span>
                          {getConfidenceInfo(idx, 'costCenter') && (
                            <span 
                              className={`flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${getConfidenceInfo(idx, 'costCenter')!.textColor} bg-current/10`}
                              title={`Confiança IA: ${aiConfidence.get(idx)?.costCenterConfidence}%`}
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              {aiConfidence.get(idx)?.costCenterConfidence}%
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell 
                        className={`text-right font-bold rounded-md px-2 py-1 ${getFieldClass(idx, 'amount')} ${entry.amount === 0 ? 'text-yellow-600' : entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        title={getFieldTooltip(idx, 'amount')}
                      >
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell 
                        className={`text-sm rounded-md px-2 py-1 ${getFieldClass(idx, 'date')} ${isNaN(new Date(entry.competenceDate).getTime()) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
                        title={getFieldTooltip(idx, 'date')}
                      >
                        <div className="flex items-center gap-1">
                          {isNaN(new Date(entry.competenceDate).getTime()) && <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />}
                          {isNaN(new Date(entry.competenceDate).getTime()) 
                            ? 'Inválida' 
                            : new Date(entry.competenceDate).toLocaleDateString('pt-BR')
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 items-center">
                          {onEntriesChange && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(idx, entry)}>
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteEntry(idx)}>
                                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </>
                          )}
                          {hasRowIssue && (
                            <div className="relative group ml-1">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded-lg shadow-lg border whitespace-nowrap">
                                {rowIssues.join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
          {entries.length > 50 && (
            <div className="px-6 py-3 bg-muted/20 text-center">
              <p className="text-xs text-muted-foreground font-medium">
                ... e mais {entries.length - 50} transações (edite após importar se necessário)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {hasErrors && <span className="text-destructive font-medium">Corrija os erros antes de continuar</span>}
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="rounded-xl px-6 gap-2"
          >
            <X size={16} /> Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={hasErrors}
            className="rounded-xl px-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Confirmar e Mapear <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};