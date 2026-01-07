import { motion } from 'framer-motion';
import { FileCheck, ArrowRight, X, Sparkles, TrendingUp, TrendingDown, Calendar, Tag, AlertTriangle, AlertCircle, Download, Pencil, Check, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionEntry } from '@/types/finance';
import { formatCurrency } from '@/utils/finance';
import { useMemo, useState, useCallback } from 'react';

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
}

const validateEntries = (entries: TransactionEntry[]): { issues: ValidationIssue[], entryIssues: Map<number, string[]> } => {
  const issues: ValidationIssue[] = [];
  const entryIssues = new Map<number, string[]>();

  const invalidDates = entries.filter((e, idx) => {
    const date = new Date(e.competenceDate);
    const invalid = isNaN(date.getTime());
    if (invalid) entryIssues.set(idx, [...(entryIssues.get(idx) || []), 'Data inválida']);
    return invalid;
  });
  if (invalidDates.length > 0) {
    issues.push({ type: 'error', message: 'Datas inválidas', count: invalidDates.length });
  }

  const emptyCategories = entries.filter((e, idx) => {
    const empty = !e.category || e.category.trim() === '';
    if (empty) entryIssues.set(idx, [...(entryIssues.get(idx) || []), 'Categoria vazia']);
    return empty;
  });
  if (emptyCategories.length > 0) {
    issues.push({ type: 'error', message: 'Categorias vazias', count: emptyCategories.length });
  }

  const zeroValues = entries.filter((e, idx) => {
    const isZero = e.amount === 0;
    if (isZero) entryIssues.set(idx, [...(entryIssues.get(idx) || []), 'Valor zero']);
    return isZero;
  });
  if (zeroValues.length > 0) {
    issues.push({ type: 'warning', message: 'Valores zerados', count: zeroValues.length });
  }

  const largeValues = entries.filter((e, idx) => {
    const isLarge = Math.abs(e.amount) > 1000000;
    if (isLarge) entryIssues.set(idx, [...(entryIssues.get(idx) || []), 'Valor atípico']);
    return isLarge;
  });
  if (largeValues.length > 0) {
    issues.push({ type: 'warning', message: 'Valores acima de R$ 1M', count: largeValues.length });
  }

  const futureDates = entries.filter((e, idx) => {
    const date = new Date(e.competenceDate);
    const isFuture = date > new Date();
    if (isFuture) entryIssues.set(idx, [...(entryIssues.get(idx) || []), 'Data futura']);
    return isFuture;
  });
  if (futureDates.length > 0) {
    issues.push({ type: 'warning', message: 'Datas futuras', count: futureDates.length });
  }

  return { issues, entryIssues };
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

export const CsvPreview = ({ entries, isAiParsed, onConfirm, onCancel, onEntriesChange }: CsvPreviewProps) => {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    type: 'receivable' | 'payable';
    category: string;
    costCenter: string;
    amount: string;
    date: string;
  } | null>(null);

  const { issues, entryIssues } = useMemo(() => validateEntries(entries), [entries]);
  const hasErrors = issues.some(i => i.type === 'error');
  const hasWarnings = issues.some(i => i.type === 'warning');

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

  const previewEntries = entries.slice(0, 50);

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

  const deleteEntry = useCallback((idx: number) => {
    if (!onEntriesChange) return;
    const updatedEntries = entries.filter((_, i) => i !== idx);
    onEntriesChange(updatedEntries);
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

      {/* Data Preview Table */}
      <Card className="rounded-3xl border-border/50 overflow-hidden">
        <CardHeader className="bg-muted/30 px-6 py-4">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span>Dados ({previewEntries.length} de {entries.length} transações)</span>
            {onEntriesChange && (
              <span className="text-xs font-normal normal-case">Clique no lápis para editar</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="font-bold text-xs uppercase tracking-wide w-[100px]">Tipo</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide">Categoria</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide">Centro de Custo</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide text-right w-[120px]">Valor</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide w-[120px]">Data</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewEntries.map((entry, idx) => {
                  const rowIssues = entryIssues.get(idx) || [];
                  const hasRowIssue = rowIssues.length > 0;
                  const isEditing = editingIdx === idx;

                  if (isEditing && editForm) {
                    return (
                      <TableRow key={entry.id || idx} className="bg-primary/5">
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
                      className={`hover:bg-muted/10 ${hasRowIssue ? 'bg-yellow-500/5' : ''}`}
                    >
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] font-bold uppercase ${
                            entry.type === 'receivable' 
                              ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                              : 'bg-red-500/10 text-red-600 border-red-500/30'
                          }`}
                        >
                          {entry.type === 'receivable' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`font-medium text-sm max-w-[200px] truncate ${!entry.category ? 'text-destructive italic' : ''}`} title={entry.category || 'Categoria vazia'}>
                        {entry.category || '(vazio)'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {entry.costCenter || '-'}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${entry.amount === 0 ? 'text-yellow-600' : entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell className={`text-sm ${isNaN(new Date(entry.competenceDate).getTime()) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {isNaN(new Date(entry.competenceDate).getTime()) 
                          ? 'Inválida' 
                          : new Date(entry.competenceDate).toLocaleDateString('pt-BR')
                        }
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