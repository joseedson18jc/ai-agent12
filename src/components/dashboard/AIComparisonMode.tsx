import { useState, useCallback } from 'react';
import {
  BrainCircuit,
  Loader2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DreKpis } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';

interface AIComparisonModeProps {
  dreByMonth: Record<string, DreKpis>;
  sortedMonths: string[];
  selectedCostCenter: string;
}

export const AIComparisonMode = ({
  dreByMonth,
  sortedMonths,
  selectedCostCenter
}: AIComparisonModeProps) => {
  const { toast } = useToast();
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const generateInsight = useCallback(async () => {
    setIsLoading(true);
    setResult('');

    const financialData = {
      costCenter: selectedCostCenter,
      months: sortedMonths,
      data: sortedMonths.map(month => ({
        month,
        ...dreByMonth[month]
      }))
    };

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
              setResult(insightText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error generating insight:', error);
      setIsLoading(false);
      setResult(`❌ Erro ao gerar análise: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      toast({
        title: "Erro",
        description: "Falha ao gerar análise com xAI Grok 4",
        variant: "destructive"
      });
    }
  }, [dreByMonth, sortedMonths, selectedCostCenter, toast]);

  return (
    <Card className="bg-gradient-to-br from-foreground to-secondary rounded-[3rem] text-background border-0 shadow-2xl overflow-hidden">
      <CardContent className="p-10 md:p-14">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl">
                <BrainCircuit size={32} className="text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-3xl font-bold tracking-tight uppercase">
                  xAI Grok 4
                </h3>
                <p className="text-muted font-medium">
                  Análise estratégica powered by xAI Grok 4 Latest
                </p>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateInsight}
            disabled={isLoading}
            className="w-full px-8 py-5 h-auto bg-primary text-primary-foreground rounded-2xl font-bold text-[11px] tracking-[0.2em] hover:bg-primary/90 transition-all shadow-xl flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                ANALISANDO COM GROK 4...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                GERAR INSIGHTS COM GROK 4
              </>
            )}
          </Button>

          {/* Result */}
          <AnimatePresence>
            {(result || isLoading) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-background/10 rounded-[2rem] p-6 backdrop-blur-sm border border-background/20"
              >
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-background/20">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary"
                  >
                    <BrainCircuit size={20} className="text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Grok 4</h4>
                    <p className="text-[10px] opacity-70">xAI grok-4-latest</p>
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
            )}
          </AnimatePresence>

          {!result && !isLoading && (
            <div className="h-32 flex flex-col items-center justify-center text-muted space-y-4">
              <Layers size={48} className="opacity-30" />
              <p className="text-sm font-medium text-center">
                Clique em "Gerar Insights" para análise estratégica com xAI Grok 4
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
