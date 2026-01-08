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
      className="grid grid-cols-1 xl:grid-cols-12 gap-10"
    >
      <div className="xl:col-span-8 space-y-8">
        <Card className="rounded-[2.5rem] p-10 md:p-14 border border-border/30 shadow-2xl relative overflow-hidden bg-card/60 backdrop-blur-sm">
          <CardContent className="p-0 relative z-10">
            <div className="mb-12 text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-primary/10 to-secondary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border border-primary/20">
                <Upload size={12} /> Data Processing
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight mb-5">
                Importe sua <br/>
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">visão financeira.</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-md font-medium leading-relaxed">
                Conecte seus dados brutos para desbloquear diagnósticos táticos e previsões estratégicas.
              </p>
            </div>

            <label className={`group flex flex-col items-center justify-center h-72 border-2 border-dashed border-border/50 bg-gradient-to-b from-card/80 to-muted/20 rounded-[2rem] cursor-pointer hover:border-primary/50 hover:from-primary/5 hover:to-secondary/5 transition-all duration-500 relative overflow-hidden ${isParsing ? 'pointer-events-none' : ''}`}>
              <input type="file" accept=".csv" onChange={onCsvUpload} className="hidden" disabled={isParsing} />
              
              {/* Decorative gradient orb */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <AnimatePresence mode="wait">
                {isParsing ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                    <div className="relative">
                      <Loader2 className="w-14 h-14 text-primary animate-spin mb-5" />
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
                    <div className="w-20 h-20 bg-gradient-to-br from-card to-muted rounded-3xl shadow-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:shadow-primary/20 transition-all duration-500 border border-border/50">
                      <Upload size={32} strokeWidth={1.5} />
                    </div>
                    <p className="text-xl font-bold text-foreground tracking-tight">
                      Arraste seu arquivo CSV
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 font-medium uppercase tracking-widest opacity-70">
                      Qualquer formato • IA corrige automaticamente
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); downloadSampleCsv(); }}
                      className="mt-5 text-primary hover:text-primary/80 gap-2 hover:bg-primary/10"
                    >
                      <Download size={14} /> Baixar modelo CSV
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </label>

            <div className="mt-10 p-7 bg-gradient-to-r from-foreground to-foreground/90 rounded-[1.5rem] text-background flex items-center gap-6 shadow-2xl relative overflow-hidden group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                <Sparkles size={24} className="text-primary-foreground" fill="currentColor" />
              </div>
              <div className="relative z-10 flex-1">
                <h4 className="font-bold text-sm uppercase tracking-widest mb-1.5 text-primary-foreground">
                  Parsing Inteligente com IA
                </h4>
                <p className="text-sm text-muted opacity-80 leading-relaxed font-medium">
                  Nossa IA analisa qualquer formato CSV e converte automaticamente para o padrão do sistema.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
                <LayoutDashboard size={150} />
              </div>
            </div>
          </CardContent>
          
          {/* Background decorative elements */}
          <div className="absolute -top-40 -right-40 w-[30rem] h-[30rem] bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
        </Card>
      </div>

      <div className="xl:col-span-4 space-y-8">
        <Card className="rounded-[2rem] p-10 border border-border/30 shadow-xl bg-card/60 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="w-14 h-14 bg-gradient-to-br from-secondary/20 to-primary/10 text-secondary rounded-2xl flex items-center justify-center mb-7 shadow-inner border border-secondary/20">
              <Database size={26} />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4 tracking-tight">
              Privacidade Total
            </h3>
            <p className="text-muted-foreground mb-8 leading-relaxed font-medium text-sm">
              Seus dados financeiros não saem do seu dispositivo. O processamento é 100% local, garantindo compliance e segurança absoluta.
            </p>
            <Button 
              onClick={onLoadDemo}
              disabled={isParsing}
              variant="premium"
              className="w-full py-5 h-auto rounded-2xl font-bold text-[11px] tracking-[0.15em]"
            >
              INICIAR DEMONSTRAÇÃO <ChevronRight size={18} />
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary via-primary to-secondary rounded-[2rem] p-10 text-primary-foreground shadow-2xl shadow-primary/20 relative overflow-hidden group border-0">
          <CardContent className="p-0 relative z-10">
            <div className="flex items-center gap-3 mb-7">
              <h3 className="text-2xl font-bold tracking-tight">Dashboard Pro</h3>
              <span className="px-2 py-0.5 bg-background/20 rounded-full text-[9px] font-bold uppercase tracking-wider">
                Premium
              </span>
            </div>
            <div className="space-y-5">
              {[
                'Cálculo MoM Automático',
                'EBITDA por Centro de Custo',
                'Plano de Ação Sugerido por IA',
                'Mapeamento Inteligente'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 group/item">
                  <div className="w-7 h-7 rounded-lg bg-background/15 flex items-center justify-center group-hover/item:bg-background group-hover/item:text-primary transition-all duration-300 backdrop-blur-sm">
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <BarChart3 size={180} className="absolute -right-10 -bottom-10 opacity-[0.08] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-1000" />
        </Card>

        {/* Import History */}
        {history.length > 0 && (
          <Card className="rounded-[1.5rem] p-7 border border-border/30 shadow-lg bg-card/60 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-muted to-muted/50 rounded-xl flex items-center justify-center border border-border/30">
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
                  className="text-muted-foreground hover:text-destructive text-xs rounded-lg"
                >
                  Limpar
                </Button>
              </div>
              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {history.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-xl group hover:bg-muted/40 transition-all duration-200 border border-transparent hover:border-border/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet size={16} className="text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{entry.filename}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock size={10} />
                          <span>{formatDate(entry.timestamp)}</span>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-md">
                            {entry.entryCount} linhas
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
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
