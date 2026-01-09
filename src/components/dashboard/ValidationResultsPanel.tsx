import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ChevronDown,
  ChevronUp,
  FileWarning,
  Calendar,
  Hash,
  Copy,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ValidationResult } from '@/hooks/useDataValidation';

interface ValidationResultsPanelProps {
  result: ValidationResult;
  totalEntries: number;
  onDismiss: () => void;
}

export const ValidationResultsPanel = ({ result, totalEntries, onDismiss }: ValidationResultsPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const hasIssues = result.errors.length > 0 || result.warnings.length > 0;
  
  if (!hasIssues) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className="border-green-500/30 bg-green-500/5 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-500" />
                </div>
                <div>
                  <p className="font-bold text-green-600 dark:text-green-400">
                    Validação Concluída
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {totalEntries} registros validados sem problemas
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Fechar
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'missing_field': return <FileWarning size={14} />;
      case 'invalid_format': return <Calendar size={14} />;
      case 'suspicious_value': 
      case 'unusual_value': return <TrendingDown size={14} />;
      case 'duplicate':
      case 'possible_duplicate': return <Copy size={14} />;
      default: return <Hash size={14} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error': return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'warning': return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    }
  };

  const criticalErrors = result.errors.filter(e => e.severity === 'critical');
  const regularErrors = result.errors.filter(e => e.severity === 'error');
  const validRows = totalEntries - criticalErrors.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className={`rounded-2xl border ${criticalErrors.length > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${criticalErrors.length > 0 ? 'bg-destructive/20' : 'bg-yellow-500/20'}`}>
                {criticalErrors.length > 0 ? (
                  <XCircle size={20} className="text-destructive" />
                ) : (
                  <AlertTriangle size={20} className="text-yellow-500" />
                )}
              </div>
              <div>
                <CardTitle className={`text-lg ${criticalErrors.length > 0 ? 'text-destructive' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {criticalErrors.length > 0 ? 'Problemas Encontrados' : 'Avisos de Validação'}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {totalEntries} registros • {result.errors.length} erros • {result.warnings.length} avisos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </Button>
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Fechar
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="p-6 pt-0 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total</p>
                    <p className="text-xl font-bold text-foreground">{totalEntries}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                    <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Válidos</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{validRows}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30">
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">Erros</p>
                    <p className="text-xl font-bold text-destructive">{result.errors.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-widest">Avisos</p>
                    <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{result.warnings.length}</p>
                  </div>
                </div>

                {/* Issues List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.errors.map((error, idx) => (
                    <div 
                      key={`error-${idx}`}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${getSeverityColor(error.severity)}`}
                    >
                      <span className="mt-0.5">{getIssueIcon(error.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{error.message}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {error.severity === 'critical' ? 'CRÍTICO' : 'ERRO'}
                      </Badge>
                    </div>
                  ))}
                  {result.warnings.map((warning, idx) => (
                    <div 
                      key={`warning-${idx}`}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${getSeverityColor('warning')}`}
                    >
                      <span className="mt-0.5">{getIssueIcon(warning.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{warning.message}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        AVISO
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};
