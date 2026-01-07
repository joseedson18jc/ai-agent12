import { Upload, Loader2, Database, Sparkles, LayoutDashboard, BarChart3, CheckCircle2, ChevronRight, Download, FileSpreadsheet, History, Trash2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useImportHistory, ImportHistoryEntry } from '@/hooks/useImportHistory';
import { Badge } from '@/components/ui/badge';

interface UploadTabProps {
  isParsing: boolean;
  onCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadDemo: () => void;
}

const SAMPLE_CSV_CONTENT = `Tipo,Categoria,Centro de Custo,Valor,Data
Receita,Vendas de Produtos,Comercial,15000.00,2024-01-15
Receita,Prestação de Serviços,Comercial,8500.50,2024-01-20
Despesa,Salários,RH,12000.00,2024-01-31
Despesa,Aluguel,Administrativo,3500.00,2024-01-05
Despesa,Marketing Digital,Marketing,2800.00,2024-01-10
Receita,Consultoria,Comercial,5000.00,2024-02-01
Despesa,Energia Elétrica,Administrativo,850.00,2024-02-05
Despesa,Internet e Telefone,TI,450.00,2024-02-10`;

const downloadSampleCsv = () => {
  const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo_dre.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const UploadTab = ({ isParsing, onCsvUpload, onLoadDemo }: UploadTabProps) => {
  const { history, deleteEntry, clearHistory } = useImportHistory();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div 
      key="upload"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="grid grid-cols-1 xl:grid-cols-12 gap-12"
    >
      <div className="xl:col-span-8 space-y-10">
        <Card className="rounded-[3rem] p-12 md:p-16 border border-border/50 shadow-2xl relative overflow-hidden bg-card/50">
          <CardContent className="p-0 relative z-10">
            <div className="mb-14 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border border-primary/20">
                <Upload size={12} /> Data Processing
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight mb-6">
                Importe sua <br/>visão financeira.
              </h2>
              <p className="text-muted-foreground text-lg max-w-md font-medium leading-relaxed">
                Conecte seus dados brutos para desbloquear diagnósticos táticos e previsões estratégicas.
              </p>
            </div>

            <label className={`flex flex-col items-center justify-center h-80 border-2 border-dashed border-border bg-card/50 rounded-[2.5rem] cursor-pointer hover:bg-primary/5 hover:border-primary transition-all group relative overflow-hidden ${isParsing ? 'pointer-events-none' : ''}`}>
              <input type="file" accept=".csv" onChange={onCsvUpload} className="hidden" disabled={isParsing} />
              <AnimatePresence mode="wait">
                {isParsing ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                    <div className="relative">
                      <Loader2 className="w-14 h-14 text-primary animate-spin mb-6" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Database size={18} className="text-primary" />
                      </div>
                    </div>
                    <p className="text-primary font-bold text-sm uppercase tracking-[0.2em] animate-pulse">
                      Parseando transações...
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-20 h-20 bg-card rounded-3xl shadow-xl flex items-center justify-center text-primary mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                      <Upload size={32} />
                    </div>
                    <p className="text-xl font-bold text-foreground tracking-tight">
                      Arraste seu arquivo CSV
                    </p>
                    <p className="text-xs text-muted-foreground mt-2.5 font-bold uppercase tracking-widest opacity-60">
                      Qualquer formato • IA corrige automaticamente
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); downloadSampleCsv(); }}
                      className="mt-4 text-primary hover:text-primary/80 gap-2"
                    >
                      <Download size={14} /> Baixar modelo CSV
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </label>

            <div className="mt-12 p-8 bg-foreground rounded-[2rem] text-background flex items-center gap-8 shadow-2xl relative overflow-hidden group">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Sparkles size={24} className="text-primary-foreground" fill="currentColor" />
              </div>
              <div className="relative z-10">
                <h4 className="font-bold text-sm uppercase tracking-widest mb-1 text-primary">
                  Parsing Inteligente com IA
                </h4>
                <p className="text-xs text-muted leading-relaxed font-medium">
                  Nossa IA analisa qualquer formato CSV e converte automaticamente para o padrão do sistema.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-5 group-hover:scale-125 transition-transform duration-1000">
                <LayoutDashboard size={120} />
              </div>
            </div>
          </CardContent>
          <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        </Card>
      </div>

      <div className="xl:col-span-4 space-y-10">
        <Card className="glass-card rounded-[3rem] p-12 border border-border/50 shadow-xl">
          <CardContent className="p-0">
            <div className="w-14 h-14 bg-secondary/20 text-secondary rounded-2xl flex items-center justify-center mb-8 shadow-inner">
              <Database size={26} />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-5 tracking-tight uppercase">
              Privacidade Total
            </h3>
            <p className="text-muted-foreground mb-10 leading-relaxed font-medium text-sm">
              Seus dados financeiros não saem do seu dispositivo. O processamento é 100% local, garantindo compliance e segurança absoluta.
            </p>
            <Button 
              onClick={onLoadDemo}
              disabled={isParsing}
              className="w-full py-5 h-auto bg-secondary text-secondary-foreground rounded-2xl font-bold text-[11px] tracking-[0.2em] hover:bg-secondary/90 transition-all shadow-xl flex items-center justify-center gap-4"
            >
              INICIAR DEMONSTRAÇÃO <ChevronRight size={18} />
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary to-secondary rounded-[3rem] p-12 text-primary-foreground shadow-2xl relative overflow-hidden group border-0">
          <CardContent className="p-0 relative z-10">
            <h3 className="text-2xl font-bold mb-8 tracking-tight uppercase">Dashboard Pro</h3>
            <div className="space-y-6 opacity-90">
              {[
                'Cálculo MoM Automático',
                'EBITDA por Centro de Custo',
                'Plano de Ação Sugerido por IA',
                'Mapeamento Inteligente'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 group/item">
                  <div className="w-6 h-6 rounded-lg bg-background/20 flex items-center justify-center group-hover/item:bg-background group-hover/item:text-primary transition-all">
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <BarChart3 size={200} className="absolute -right-12 -bottom-12 opacity-10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-1000" />
        </Card>

        {/* Import History */}
        {history.length > 0 && (
          <Card className="rounded-[2rem] p-8 border border-border/50 shadow-lg bg-card/50">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                    <History size={18} className="text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">Histórico de Importações</h3>
                    <p className="text-xs text-muted-foreground">{history.length} arquivos anteriores</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="text-muted-foreground hover:text-destructive text-xs"
                >
                  Limpar
                </Button>
              </div>
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {history.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl group hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet size={16} className="text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{entry.filename}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock size={10} />
                          <span>{formatDate(entry.timestamp)}</span>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            {entry.entryCount} linhas
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteEntry(entry.id)}
                    >
                      <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
};
