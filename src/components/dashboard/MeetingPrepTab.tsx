import { useState, useCallback } from 'react';
import {
  Presentation,
  Loader2,
  Sparkles,
  Calendar,
  MessageSquareText,
  Copy,
  Check,
  BrainCircuit,
  ClipboardList,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DreKpis } from '@/types/finance';
import { formatCurrency } from '@/utils/finance';
import { useToast } from '@/hooks/use-toast';

interface MeetingPrepTabProps {
  dreByMonth: Record<string, DreKpis>;
  sortedMonths: string[];
  selectedCostCenter: string;
}

export const MeetingPrepTab = ({
  dreByMonth,
  sortedMonths,
  selectedCostCenter,
}: MeetingPrepTabProps) => {
  const { toast } = useToast();
  const [brief, setBrief] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [meetingTopic, setMeetingTopic] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [copied, setCopied] = useState(false);

  const generateBrief = useCallback(async () => {
    setIsLoading(true);
    setBrief('');

    const financialData = {
      costCenter: selectedCostCenter,
      months: sortedMonths,
      data: sortedMonths.map(month => ({
        month,
        ...dreByMonth[month],
      })),
    };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meeting-brief`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            financialData,
            costCenter: selectedCostCenter,
            meetingTopic: meetingTopic || undefined,
            meetingDate: meetingDate || undefined,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: 'Limite de requisições',
            description: 'Por favor, aguarde um momento e tente novamente.',
            variant: 'destructive',
          });
          throw new Error('Rate limit exceeded');
        }
        if (response.status === 402) {
          toast({
            title: 'Créditos insuficientes',
            description: 'Adicione créditos para continuar usando a IA.',
            variant: 'destructive',
          });
          throw new Error('Payment required');
        }
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let textBuffer = '';
      let briefText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              briefText += content;
              setBrief(briefText);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      setIsLoading(false);
      toast({
        title: 'Briefing gerado',
        description: 'Seu briefing de reunião está pronto para revisão.',
      });
    } catch (error) {
      console.error('Error generating meeting brief:', error);
      setIsLoading(false);
      if (!(error instanceof Error) || (!error.message.includes('Rate limit') && !error.message.includes('Payment required'))) {
        setBrief(`Erro ao gerar briefing: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        toast({
          title: 'Erro',
          description: 'Falha ao gerar briefing com xAI Grok 4',
          variant: 'destructive',
        });
      }
    }
  }, [dreByMonth, sortedMonths, selectedCostCenter, meetingTopic, meetingDate, toast]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      toast({ title: 'Copiado', description: 'Briefing copiado para a área de transferência.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível copiar.', variant: 'destructive' });
    }
  }, [brief, toast]);

  // Quick stats for the summary cards
  const lastMonth = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : null;
  const currentDre = lastMonth ? dreByMonth[lastMonth] : null;
  const prevMonth = sortedMonths.length > 1 ? sortedMonths[sortedMonths.length - 2] : null;
  const prevDre = prevMonth ? dreByMonth[prevMonth] : null;

  const calcVar = (cur: number, prev: number | null) => {
    if (prev === null || prev === 0) return null;
    return ((cur - prev) / Math.abs(prev)) * 100;
  };

  if (sortedMonths.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-96 space-y-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Presentation size={40} className="text-primary/40" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-foreground">Dados insuficientes</h3>
          <p className="text-muted-foreground max-w-md">
            Importe e mapeie seus dados financeiros para gerar um briefing de reunião com IA.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-primary/20">
            <Presentation size={12} /> Meeting Prep
          </div>
          <h2 className="text-4xl font-bold text-foreground tracking-tight leading-none uppercase">
            Briefing de Reunião.
          </h2>
          <p className="text-muted-foreground mt-3 font-medium text-lg">
            Prepare-se para reuniões financeiras com insights gerados por IA.
          </p>
        </div>
      </div>

      {/* Quick KPI Cards */}
      {currentDre && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: 'Receita Líquida',
              value: currentDre.revenueNet,
              variation: prevDre ? calcVar(currentDre.revenueNet, prevDre.revenueNet) : null,
              color: 'chart-1',
            },
            {
              label: 'EBITDA',
              value: currentDre.ebitda,
              variation: prevDre ? calcVar(currentDre.ebitda, prevDre.ebitda) : null,
              color: 'chart-3',
            },
            {
              label: 'Margem Líquida',
              value: parseFloat(currentDre.netMargin),
              variation: prevDre ? parseFloat(currentDre.netMargin) - parseFloat(prevDre.netMargin) : null,
              color: 'primary',
              isPercent: true,
            },
          ].map((kpi) => (
            <Card
              key={kpi.label}
              className="rounded-[2rem] p-6 border border-border/30 shadow-xl bg-card/60 backdrop-blur-sm"
            >
              <CardContent className="p-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  {kpi.label}
                </p>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {kpi.isPercent ? `${kpi.value.toFixed(1)}%` : formatCurrency(kpi.value)}
                </p>
                {kpi.variation !== null && (
                  <p
                    className={`text-xs font-bold mt-1 ${
                      kpi.variation >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                    }`}
                  >
                    {kpi.variation >= 0 ? '+' : ''}{kpi.variation.toFixed(1)}{kpi.isPercent ? 'pp' : '%'} vs mês anterior
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Configuration */}
      <Card className="rounded-[2.5rem] border border-border/30 shadow-xl bg-card/60 backdrop-blur-sm">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-xl font-bold text-foreground tracking-tight uppercase flex items-center gap-3">
            <ClipboardList size={20} className="text-primary" />
            Configurar Briefing
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="meeting-topic"
                className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"
              >
                <MessageSquareText size={12} />
                Tópico da Reunião (opcional)
              </Label>
              <Input
                id="meeting-topic"
                placeholder="Ex: Revisão de performance Q1, Planejamento orçamentário..."
                value={meetingTopic}
                onChange={(e) => setMeetingTopic(e.target.value)}
                className="rounded-xl border-border/30 bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="meeting-date"
                className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"
              >
                <Calendar size={12} />
                Data da Reunião (opcional)
              </Label>
              <Input
                id="meeting-date"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="rounded-xl border-border/30 bg-background/50"
              />
            </div>
          </div>

          <Button
            onClick={generateBrief}
            disabled={isLoading}
            className="w-full px-8 py-5 h-auto bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-2xl font-bold text-[11px] tracking-[0.2em] hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                GERANDO BRIEFING COM GROK 4...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                GERAR BRIEFING DE REUNIÃO
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Brief Result */}
      <AnimatePresence>
        {(brief || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-gradient-to-br from-foreground to-secondary rounded-[3rem] text-background border-0 shadow-2xl overflow-hidden">
              <CardContent className="p-10 md:p-14">
                <div className="space-y-8">
                  {/* Brief Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl">
                        <BrainCircuit size={32} className="text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold tracking-tight uppercase">
                          Briefing Executivo
                        </h3>
                        <p className="text-muted font-medium">
                          Gerado por xAI Grok 4
                          {meetingTopic && ` — ${meetingTopic}`}
                        </p>
                      </div>
                    </div>
                    {brief && !isLoading && (
                      <Button
                        onClick={copyToClipboard}
                        variant="ghost"
                        className="text-background hover:bg-background/10 rounded-xl gap-2 font-bold text-[10px] tracking-widest uppercase"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'COPIADO' : 'COPIAR'}
                      </Button>
                    )}
                  </div>

                  {/* Brief Content */}
                  <div className="bg-background/10 rounded-[2rem] p-8 backdrop-blur-sm border border-background/20">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-background/20">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary">
                        <Presentation size={20} className="text-primary-foreground" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Meeting Brief</h4>
                        <p className="text-[10px] opacity-70">
                          {lastMonth && `Dados até ${lastMonth}`}
                          {meetingDate && ` — Reunião em ${meetingDate}`}
                        </p>
                      </div>
                      {isLoading && (
                        <Loader2 size={16} className="animate-spin ml-auto text-primary" />
                      )}
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed max-h-[600px] overflow-y-auto">
                      {brief ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: brief.replace(/\n/g, '<br/>'),
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-32 text-muted">
                          <Loader2 size={24} className="animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!brief && !isLoading && (
        <Card className="glass-card rounded-[3rem] border border-border/50 shadow-xl">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Presentation size={40} className="text-primary/30" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-lg font-bold text-foreground">
                Prepare-se para sua próxima reunião
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure o tópico e data acima, depois clique em "Gerar Briefing" para criar um
                documento completo com insights, pontos de discussão e recomendações estratégicas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};
