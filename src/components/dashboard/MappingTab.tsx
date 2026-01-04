import { Settings2, Wand2, Loader2, ChevronRight, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionEntry, BPSection, BP_SECTIONS } from '@/types/finance';
import { getCategoryKey, formatCurrency } from '@/utils/finance';

interface MappingTabProps {
  entries: TransactionEntry[];
  mappings: Record<string, BPSection>;
  isAutoMapping: boolean;
  onMapEntry: (categoryKey: string, bpSection: BPSection) => void;
  onAutoMap: () => void;
  onFinish: () => void;
}

export const MappingTab = ({ 
  entries, 
  mappings, 
  isAutoMapping, 
  onMapEntry, 
  onAutoMap,
  onFinish 
}: MappingTabProps) => {
  const getUniqueCategoryKeys = () => {
    const keys = new Set<string>();
    const unique: TransactionEntry[] = [];
    for (const e of entries) {
      const key = getCategoryKey(e.category, e.costCenter);
      if (!keys.has(key)) {
        keys.add(key);
        unique.push(e);
      }
    }
    return unique;
  };

  const uniqueEntries = getUniqueCategoryKeys();
  const totalUniqueKeys = new Set(entries.map(e => getCategoryKey(e.category, e.costCenter))).size;
  const mappedCount = Array.from(new Set(entries.map(e => getCategoryKey(e.category, e.costCenter)))).filter(k => mappings[k]).length;
  const mappingProgress = Math.round((mappedCount / totalUniqueKeys) * 100);

  return (
    <motion.div 
      key="mapping"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="space-y-10"
    >
      <Card className="glass-card rounded-[3rem] p-10 md:p-14 border border-border/50 shadow-2xl">
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-16">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted text-muted-foreground rounded-full text-[10px] font-bold uppercase tracking-widest border border-border">
                <Settings2 size={12} /> Account Mapping
              </div>
              <h2 className="text-4xl font-bold text-foreground tracking-tight leading-none">
                Estruturação de Plano.
              </h2>
              <p className="text-muted-foreground font-medium max-w-lg">
                Relacione as categorias do seu extrato com a estrutura padrão do DRE gerencial.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
              <div className="bg-muted p-6 rounded-[2rem] border border-border/50 min-w-[300px] shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Progresso de Mapeamento
                  </span>
                  <span className="text-sm font-bold text-foreground">{mappingProgress}%</span>
                </div>
                <div className="h-2.5 w-full bg-border rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${mappingProgress}%` }}
                    className="h-full bg-primary shadow-lg"
                    style={{ boxShadow: '0 0 10px hsl(var(--primary) / 0.5)' }}
                  />
                </div>
              </div>
              <Button 
                onClick={onAutoMap}
                disabled={isAutoMapping}
                className="h-full px-8 bg-foreground text-background rounded-[2rem] font-bold text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 transition-all shadow-xl"
              >
                {isAutoMapping ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                AUTO-MAPEAR
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {uniqueEntries.map((entry) => {
              const key = getCategoryKey(entry.category, entry.costCenter);
              const total = entries.filter(e => getCategoryKey(e.category, e.costCenter) === key).reduce((s, e) => s + e.amount, 0);
              const isMapped = !!mappings[key];
              
              return (
                <motion.div 
                  key={key} 
                  layout
                  className={`p-7 rounded-[2.5rem] border transition-all duration-300 ${isMapped ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30 hover:bg-card hover:shadow-2xl'}`}
                >
                  <div className="mb-8 min-h-[4rem] flex flex-col justify-center">
                    <h4 className="font-bold text-foreground text-sm truncate leading-tight mb-2 uppercase tracking-tight">
                      {entry.category}
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                        {entry.costCenter || 'S/ Centro de Custo'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-8">
                    <span className={`text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm ${
                      entry.type === 'receivable' 
                        ? 'bg-chart-3/20 text-chart-3' 
                        : 'bg-destructive/20 text-destructive'
                    }`}>
                      {entry.type === 'receivable' ? 'Entrada' : 'Saída'}
                    </span>
                    <span className="text-sm font-mono font-bold text-foreground tracking-tighter">
                      {formatCurrency(total)}
                    </span>
                  </div>

                  <div className="relative group">
                    <select 
                      value={mappings[key] || ''}
                      onChange={(e) => onMapEntry(key, e.target.value as BPSection)}
                      className="w-full appearance-none border border-border rounded-2xl px-5 py-3.5 text-[11px] font-bold text-muted-foreground outline-none bg-card focus:ring-4 focus:ring-primary/10 cursor-pointer shadow-sm group-hover:border-primary transition-all uppercase tracking-widest"
                    >
                      <option value="">DEFINIR SEÇÃO...</option>
                      {BP_SECTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label.toUpperCase()}</option>
                      ))}
                    </select>
                    <ChevronRight size={14} className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-20 flex justify-center sticky bottom-10 z-50">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={onFinish}
                disabled={mappedCount === 0}
                className="px-16 py-6 h-auto bg-primary text-primary-foreground rounded-[2rem] font-bold text-sm tracking-[0.25em] shadow-xl hover:bg-primary/90 transition-all flex items-center gap-5"
                style={{ boxShadow: '0 20px 50px hsl(var(--primary) / 0.3)' }}
              >
                FINALIZAR DASHBOARD <ArrowRight size={20} />
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
