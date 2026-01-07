import { Upload, Loader2, Database, Sparkles, LayoutDashboard, BarChart3, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UploadTabProps {
  isParsing: boolean;
  onCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadDemo: () => void;
}

export const UploadTab = ({ isParsing, onCsvUpload, onLoadDemo }: UploadTabProps) => {
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
      </div>
    </motion.div>
  );
};
