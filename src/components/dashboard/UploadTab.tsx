import { Upload, Loader2, Database, Sparkles, LayoutDashboard, BarChart3, CheckCircle2, ChevronRight, Download, FileSpreadsheet, History, Trash2, Clock, ArrowRight, Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useImportHistory } from '@/hooks/useImportHistory';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
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
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 xl:grid-cols-12 gap-12"
    >
      {/* Main Upload Card */}
      <motion.div variants={itemVariants} className="xl:col-span-8 space-y-10">
        <Card className="rounded-[3rem] p-12 md:p-16 border border-border/20 shadow-2xl relative overflow-hidden bg-card/40 backdrop-blur-xl">
          <CardContent className="p-0 relative z-10">
            {/* Hero Section */}
            <div className="mb-14 text-left">
              <motion.div 
                className="inline-flex items-center gap-2.5 px-5 py-2 bg-gradient-to-r from-primary/15 to-secondary/15 text-primary rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-8 border border-primary/25 shadow-lg shadow-primary/10"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Upload size={14} /> Data Processing
              </motion.div>
              <motion.h2 
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Importe sua <br/>
                <span className="bg-gradient-to-r from-primary via-secondary to-accent-foreground bg-clip-text text-transparent">
                  visão financeira.
                </span>
              </motion.h2>
              <motion.p 
                className="text-muted-foreground text-lg md:text-xl max-w-lg font-medium leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Conecte seus dados brutos para desbloquear diagnósticos táticos e previsões estratégicas.
              </motion.p>
            </div>

            {/* Upload Area */}
            <motion.label 
              className={`group flex flex-col items-center justify-center h-80 border-2 border-dashed border-border/30 bg-gradient-to-b from-card/60 to-muted/10 rounded-[2.5rem] cursor-pointer hover:border-primary/40 hover:from-primary/5 hover:to-secondary/5 transition-all duration-500 relative overflow-hidden ${isParsing ? 'pointer-events-none' : ''}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.01 }}
            >
              <input type="file" accept=".csv" onChange={onCsvUpload} className="hidden" disabled={isParsing} />
              
              {/* Decorative gradient orbs */}
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <AnimatePresence mode="wait">
                {isParsing ? (
                  <motion.div 
                    key="parsing"
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative">
                      <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Database size={20} className="text-primary" />
                      </div>
                    </div>
                    <p className="text-primary font-bold text-sm uppercase tracking-[0.25em] animate-pulse">
                      Parseando transações...
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="upload"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-24 h-24 bg-gradient-to-br from-card via-card to-muted rounded-[2rem] shadow-2xl flex items-center justify-center text-primary mb-8 group-hover:scale-110 group-hover:shadow-primary/20 transition-all duration-500 border border-border/30">
                      <Upload size={36} strokeWidth={1.5} />
                    </div>
                    <p className="text-2xl font-bold text-foreground tracking-tight mb-2">
                      Arraste seu arquivo CSV
                    </p>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-70 mb-6">
                      Qualquer formato • IA corrige automaticamente
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); downloadSampleCsv(); }}
                      className="text-primary hover:text-primary/80 gap-2 hover:bg-primary/10 rounded-xl"
                    >
                      <Download size={14} /> Baixar modelo CSV
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.label>

            {/* AI Feature Banner */}
            <motion.div 
              className="mt-12 p-8 bg-gradient-to-r from-foreground via-foreground/95 to-secondary/90 rounded-[2rem] text-background flex items-center gap-8 shadow-2xl relative overflow-hidden group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-xl">
                <Sparkles size={28} className="text-primary-foreground" fill="currentColor" />
              </div>
              <div className="relative z-10 flex-1">
                <h4 className="font-bold text-base uppercase tracking-[0.2em] mb-2 text-primary-foreground">
                  Parsing Inteligente com IA
                </h4>
                <p className="text-sm text-muted opacity-80 leading-relaxed font-medium">
                  Nossa IA analisa qualquer formato CSV e converte automaticamente para o padrão do sistema.
                </p>
              </div>
              <ArrowRight size={24} className="text-muted-foreground opacity-50 group-hover:translate-x-2 transition-transform" />
              <div className="absolute right-0 bottom-0 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
                <LayoutDashboard size={180} />
              </div>
            </motion.div>
          </CardContent>
          
          {/* Background decorative elements */}
          <div className="absolute -top-60 -right-60 w-[40rem] h-[40rem] bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/5 rounded-full blur-[80px] pointer-events-none" />
        </Card>
      </motion.div>

      {/* Sidebar */}
      <motion.div variants={itemVariants} className="xl:col-span-4 space-y-8">
        {/* Privacy Card */}
        <Card className="rounded-[2.5rem] p-10 border border-border/20 shadow-2xl bg-card/40 backdrop-blur-xl relative overflow-hidden group">
          <CardContent className="p-0">
            <div className="w-16 h-16 bg-gradient-to-br from-secondary/20 to-primary/10 text-secondary rounded-2xl flex items-center justify-center mb-8 shadow-lg border border-secondary/20 group-hover:scale-110 transition-transform duration-500">
              <Shield size={28} />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-5 tracking-tight">
              Privacidade Total
            </h3>
            <p className="text-muted-foreground mb-10 leading-relaxed font-medium text-sm">
              Seus dados financeiros não saem do seu dispositivo. O processamento é 100% local, garantindo compliance e segurança absoluta.
            </p>
            <Button 
              onClick={onLoadDemo}
              disabled={isParsing}
              variant="premium"
              className="w-full py-6 h-auto rounded-2xl font-bold text-[11px] tracking-[0.2em]"
            >
              <Zap size={16} className="mr-2" />
              INICIAR DEMONSTRAÇÃO
            </Button>
          </CardContent>
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-secondary/5 rounded-full blur-[60px] pointer-events-none" />
        </Card>

        {/* Premium Features Card */}
        <Card className="bg-gradient-to-br from-primary via-primary to-secondary rounded-[2.5rem] p-10 text-primary-foreground shadow-2xl shadow-primary/25 relative overflow-hidden group border-0">
          <CardContent className="p-0 relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <h3 className="text-2xl font-bold tracking-tight">Dashboard Pro</h3>
              <span className="px-3 py-1 bg-background/20 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
                Premium
              </span>
            </div>
            <div className="space-y-5">
              {[
                'Cálculo MoM Automático',
                'EBITDA por Centro de Custo',
                'Plano de Ação por IA',
                'Mapeamento Inteligente'
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  className="flex items-center gap-4 group/item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <div className="w-8 h-8 rounded-xl bg-background/15 flex items-center justify-center group-hover/item:bg-background group-hover/item:text-primary transition-all duration-300 backdrop-blur-sm">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">{item}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
          <BarChart3 size={200} className="absolute -right-12 -bottom-12 opacity-[0.08] group-hover:scale-110 group-hover:rotate-6 transition-transform duration-1000" />
        </Card>

        {/* Import History */}
        {history.length > 0 && (
          <Card className="rounded-[2rem] p-8 border border-border/20 shadow-xl bg-card/40 backdrop-blur-xl">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-muted to-muted/50 rounded-xl flex items-center justify-center border border-border/20">
                    <History size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">Histórico</h3>
                    <p className="text-xs text-muted-foreground">{history.length} arquivos</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="text-muted-foreground hover:text-destructive text-xs rounded-xl"
                >
                  Limpar
                </Button>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {history.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-muted/20 rounded-xl group hover:bg-muted/40 transition-all duration-200 border border-transparent hover:border-border/20"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet size={16} className="text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{entry.filename}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock size={10} />
                          <span>{formatDate(entry.timestamp)}</span>
                          <Badge variant="secondary" className="text-[9px] px-2 py-0 rounded-lg">
                            {entry.entryCount} linhas
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
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
      </motion.div>
    </motion.div>
  );
};
