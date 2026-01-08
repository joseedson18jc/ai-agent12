import { useState, useCallback } from 'react';
import {
  BrainCircuit,
  Loader2,
  Sparkles,
  LayoutGrid,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DreKpis } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';

export type AIProvider = 'lovable' | 'openai' | 'anthropic' | 'xai';

interface AIComparisonModeProps {
  dreByMonth: Record<string, DreKpis>;
  sortedMonths: string[];
  selectedCostCenter: string;
}

const AI_PROVIDERS: { id: AIProvider; label: string; description: string; color: string }[] = [
  { id: 'lovable', label: 'Gemini', description: 'Google Gemini 2.5 Flash', color: 'hsl(var(--chart-1))' },
  { id: 'openai', label: 'GPT-4o', description: 'OpenAI GPT-4o', color: 'hsl(var(--chart-2))' },
  { id: 'anthropic', label: 'Claude', description: 'Anthropic Claude Sonnet 4', color: 'hsl(var(--chart-3))' },
  { id: 'xai', label: 'Grok', description: 'xAI Grok 3', color: 'hsl(var(--primary))' },
];

export const AIComparisonMode = ({
  dreByMonth,
  sortedMonths,
  selectedCostCenter
}: AIComparisonModeProps) => {
  const { toast } = useToast();
  const [selectedProviders, setSelectedProviders] = useState<AIProvider[]>(['lovable', 'openai']);
  const [results, setResults] = useState<Record<AIProvider, string>>({} as Record<AIProvider, string>);
  const [loadingProviders, setLoadingProviders] = useState<AIProvider[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  const toggleProvider = useCallback((provider: AIProvider) => {
    setSelectedProviders(prev => {
      if (prev.includes(provider)) {
        return prev.filter(p => p !== provider);
      }
      if (prev.length >= 4) return prev;
      return [...prev, provider];
    });
  }, []);

  const generateComparison = useCallback(async () => {
    if (selectedProviders.length === 0) return;

    setIsComparing(true);
    setResults({} as Record<AIProvider, string>);
    setLoadingProviders([...selectedProviders]);

    const financialData = {
      costCenter: selectedCostCenter,
      months: sortedMonths,
      data: sortedMonths.map(month => ({
        month,
        ...dreByMonth[month]
      }))
    };

    // Run all selected providers in parallel
    const promises = selectedProviders.map(async (provider) => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-insights`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              financialData,
              costCenter: selectedCostCenter,
              provider
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

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
                setResults(prev => ({ ...prev, [provider]: insightText }));
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        setLoadingProviders(prev => prev.filter(p => p !== provider));
        return { provider, success: true, insight: insightText };
      } catch (error) {
        console.error(`Error with ${provider}:`, error);
        setLoadingProviders(prev => prev.filter(p => p !== provider));
        setResults(prev => ({ 
          ...prev, 
          [provider]: `❌ Erro ao gerar análise: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
        }));
        return { provider, success: false, error };
      }
    });

    await Promise.all(promises);
    setIsComparing(false);
  }, [selectedProviders, dreByMonth, sortedMonths, selectedCostCenter, toast]);

  const hasResults = Object.keys(results).length > 0;

  return (
    <Card className="bg-gradient-to-br from-foreground to-secondary rounded-[3rem] text-background border-0 shadow-2xl overflow-hidden">
      <CardContent className="p-10 md:p-14">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl">
                <LayoutGrid size={32} className="text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-3xl font-bold tracking-tight uppercase">
                  Modo Comparação AI
                </h3>
                <p className="text-muted font-medium">
                  Compare análises de múltiplos modelos de IA simultaneamente
                </p>
              </div>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
              Selecione os modelos para comparar (2-4)
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {AI_PROVIDERS.map((provider) => {
                const isSelected = selectedProviders.includes(provider.id);
                const isLoading = loadingProviders.includes(provider.id);
                const hasResult = results[provider.id];
                
                return (
                  <button
                    key={provider.id}
                    onClick={() => toggleProvider(provider.id)}
                    disabled={isComparing}
                    className={`relative px-4 py-4 rounded-xl text-left transition-all border-2 ${
                      isSelected
                        ? 'bg-primary/20 border-primary shadow-lg'
                        : 'bg-background/10 border-transparent hover:bg-background/20'
                    } ${isComparing ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="block text-sm font-bold">{provider.label}</span>
                        <span className="block text-[10px] opacity-70">{provider.description}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        isSelected ? 'bg-primary' : 'bg-background/20'
                      }`}>
                        {isSelected && <Check size={12} className="text-primary-foreground" />}
                      </div>
                    </div>
                    {isLoading && (
                      <div className="absolute inset-0 bg-background/30 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <Loader2 size={20} className="animate-spin text-primary" />
                      </div>
                    )}
                    {hasResult && !isLoading && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 rounded-full bg-chart-3 animate-pulse" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateComparison}
            disabled={isComparing || selectedProviders.length < 2}
            className="w-full px-8 py-5 h-auto bg-primary text-primary-foreground rounded-2xl font-bold text-[11px] tracking-[0.2em] hover:bg-primary/90 transition-all shadow-xl flex items-center justify-center gap-3"
          >
            {isComparing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                COMPARANDO {loadingProviders.length} MODELO{loadingProviders.length !== 1 ? 'S' : ''}...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                COMPARAR {selectedProviders.length} MODELOS
              </>
            )}
          </Button>

          {/* Results Grid */}
          <AnimatePresence>
            {hasResults && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`grid gap-4 ${
                  selectedProviders.length <= 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'
                }`}
              >
                {selectedProviders.map((providerId) => {
                  const provider = AI_PROVIDERS.find(p => p.id === providerId);
                  const result = results[providerId];
                  const isLoading = loadingProviders.includes(providerId);
                  
                  if (!provider) return null;
                  
                  return (
                    <motion.div
                      key={providerId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-background/10 rounded-[2rem] p-6 backdrop-blur-sm border border-background/20"
                    >
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-background/20">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: provider.color }}
                        >
                          <BrainCircuit size={20} className="text-primary-foreground" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{provider.label}</h4>
                          <p className="text-[10px] opacity-70">{provider.description}</p>
                        </div>
                        {isLoading && (
                          <Loader2 size={16} className="animate-spin ml-auto text-primary" />
                        )}
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed max-h-[400px] overflow-y-auto">
                        {result ? (
                          <div dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br/>') }} />
                        ) : (
                          <div className="flex items-center justify-center h-32 text-muted">
                            <Loader2 size={24} className="animate-spin" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};
