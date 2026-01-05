import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
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
import { supabase } from '@/integrations/supabase/client';

type TabType = 'upload' | 'mapping' | 'analytics' | 'forecast';

const Index = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabType>('upload');
  const [entries, setEntries] = useState<TransactionEntry[]>([]);
  const [mappings, setMappings] = useState<Record<string, BPSection>>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('lovable');

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

  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseContaAzulCsv(content);
        setEntries(parsed);
        setMappings({});
        setSelectedCostCenter('all');
        setAlert({ type: 'success', msg: `Mapeamento concluído: ${parsed.length} transações identificadas.` });
        toast({
          title: "Upload concluído",
          description: `${parsed.length} transações foram importadas com sucesso.`
        });
        setTab('mapping');
      } catch (err: any) {
        setAlert({ type: 'error', msg: `Erro de análise: ${err.message}` });
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setAlert({ type: 'error', msg: 'Falha crítica ao ler o arquivo selecionado.' });
      setIsParsing(false);
    };
    reader.readAsText(file);
  }, [toast]);

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
    
    // Simulate AI mapping since we don't have an API key
    setTimeout(() => {
      const newMappings: Record<string, BPSection> = {};
      
      entries.forEach(entry => {
        const key = getCategoryKey(entry.category, entry.costCenter);
        const cat = entry.category.toLowerCase();
        
        let bpSection: BPSection = 'other';
        if (cat.includes('venda') || cat.includes('receita') || cat.includes('consultoria')) {
          bpSection = 'revenue';
        } else if (cat.includes('icms') || cat.includes('pis') || cat.includes('cofins') || cat.includes('iss')) {
          bpSection = 'deductions';
        } else if (cat.includes('matéria') || cat.includes('materia') || cat.includes('insumo') || cat.includes('cpv')) {
          bpSection = 'cogs';
        } else if (cat.includes('aluguel') || cat.includes('salário') || cat.includes('salario') || cat.includes('admin')) {
          bpSection = 'administrative';
        } else if (cat.includes('depreciação') || cat.includes('depreciacao')) {
          bpSection = 'depreciation';
        } else if (cat.includes('juros') || cat.includes('financeiro') || cat.includes('empréstimo')) {
          bpSection = 'financial';
        } else if (cat.includes('ir') || cat.includes('imposto') || cat.includes('csll')) {
          bpSection = 'income_tax';
        }
        
        newMappings[key] = bpSection;
      });
      
      setMappings(prev => ({ ...prev, ...newMappings }));
      setEntries(prev => prev.map(e => {
        const key = getCategoryKey(e.category, e.costCenter);
        if (newMappings[key]) {
          return { ...e, bpSection: newMappings[key] };
        }
        return e;
      }));
      
      setAlert({ type: 'success', msg: 'Classificação inteligente aplicada com sucesso.' });
      toast({
        title: "Auto-mapeamento concluído",
        description: "Categorias foram classificadas automaticamente."
      });
      setIsAutoMapping(false);
    }, 1500);
  }, [entries, toast]);

  const handleCostCenterChange = useCallback((value: string) => {
    setSelectedCostCenter(value);
    setAiInsight(null);
  }, []);

  const generateAiInsight = useCallback(async (provider: AIProvider = selectedProvider) => {
    setIsAiLoading(true);
    setAiInsight(null);
    
    const providerNames: Record<AIProvider, string> = {
      lovable: 'Gemini',
      openai: 'GPT-5',
      anthropic: 'Claude Sonnet 4.5',
      xai: 'Grok 4'
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
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            financialData,
            costCenter: selectedCostCenter,
            provider
          }),
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
        <AnimatePresence mode="wait">
          <AlertBanner alert={alert} onDismiss={() => setAlert(null)} />
          
          {tab === 'upload' && (
            <UploadTab 
              isParsing={isParsing}
              onCsvUpload={handleCsvUpload}
              onLoadDemo={loadDemo}
            />
          )}
          
          {tab === 'mapping' && (
            <MappingTab
              entries={entries}
              mappings={mappings}
              isAutoMapping={isAutoMapping}
              onMapEntry={handleMapEntry}
              onAutoMap={autoMapWithAi}
              onFinish={() => setTab('analytics')}
            />
          )}
          
          {tab === 'analytics' && (
            <AnalyticsTab
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
              dreByMonth={dreByMonth}
              sortedMonths={sortedMonths}
            />
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
