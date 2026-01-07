import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useImportHistory } from '@/hooks/useImportHistory';
import { useMappingTemplates } from '@/hooks/useMappingTemplates';
import { TransactionEntry, BPSection, DreKpis } from '@/types/finance';
import { 
  parseContaAzulCsv, 
  getCategoryKey, 
  generateDemoData,
  computeDreByMonth
} from '@/utils/finance';
import { Header } from '@/components/dashboard/Header';
import { UploadTab } from '@/components/dashboard/UploadTab';
import { MappingTab } from '@/components/dashboard/MappingTab';
import { AnalyticsTab, AIProvider } from '@/components/dashboard/AnalyticsTab';
import { ForecastingModule } from '@/components/dashboard/ForecastingModule';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { Footer } from '@/components/dashboard/Footer';
import { CsvPreview } from '@/components/dashboard/CsvPreview';

type TabType = 'upload' | 'preview' | 'mapping' | 'analytics' | 'forecast';

const Index = () => {
  const { toast } = useToast();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { saveToHistory, findSimilarImport, updateMappings } = useImportHistory();
  const { templates, saveTemplate, deleteTemplate } = useMappingTemplates();
  const [tab, setTab] = useState<TabType>('upload');
  const [entries, setEntries] = useState<TransactionEntry[]>([]);
  const [mappings, setMappings] = useState<Record<string, BPSection>>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [isAiParsed, setIsAiParsed] = useState(false);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('lovable');
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

  const handleMapEntry = useCallback((categoryKey: string, bpSection: BPSection) => {
    const newMappings = { ...mappings, [categoryKey]: bpSection };
    setMappings(newMappings);
    setEntries(prev => prev.map(e => {
      const eKey = getCategoryKey(e.category, e.costCenter);
      return eKey === categoryKey ? { ...e, bpSection } : e;
    }));
  }, [mappings]);

  const handleBulkMap = useCallback((categoryKeys: string[], bpSection: BPSection) => {
    const newMappings = { ...mappings };
    categoryKeys.forEach(key => {
      newMappings[key] = bpSection;
    });
    setMappings(newMappings);
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
        
        const processParsedData = (parsed: TransactionEntry[], isAi: boolean) => {
          setEntries(parsed);
          setMappings({});
          setSelectedCostCenter('all');
          setIsAiParsed(isAi);
          
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
          processParsedData(parsed, false);
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

            processParsedData(parsed, true);
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
  }, [toast, findSimilarImport, saveToHistory]);

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
      
      const categoriesPayload = Array.from(uniqueCategories.entries()).map(([key, data]) => ({
        key,
        ...data
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-map-categories`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ categories: categoriesPayload }),
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
      aiMappings.forEach((m: { key: string; section: BPSection }) => {
        newMappings[m.key] = m.section;
      });
      
      setMappings(prev => ({ ...prev, ...newMappings }));
      setEntries(prev => prev.map(e => {
        const key = getCategoryKey(e.category, e.costCenter);
        if (newMappings[key]) {
          return { ...e, bpSection: newMappings[key] };
        }
        return e;
      }));
      
      setAlert({ type: 'success', msg: 'Classificação inteligente com Gemini Pro aplicada.' });
      toast({
        title: "✨ Auto-mapeamento concluído",
        description: `${Object.keys(newMappings).length} categorias classificadas com IA.`
      });
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

  const generateAiInsight = useCallback(async (provider: AIProvider = selectedProvider) => {
    // Check if user is authenticated
    if (!session?.access_token) {
      toast({
        title: "Autenticação necessária",
        description: "Faça login para usar as análises de IA.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setIsAiLoading(true);
    setAiInsight(null);
    
    const providerNames: Record<AIProvider, string> = {
      lovable: 'Gemini',
      openai: 'GPT-4o',
      anthropic: 'Claude Sonnet 4',
      xai: 'Grok 3'
    };
    
    try {
      // Prepare financial data for AI analysis
      const financialData = {
        costCenter: selectedCostCenter,
        months: sortedMonths,
        data: sortedMonths.map(month => ({
          month,
          ...dreByMonth[month]
        }))
      };

      console.log(`Generating insights with ${providerNames[provider]}...`);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            financialData,
            costCenter: selectedCostCenter,
            provider
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Sessão expirada",
            description: "Por favor, faça login novamente.",
            variant: "destructive",
          });
          navigate('/auth');
          throw new Error("Unauthorized");
        }
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
            description: "Adicione créditos para continuar usando a análise AI.",
            variant: "destructive",
          });
          throw new Error("Payment required");
        }
        throw new Error(`HTTP error: ${response.status}`);
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let textBuffer = "";
      let insightText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              insightText += content;
              setAiInsight(insightText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (!insightText) {
        throw new Error("No insight generated");
      }
    } catch (error) {
      console.error("AI insight error:", error);
      // Fallback to simulated insight
      const insight = `
## 📊 Análise Estratégica - ${selectedCostCenter === 'all' ? 'Consolidado' : selectedCostCenter}

### 1. Comparativo Mensal (MoM)
🟢 **Receita Líquida**: Crescimento de **36%** no último período
🟢 **EBITDA**: Variação positiva de **28%** vs. mês anterior
🟡 **Margem Líquida**: Estável em **12.5%**

### 2. Diagnóstico de Variação
- O aumento na receita foi impulsionado principalmente pelo segmento de **Consultoria Digital**
- OpEx manteve-se controlado com crescimento de apenas **6.7%**
- CPV apresentou leve pressão de **+20%**, requerendo atenção

### 3. Plano de Ação Estratégico

**🔴 Alta Prioridade**
- Renegociar contratos de matéria-prima para conter aumento do CPV

**🟡 Média Prioridade**  
- Expandir operações no centro de custo Digital (maior margem)

**🟢 Baixa Prioridade**
- Automatizar processos administrativos para reduzir OpEx
      `.trim();
      
      setAiInsight(insight);
    } finally {
      setIsAiLoading(false);
    }
  }, [selectedCostCenter, sortedMonths, dreByMonth, toast, selectedProvider]);

  const handleProviderChange = useCallback((provider: AIProvider) => {
    setSelectedProvider(provider);
    // Clear existing insight when provider changes
    setAiInsight(null);
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
              isAutoMapping={isAutoMapping}
              onMapEntry={handleMapEntry}
              onBulkMap={handleBulkMap}
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
                Object.entries(template.mappings).forEach(([key, section]) => {
                  // Check if this key exists in current entries
                  const entryExists = entries.some(e => getCategoryKey(e.category, e.costCenter) === key);
                  if (entryExists) {
                    newMappings[key] = section;
                  }
                });
                setMappings(newMappings);
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
              selectedProvider={selectedProvider}
              onProviderChange={handleProviderChange}
            />
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
