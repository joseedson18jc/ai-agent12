import { useState, useMemo } from 'react';
import { Settings2, Wand2, Loader2, ChevronRight, ArrowRight, Save, FolderOpen, Pencil, Check, X, Trash2, Filter, ListChecks, Cpu, Sparkles, User, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TransactionEntry, BPSection, BP_SECTIONS } from '@/types/finance';
import { getCategoryKey, formatCurrency } from '@/utils/finance';
import { MappingTemplate } from '@/hooks/useMappingTemplates';

type FilterType = 'all' | 'unmapped' | 'mapped';
export type MappingSource = 'local' | 'ai' | 'manual' | 'template';

interface MappingTabProps {
  entries: TransactionEntry[];
  mappings: Record<string, BPSection>;
  mappingSources?: Record<string, MappingSource>;
  isAutoMapping: boolean;
  onMapEntry: (categoryKey: string, bpSection: BPSection) => void;
  onBulkMap?: (categoryKeys: string[], bpSection: BPSection) => void;
  onAutoMap: () => void;
  onFinish: () => void;
  templates?: MappingTemplate[];
  onSaveTemplate?: (name: string, description?: string) => void;
  onApplyTemplate?: (template: MappingTemplate) => void;
  onDeleteTemplate?: (id: string) => void;
}

const sourceConfig: Record<MappingSource, { label: string; icon: typeof Cpu; color: string; bgColor: string; description: string }> = {
  local: {
    label: 'Local',
    icon: Sparkles,
    color: 'text-chart-3',
    bgColor: 'bg-chart-3/20',
    description: 'Mapeado automaticamente por regras locais do Conta Azul'
  },
  ai: {
    label: 'IA',
    icon: Cpu,
    color: 'text-chart-4',
    bgColor: 'bg-chart-4/20',
    description: 'Mapeado por Inteligência Artificial (Grok 4)'
  },
  manual: {
    label: 'Manual',
    icon: User,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    description: 'Mapeado manualmente pelo usuário'
  },
  template: {
    label: 'Template',
    icon: FileText,
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/20',
    description: 'Mapeado a partir de um template salvo'
  }
};

export const MappingTab = ({ 
  entries, 
  mappings, 
  mappingSources = {},
  isAutoMapping, 
  onMapEntry,
  onBulkMap,
  onAutoMap,
  onFinish,
  templates = [],
  onSaveTemplate,
  onApplyTemplate,
  onDeleteTemplate,
}: MappingTabProps) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkSection, setBulkSection] = useState<BPSection | ''>('');

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

  const allUniqueEntries = getUniqueCategoryKeys();
  
  // Filter entries based on filter type
  const uniqueEntries = useMemo(() => {
    return allUniqueEntries.filter(entry => {
      const key = getCategoryKey(entry.category, entry.costCenter);
      const isMapped = !!mappings[key];
      
      switch (filter) {
        case 'unmapped':
          return !isMapped;
        case 'mapped':
          return isMapped;
        default:
          return true;
      }
    });
  }, [allUniqueEntries, mappings, filter]);

  const totalUniqueKeys = new Set(entries.map(e => getCategoryKey(e.category, e.costCenter))).size;
  const mappedCount = Array.from(new Set(entries.map(e => getCategoryKey(e.category, e.costCenter)))).filter(k => mappings[k]).length;
  const unmappedCount = totalUniqueKeys - mappedCount;
  const mappingProgress = Math.round((mappedCount / totalUniqueKeys) * 100);

  // Count mappings by source
  const sourceStats = useMemo(() => {
    const stats: Record<MappingSource, number> = { local: 0, ai: 0, manual: 0, template: 0 };
    Object.values(mappingSources).forEach(source => {
      stats[source]++;
    });
    return stats;
  }, [mappingSources]);

  const handleSaveTemplate = () => {
    if (templateName.trim() && onSaveTemplate) {
      onSaveTemplate(templateName.trim(), templateDescription.trim() || undefined);
      setTemplateName('');
      setTemplateDescription('');
      setShowSaveDialog(false);
    }
  };

  // Determine if entry is negative (saída) based on amount
  const isNegativeEntry = (entry: TransactionEntry, total: number) => {
    return total < 0 || entry.type === 'payable';
  };

  const toggleSelection = (key: string) => {
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedKeys(newSelected);
  };

  const selectAllVisible = () => {
    const visibleKeys = uniqueEntries.map(e => getCategoryKey(e.category, e.costCenter));
    setSelectedKeys(new Set(visibleKeys));
  };

  const clearSelection = () => {
    setSelectedKeys(new Set());
  };

  const handleBulkMap = () => {
    if (selectedKeys.size === 0 || !bulkSection) return;
    
    if (onBulkMap) {
      onBulkMap(Array.from(selectedKeys), bulkSection);
    } else {
      // Fallback: map one by one
      selectedKeys.forEach(key => {
        onMapEntry(key, bulkSection);
      });
    }
    
    setSelectedKeys(new Set());
    setBulkSection('');
    setShowBulkDialog(false);
  };

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
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted text-muted-foreground rounded-full text-[10px] font-bold uppercase tracking-widest border border-border">
                <Settings2 size={12} /> Account Mapping
              </div>
              <h2 className="text-4xl font-bold text-foreground tracking-tight leading-none">
                Estruturação de Plano.
              </h2>
              <p className="text-muted-foreground font-medium max-w-lg">
                Relacione as categorias do seu extrato com a estrutura padrão do DRE gerencial. 
                <span className="text-destructive font-semibold"> Valores negativos são sempre saídas.</span>
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
                
                {/* Source statistics */}
                {mappedCount > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                    {(Object.entries(sourceStats) as [MappingSource, number][]).map(([source, count]) => {
                      if (count === 0) return null;
                      const config = sourceConfig[source];
                      const IconComponent = config.icon;
                      return (
                        <TooltipProvider key={source}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${config.bgColor}`}>
                                <IconComponent size={10} className={config.color} />
                                <span className={`text-[9px] font-bold ${config.color}`}>{count}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{count} {config.description.toLowerCase()}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={onAutoMap}
                  disabled={isAutoMapping}
                  className="h-auto px-8 py-4 bg-foreground text-background rounded-[2rem] font-bold text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-foreground/90 transition-all shadow-xl"
                >
                  {isAutoMapping ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  AUTO-MAPEAR (IA)
                </Button>
                
                <div className="flex gap-2">
                  {onSaveTemplate && (
                    <Button
                      onClick={() => setShowSaveDialog(true)}
                      disabled={mappedCount === 0}
                      variant="outline"
                      className="flex-1 rounded-xl text-[10px] font-bold tracking-wider"
                    >
                      <Save size={14} className="mr-1" /> SALVAR
                    </Button>
                  )}
                  {onApplyTemplate && templates.length > 0 && (
                    <Button
                      onClick={() => setShowLoadDialog(true)}
                      variant="outline"
                      className="flex-1 rounded-xl text-[10px] font-bold tracking-wider"
                    >
                      <FolderOpen size={14} className="mr-1" /> CARREGAR
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filter and Bulk Actions Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 p-4 bg-muted/50 rounded-2xl border border-border/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-muted-foreground" />
                <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                  <SelectTrigger className="w-[180px] rounded-xl text-sm">
                    <SelectValue placeholder="Filtrar categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas ({totalUniqueKeys})</SelectItem>
                    <SelectItem value="unmapped">
                      <span className="text-destructive">Não mapeadas ({unmappedCount})</span>
                    </SelectItem>
                    <SelectItem value="mapped">
                      <span className="text-chart-3">Mapeadas ({mappedCount})</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Exibindo <strong className="text-foreground">{uniqueEntries.length}</strong> de {totalUniqueKeys}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedKeys.size > 0 ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    <strong className="text-primary">{selectedKeys.size}</strong> selecionadas
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    className="rounded-xl text-[10px]"
                  >
                    Limpar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowBulkDialog(true)}
                    className="rounded-xl text-[10px] bg-primary"
                  >
                    <ListChecks size={14} className="mr-1" /> MAPEAR EM LOTE
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllVisible}
                  className="rounded-xl text-[10px]"
                >
                  Selecionar todas visíveis
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {uniqueEntries.map((entry) => {
              const key = getCategoryKey(entry.category, entry.costCenter);
              const total = entries.filter(e => getCategoryKey(e.category, e.costCenter) === key).reduce((s, e) => s + e.amount, 0);
              const isMapped = !!mappings[key];
              const isEditing = editingKey === key;
              const isNegative = isNegativeEntry(entry, total);
              const isSelected = selectedKeys.has(key);
              
              return (
                <motion.div 
                  key={key} 
                  layout
                  className={`p-7 rounded-[2.5rem] border transition-all duration-300 relative group ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : isMapped 
                        ? 'border-primary/20 bg-primary/5' 
                        : 'border-border bg-muted/30 hover:bg-card hover:shadow-2xl'
                  }`}
                >
                  {/* Selection checkbox */}
                  <div className="absolute top-4 left-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(key)}
                      className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </div>

                  {/* Edit indicator */}
                  {isMapped && !isEditing && (
                    <button
                      onClick={() => setEditingKey(key)}
                      className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      title="Editar mapeamento"
                    >
                      <Pencil size={14} />
                    </button>
                  )}

                  {isEditing && (
                    <div className="absolute top-4 right-4 flex gap-1">
                      <button
                        onClick={() => setEditingKey(null)}
                        className="p-2 rounded-full bg-chart-3/20 text-chart-3 hover:bg-chart-3/30 transition-colors"
                        title="Confirmar"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => {
                          onMapEntry(key, '' as BPSection);
                          setEditingKey(null);
                        }}
                        className="p-2 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                        title="Remover mapeamento"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div className="mb-8 min-h-[4rem] flex flex-col justify-center pl-8">
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
                    {/* Always show red for negative values */}
                    <span className={`text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm ${
                      isNegative
                        ? 'bg-destructive/20 text-destructive' 
                        : 'bg-chart-3/20 text-chart-3'
                    }`}>
                      {isNegative ? 'Saída' : 'Entrada'}
                    </span>
                    <span className={`text-sm font-mono font-bold tracking-tighter ${
                      isNegative ? 'text-destructive' : 'text-chart-3'
                    }`}>
                      {formatCurrency(Math.abs(total))}
                    </span>
                  </div>

                  <div className="relative group/select">
                    <select 
                      value={mappings[key] || ''}
                      onChange={(e) => {
                        onMapEntry(key, e.target.value as BPSection);
                        setEditingKey(null);
                      }}
                      className={`w-full appearance-none border rounded-2xl px-5 py-3.5 text-[11px] font-bold outline-none bg-card cursor-pointer shadow-sm transition-all uppercase tracking-widest ${
                        isEditing 
                          ? 'border-primary ring-4 ring-primary/20 text-foreground' 
                          : isMapped 
                            ? 'border-primary/30 text-primary' 
                            : 'border-border text-muted-foreground focus:ring-4 focus:ring-primary/10 group-hover/select:border-primary'
                      }`}
                    >
                      <option value="">DEFINIR SEÇÃO...</option>
                      {BP_SECTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label.toUpperCase()}</option>
                      ))}
                    </select>
                    <ChevronRight size={14} className={`absolute right-5 top-1/2 -translate-y-1/2 rotate-90 transition-colors pointer-events-none ${
                      isMapped ? 'text-primary' : 'text-muted-foreground group-hover/select:text-primary'
                    }`} />
                  </div>

                  {/* Show section label and source indicator when mapped */}
                  <AnimatePresence>
                    {isMapped && !isEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-primary/20 space-y-2"
                      >
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                          ✓ {BP_SECTIONS.find(s => s.value === mappings[key])?.label}
                        </span>
                        
                        {/* Source confidence indicator */}
                        {mappingSources[key] && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${sourceConfig[mappingSources[key]].bgColor}`}>
                                  {(() => {
                                    const IconComponent = sourceConfig[mappingSources[key]].icon;
                                    return <IconComponent size={12} className={sourceConfig[mappingSources[key]].color} />;
                                  })()}
                                  <span className={`text-[9px] font-bold uppercase tracking-wider ${sourceConfig[mappingSources[key]].color}`}>
                                    {sourceConfig[mappingSources[key]].label}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{sourceConfig[mappingSources[key]].description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
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

      {/* Bulk Mapping Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Mapear em Lote</DialogTitle>
            <DialogDescription>
              Aplique a mesma seção DRE para {selectedKeys.size} categorias selecionadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Seção DRE
              </label>
              <Select value={bulkSection} onValueChange={(v) => setBulkSection(v as BPSection)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione a seção..." />
                </SelectTrigger>
                <SelectContent>
                  {BP_SECTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-muted rounded-xl">
              <p className="text-sm font-bold text-foreground mb-2">Categorias selecionadas:</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {Array.from(selectedKeys).slice(0, 10).map(key => (
                  <p key={key} className="text-xs text-muted-foreground truncate">• {key.split('|')[0]}</p>
                ))}
                {selectedKeys.size > 10 && (
                  <p className="text-xs text-muted-foreground">... e mais {selectedKeys.size - 10}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleBulkMap} disabled={!bulkSection} className="rounded-xl">
              <ListChecks size={16} className="mr-2" /> Aplicar em {selectedKeys.size} categorias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Salvar Template de Mapeamento</DialogTitle>
            <DialogDescription>
              Salve este mapeamento para reutilizar em futuros arquivos similares.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Nome do Template
              </label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Conta Azul Padrão"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Descrição (opcional)
              </label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Ex: Para extratos mensais do Conta Azul"
                className="rounded-xl"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>{mappedCount}</strong> mapeamentos serão salvos neste template.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()} className="rounded-xl">
              <Save size={16} className="mr-2" /> Salvar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Carregar Template</DialogTitle>
            <DialogDescription>
              Selecione um template salvo para aplicar os mapeamentos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum template salvo ainda.
              </p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1"
                      onClick={() => {
                        onApplyTemplate?.(template);
                        setShowLoadDialog(false);
                      }}
                    >
                      <h4 className="font-bold text-foreground">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {Object.keys(template.mappings).length} mapeamentos • {new Date(template.updatedAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTemplate?.(template.id);
                      }}
                      className="p-2 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      title="Excluir template"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadDialog(false)} className="rounded-xl">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
