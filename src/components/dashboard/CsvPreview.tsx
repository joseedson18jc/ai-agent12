import { motion } from 'framer-motion';
import { FileCheck, ArrowRight, X, Sparkles, TrendingUp, TrendingDown, Calendar, Tag, AlertTriangle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TransactionEntry } from '@/types/finance';
import { formatCurrency } from '@/utils/finance';
import { useMemo } from 'react';

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

export const CsvPreview = ({ entries, isAiParsed, onConfirm, onCancel }: CsvPreviewProps) => {
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

  // Show first 20 entries for preview
  const previewEntries = entries.slice(0, 20);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
            <FileCheck className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Prévia dos Dados Importados
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Revise os dados antes de continuar para o mapeamento
            </p>
          </div>
        </div>
        {isAiParsed && (
          <Badge variant="secondary" className="gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border-primary/20">
            <Sparkles size={14} /> Processado com IA
          </Badge>
        )}
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
                <Calendar className="w-5 h-5 text-secondary" />
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
                {issue.count} {issue.count === 1 ? 'registro com' : 'registros com'} {issue.message.toLowerCase()}
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
            <span>Amostra dos Dados ({previewEntries.length} de {entries.length} transações)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="font-bold text-xs uppercase tracking-wide">Tipo</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide">Categoria</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide">Centro de Custo</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide text-right">Valor</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide">Data</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wide w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewEntries.map((entry, idx) => {
                  const rowIssues = entryIssues.get(idx) || [];
                  const hasRowIssue = rowIssues.length > 0;
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
                          {entry.type === 'receivable' ? 'Receber' : 'Pagar'}
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
                          ? 'Data inválida' 
                          : new Date(entry.competenceDate).toLocaleDateString('pt-BR')
                        }
                      </TableCell>
                      <TableCell>
                        {hasRowIssue && (
                          <div className="relative group">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded-lg shadow-lg border whitespace-nowrap">
                              {rowIssues.join(', ')}
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
          {entries.length > 20 && (
            <div className="px-6 py-3 bg-muted/20 text-center">
              <p className="text-xs text-muted-foreground font-medium">
                ... e mais {entries.length - 20} transações
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
