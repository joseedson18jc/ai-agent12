import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useImportHistory } from '@/hooks/useImportHistory';
import { useMappingTemplates } from '@/hooks/useMappingTemplates';
import { useDataValidation } from '@/hooks/useDataValidation';
import { TransactionEntry, BPSection, DreKpis } from '@/types/finance';
import {
  parseContaAzulCsv,
  getCategoryKey,
  generateDemoData,
  computeDreByMonth,
  computeDreKpis
} from '@/utils/finance';
import { autoMapContaAzulCategory } from '@/utils/contaAzulAutoMapper';
import { Header } from '@/components/dashboard/Header';
import { UploadTab } from '@/components/dashboard/UploadTab';
import { MappingTab } from '@/components/dashboard/MappingTab';
import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab';
import { ForecastingModule } from '@/components/dashboard/ForecastingModule';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { Footer } from '@/components/dashboard/Footer';
import { CsvPreview } from '@/components/dashboard/CsvPreview';
import { RealtimeDashboard } from '@/components/dashboard/RealtimeDashboard';
import { RealtimeChart } from '@/components/dashboard/RealtimeChart';
import { FinancialGoals } from '@/components/dashboard/FinancialGoals';
import { ValidationResultsPanel } from '@/components/dashboard/ValidationResultsPanel';

type TabType = 'upload' | 'preview' | 'mapping' | 'analytics' | 'forecast';

const Index = () => {
  const { toast } = useToast();
  const { saveToHistory, findSimilarImport, updateMappings } = useImportHistory();
  const { templates, saveTemplate, deleteTemplate } = useMappingTemplates();
  const { validateEntries, runAIValidation, isValidating, validationResult, clearValidation } = useDataValidation();
  const [tab, setTab] = useState<TabType>('upload');
  const [entries, setEntries] = useState<TransactionEntry[]>([]);
  const [mappings, setMappings] = useState<Record<string, BPSection>>({});
  const [mappingSources, setMappingSources] = useState<Record<string, 'local' | 'ai' | 'manual' | 'template'>>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [isAiParsed, setIsAiParsed] = useState(false);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
  // AI provider removed - now using xAI Grok 4 only
  const [currentFilename, setCurrentFilename] = useState<string>('');
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [pendingSavedMappings, setPendingSavedMappings] = useState<Record<string, BPSection> | null>(null);
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const uniqueCostCenters = useMemo(() => {
    const centers = new Set<string>();
    entries.forEach(e => {
      if (e.costCenter) centers.add(e.costCenter);
    });
    return Array.from(centers).sort();
  }, [entries]);

  const mappedCount = useMemo(() => {
    const keys = new Set(entries.map(e => getCategoryKey(e.category, e.costCenter)));
    return Array.from(keys).filter(k => mappings[k]).length;
  }, [entries, mappings]);

  const analyticsEntries = useMemo(() => {
    if (selectedCostCenter === 'all') return entries;
    return entries.filter(e => e.costCenter === selectedCostCenter);
  }, [entries, selectedCostCenter]);

  const dreByMonth = useMemo(() => computeDreByMonth(analyticsEntries), [analyticsEntries]);
  const sortedMonths = useMemo(() => Object.keys(dreByMonth).sort(), [dreByMonth]);

  const handleMapEntry = useCallback((categoryKey: string, bpSection: BPSection, source: 'local' | 'ai' | 'manual' | 'template' = 'manual') => {
    const newMappings = { ...mappings, [categoryKey]: bpSection };
    setMappings(newMappings);
    setMappingSources(prev => ({ ...prev, [categoryKey]: source }));
    setEntries(prev => prev.map(e => {
      const eKey = getCategoryKey(e.category, e.costCenter);
      return eKey === categoryKey ? { ...e, bpSection } : e;
    }));
  }, [mappings]);

  const handleBulkMap = useCallback((categoryKeys: string[], bpSection: BPSection, source: 'local' | 'ai' | 'manual' | 'template' = 'manual') => {
    const newMappings = { ...mappings };
    const newSources = { ...mappingSources };
    categoryKeys.forEach(key => {
      newMappings[key] = bpSection;
      newSources[key] = source;
    });
    setMappings(newMappings);
    setMappingSources(newSources);
    setEntries(prev => prev.map(e => {
      const eKey = getCategoryKey(e.category, e.costCenter);
      if (categoryKeys.includes(eKey)) {
        return { ...e, bpSection };
      }
      return e;
    }));
    toast({
      title: "✅ Mapeamento em lote",
      description: `${categoryKeys.length} categorias mapeadas com sucesso.`
    });
  }, [mappings, toast]);

  const handleCsvUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsParsing(true);
    setCurrentFilename(file.name);
    setPendingSavedMappings(null);
    setCurrentHistoryId(null);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const firstLine = content.split(/\r?\n/)[0] || '';
        const columnHeaders = firstLine.split(/[,;]/).map(h => h.trim().replace(/"/g, ''));
        
        // Check for similar import with saved mappings
        const similarImport = findSimilarImport(columnHeaders);
        
        const processParsedData = async (parsed: TransactionEntry[], isAi: boolean) => {
          setEntries(parsed);
          setMappings({});
          setSelectedCostCenter('all');
          setIsAiParsed(isAi);
          
          // Run validation on parsed data
          const validationResult = await validateEntries(parsed);
          
          // Run AI anomaly detection in background (non-blocking)
          runAIValidation(parsed);
          
          // Save to history and store the history ID
          const historyEntry = saveToHistory({
            filename: file.name,
            columnHeaders,
            entryCount: parsed.length
          });
          setCurrentHistoryId(historyEntry.id);
          
          // Check if we have saved mappings to offer
          if (similarImport?.savedMappings && Object.keys(similarImport.savedMappings).length > 0) {
            setPendingSavedMappings(similarImport.savedMappings);
            toast({
              title: "📋 Mapeamento anterior encontrado",
              description: `Formato similar ao arquivo "${similarImport.filename}". Deseja aplicar os mapeamentos salvos?`,
              duration: 8000,
            });
          }
          
          setTab('preview');
        };
        
        // First try normal parsing
        try {
          const parsed = parseContaAzulCsv(content);
          await processParsedData(parsed, false);
          setAlert({ type: 'success', msg: `${parsed.length} transações identificadas. Revise antes de continuar.` });
          toast({
            title: "Upload concluído",
            description: `${parsed.length} transações prontas para revisão.`
          });
          setIsParsing(false);
          return;
        } catch (parseError: any) {
          console.log('Standard parsing failed, trying AI parser:', parseError.message);
          
          // Show toast that we're using AI
          toast({
            title: "Usando IA para interpretar CSV",
            description: "Formato não reconhecido. Analisando com inteligência artificial..."
          });
          
          // Try AI parsing
          try {
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-csv`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ csvContent: content }),
              }
            );

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `HTTP error: ${response.status}`);
            }

            const { normalizedCsv } = await response.json();
            
            if (!normalizedCsv) {
              throw new Error('AI não conseguiu processar o arquivo');
            }

            // Parse the normalized CSV
            const parsed = parseContaAzulCsv(normalizedCsv);
            
            if (parsed.length === 0) {
              throw new Error('Nenhuma transação válida encontrada após processamento AI');
            }

            await processParsedData(parsed, true);
            setAlert({ type: 'success', msg: `IA processou ${parsed.length} transações. Revise antes de continuar.` });
            toast({
              title: "✨ Processado com IA",
              description: `${parsed.length} transações normalizadas e prontas para revisão.`
            });
          } catch (aiError: any) {
            console.error('AI parsing also failed:', aiError);
            setAlert({ 
              type: 'error', 
              msg: `Erro de análise: ${parseError.message}` 
            });
          }
        }
      } catch (err: any) {
        setAlert({ type: 'error', msg: `Erro crítico: ${err.message}` });
      } finally {
        setIsParsing(false);
      }
    };
    
    reader.onerror = () => {
      setAlert({ type: 'error', msg: 'Falha crítica ao ler o arquivo selecionado.' });
      setIsParsing(false);
    };
    reader.readAsText(file);
  }, [toast, findSimilarImport, saveToHistory, validateEntries, runAIValidation]);

  const handleApplySavedMappings = useCallback(() => {
    if (!pendingSavedMappings) return;
    
    setMappings(pendingSavedMappings);
    setEntries(prev => prev.map(e => {
      const key = getCategoryKey(e.category, e.costCenter);
      if (pendingSavedMappings[key]) {
        return { ...e, bpSection: pendingSavedMappings[key] };
      }
      return e;
    }));
    
    const appliedCount = Object.keys(pendingSavedMappings).length;
    toast({
      title: "✅ Mapeamentos aplicados",
      description: `${appliedCount} categorias foram mapeadas automaticamente.`
    });
    setPendingSavedMappings(null);
  }, [pendingSavedMappings, toast]);

  const handleDismissSavedMappings = useCallback(() => {
    setPendingSavedMappings(null);
  }, []);

  const handlePreviewConfirm = useCallback(() => {
    setTab('mapping');
  }, []);

  const handlePreviewCancel = useCallback(() => {
    setEntries([]);
    setMappings({});
    setIsAiParsed(false);
    setTab('upload');
  }, []);

  const handleEntriesChange = useCallback((updatedEntries: TransactionEntry[]) => {
    setEntries(updatedEntries);
  }, []);

  const loadDemo = useCallback(() => {
    setIsParsing(true);
    setTimeout(() => {
      const { entries: demoEntries, mappings: demoMappings } = generateDemoData();
      setEntries(demoEntries);
      setMappings(demoMappings);
      setSelectedCostCenter('all');
      setAlert({ type: 'success', msg: 'Dashboard populado com dados de simulação estratégica.' });
      toast({
        title: "Demo carregado",
        description: "Dados de demonstração prontos para análise."
      });
      setIsParsing(false);
      setTab('analytics');
    }, 600);
  }, [toast]);

  const autoMapWithAi = useCallback(async () => {
    if (entries.length === 0) return;
    setIsAutoMapping(true);
    
    try {
      // Get unique categories with their metadata
      const uniqueCategories: Map<string, { category: string; costCenter: string | null; type: string; totalAmount: number }> = new Map();
      
      entries.forEach(entry => {
        const key = getCategoryKey(entry.category, entry.costCenter);
        if (!uniqueCategories.has(key)) {
          uniqueCategories.set(key, {
            category: entry.category,
            costCenter: entry.costCenter,
            type: entry.type,
            totalAmount: entry.amount
          });
        } else {
          const existing = uniqueCategories.get(key)!;
          existing.totalAmount += entry.amount;
        }
      });
      
      // STEP 1: Try local Conta Azul auto-mapping first (instant, no API call)
      const localMappings: Record<string, BPSection> = {};
      const unmappedCategories: { key: string; category: string; costCenter: string | null; type: string; totalAmount: number }[] = [];
      
      uniqueCategories.forEach((data, key) => {
        const localSection = autoMapContaAzulCategory(data.category);
        if (localSection) {
          localMappings[key] = localSection;
        } else {
          unmappedCategories.push({ key, ...data });
        }
      });
      
      // Apply local mappings immediately with source tracking
      if (Object.keys(localMappings).length > 0) {
        const localSources: Record<string, 'local' | 'ai' | 'manual' | 'template'> = {};
        Object.keys(localMappings).forEach(key => {
          localSources[key] = 'local';
        });
        
        setMappings(prev => ({ ...prev, ...localMappings }));
        setMappingSources(prev => ({ ...prev, ...localSources }));
        setEntries(prev => prev.map(e => {
          const key = getCategoryKey(e.category, e.costCenter);
          if (localMappings[key]) {
            return { ...e, bpSection: localMappings[key] };
          }
          return e;
        }));
        
        toast({
          title: "🎯 Mapeamento inteligente local",
          description: `${Object.keys(localMappings).length} categorias Conta Azul reconhecidas automaticamente.`
        });
      }
      
      // STEP 2: If there are still unmapped categories, use AI
      if (unmappedCategories.length > 0) {
        toast({
          title: "🤖 Processando com IA",
          description: `${unmappedCategories.length} categorias restantes sendo analisadas por Grok 4...`
        });
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-map-categories`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ categories: unmappedCategories }),
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

        const { mappings: aiMappings } = await response.json();
        
        const newMappings: Record<string, BPSection> = {};
        const aiSources: Record<string, 'local' | 'ai' | 'manual' | 'template'> = {};
        aiMappings.forEach((m: { key: string; section: BPSection }) => {
          newMappings[m.key] = m.section;
          aiSources[m.key] = 'ai';
        });
        
        setMappings(prev => ({ ...prev, ...newMappings }));
        setMappingSources(prev => ({ ...prev, ...aiSources }));
        setEntries(prev => prev.map(e => {
          const key = getCategoryKey(e.category, e.costCenter);
          if (newMappings[key]) {
            return { ...e, bpSection: newMappings[key] };
          }
          return e;
        }));
        
        toast({
          title: "✨ Auto-mapeamento por IA concluído",
          description: `${Object.keys(newMappings).length} categorias adicionais classificadas por Grok 4.`
        });
      }
      
      const totalMapped = Object.keys(localMappings).length + (unmappedCategories.length > 0 ? unmappedCategories.length : 0);
      setAlert({ type: 'success', msg: `Classificação inteligente completa: ${totalMapped} categorias mapeadas.` });
      
    } catch (error) {
      console.error("Auto-map error:", error);
      if (!(error instanceof Error) || !error.message.includes("Rate limit") && !error.message.includes("Payment required")) {
        toast({
          title: "Erro no auto-mapeamento",
          description: "Não foi possível classificar automaticamente. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsAutoMapping(false);
    }
  }, [entries, toast]);

  const handleCostCenterChange = useCallback((value: string) => {
    setSelectedCostCenter(value);
    setAiInsight(null);
  }, []);

  const generateAiInsight = useCallback(async () => {
    // Now using xAI Grok 4 - insights generated in AIComparisonMode component
    console.log('AI insights now handled by AIComparisonMode with xAI Grok 4');
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-sans selection:bg-primary/20">
      <Header 
        tab={tab} 
        setTab={setTab}
        hasEntries={entries.length > 0}
        hasMappings={mappedCount > 0}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <AlertBanner alert={alert} onDismiss={() => setAlert(null)} />
        
        {/* Validation Results Panel */}
        <AnimatePresence>
          {validationResult && (
            <div className="mb-6">
              <ValidationResultsPanel 
                result={validationResult}
                totalEntries={entries.length}
                onDismiss={clearValidation}
              />
            </div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          {tab === 'upload' && (
            <UploadTab 
              key="upload"
              isParsing={isParsing}
              onCsvUpload={handleCsvUpload}
              onLoadDemo={loadDemo}
            />
          )}

          {tab === 'preview' && (
            <CsvPreview
              key="preview"
              entries={entries}
              isAiParsed={isAiParsed}
              onConfirm={handlePreviewConfirm}
              onCancel={handlePreviewCancel}
              onEntriesChange={handleEntriesChange}
              pendingSavedMappings={pendingSavedMappings}
              onApplySavedMappings={handleApplySavedMappings}
              onDismissSavedMappings={handleDismissSavedMappings}
            />
          )}
          
          {tab === 'mapping' && (
            <MappingTab
              key="mapping"
              entries={entries}
              mappings={mappings}
              mappingSources={mappingSources}
              isAutoMapping={isAutoMapping}
              onMapEntry={(key, section) => handleMapEntry(key, section, 'manual')}
              onBulkMap={(keys, section) => handleBulkMap(keys, section, 'manual')}
              onAutoMap={autoMapWithAi}
              onFinish={() => {
                // Save mappings to history before finishing
                if (currentHistoryId && Object.keys(mappings).length > 0) {
                  updateMappings(currentHistoryId, mappings);
                }
                setTab('analytics');
              }}
              templates={templates}
              onSaveTemplate={(name, description) => {
                saveTemplate(name, mappings, description);
                toast({
                  title: "✅ Template salvo",
                  description: `Template "${name}" criado com ${Object.keys(mappings).length} mapeamentos.`
                });
              }}
              onApplyTemplate={(template) => {
                // Apply template mappings to current entries
                const newMappings = { ...mappings };
                const newSources = { ...mappingSources };
                Object.entries(template.mappings).forEach(([key, section]) => {
                  // Check if this key exists in current entries
                  const entryExists = entries.some(e => getCategoryKey(e.category, e.costCenter) === key);
                  if (entryExists) {
                    newMappings[key] = section;
                    newSources[key] = 'template';
                  }
                });
                setMappings(newMappings);
                setMappingSources(newSources);
                setEntries(prev => prev.map(e => {
                  const key = getCategoryKey(e.category, e.costCenter);
                  if (newMappings[key]) {
                    return { ...e, bpSection: newMappings[key] };
                  }
                  return e;
                }));
                const appliedCount = Object.keys(newMappings).length;
                toast({
                  title: "📋 Template aplicado",
                  description: `${appliedCount} mapeamentos do template "${template.name}".`
                });
              }}
              onDeleteTemplate={(id) => {
                deleteTemplate(id);
                toast({
                  title: "Template excluído",
                  description: "Template removido com sucesso."
                });
              }}
            />
          )}
          
          {tab === 'analytics' && (
            <div className="space-y-12">
              {/* Financial Goals */}
              <FinancialGoals 
                currentKpis={sortedMonths.length > 0 ? dreByMonth[sortedMonths[sortedMonths.length - 1]] : null}
              />
              
              {/* Realtime Dashboard with KPIs */}
              <RealtimeDashboard 
                dreByMonth={dreByMonth}
                sortedMonths={sortedMonths}
              />
              
              {/* Realtime Chart */}
              <RealtimeChart 
                data={sortedMonths.map(month => ({
                  month: month.split('-').reverse().join('/'),
                  'Receita Líquida': Math.round(dreByMonth[month].revenueNet),
                  'EBITDA': Math.round(dreByMonth[month].ebitda),
                  'Lucro Líquido': Math.round(dreByMonth[month].netIncome),
                }))}
              />
              
              {/* Full Analytics Tab */}
              <AnalyticsTab
                key="analytics"
                entries={entries}
                selectedCostCenter={selectedCostCenter}
                uniqueCostCenters={uniqueCostCenters}
                onCostCenterChange={handleCostCenterChange}
                aiInsight={aiInsight}
                isAiLoading={isAiLoading}
                onGenerateInsight={generateAiInsight}
                dreByMonth={dreByMonth}
                sortedMonths={sortedMonths}
              />
            </div>
          )}

          {tab === 'forecast' && (
            <ForecastingModule 
              key="forecast"
              dreByMonth={dreByMonth}
              sortedMonths={sortedMonths}
            />
          )}
        </AnimatePresence>
      </main>

      <Footer key="footer" />
    </div>
  );
};

export default Index;
