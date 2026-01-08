import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  BarChart3, 
  Brain, 
  TrendingUp, 
  Shield, 
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface OnboardingStep {
  id: number;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  gradient: string;
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    icon: Upload,
    title: 'Importe seus Dados',
    subtitle: 'Qualquer formato, zero configuração',
    description: 'Nossa IA reconhece automaticamente qualquer formato de CSV e converte para o padrão do sistema. Não importa de onde vem seu extrato.',
    features: ['Parsing inteligente com IA', 'Suporte a múltiplos formatos', 'Correção automática de erros'],
    gradient: 'from-primary via-primary to-secondary'
  },
  {
    id: 2,
    icon: BarChart3,
    title: 'Mapeamento Automático',
    subtitle: 'Categorização inteligente',
    description: 'O sistema classifica suas transações automaticamente nas categorias da DRE. Você pode ajustar manualmente ou deixar a IA decidir.',
    features: ['Categorização por IA', 'Templates salvos', 'Aprendizado contínuo'],
    gradient: 'from-secondary via-secondary to-accent-foreground'
  },
  {
    id: 3,
    icon: Brain,
    title: 'Análise com IA',
    subtitle: 'Insights em tempo real',
    description: 'Compare diferentes modelos de IA para obter análises financeiras profundas. Identifique padrões, anomalias e oportunidades.',
    features: ['Múltiplos modelos de IA', 'Análise comparativa', 'Recomendações acionáveis'],
    gradient: 'from-accent-foreground via-primary to-secondary'
  },
  {
    id: 4,
    icon: TrendingUp,
    title: 'Projeções Financeiras',
    subtitle: 'Planeje o futuro com confiança',
    description: 'Crie cenários de projeção baseados em tendências históricas. Visualize o impacto de diferentes decisões antes de tomá-las.',
    features: ['Múltiplos cenários', 'Análise de tendências', 'Previsão de fluxo de caixa'],
    gradient: 'from-primary to-secondary'
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      localStorage.setItem('onboarding_completed', 'true');
      navigate('/');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipOnboarding = () => {
    localStorage.setItem('onboarding_completed', 'true');
    navigate('/');
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div 
          className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent rounded-full blur-[120px]"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 45, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div 
          className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] bg-gradient-to-tl from-secondary/10 via-primary/5 to-transparent rounded-full blur-[100px]"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
            rotate: [0, -45, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-8 py-6 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
              <Zap size={20} className="text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-bold text-lg text-foreground">Insight Finance</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button
              variant="ghost"
              onClick={skipOnboarding}
              className="text-muted-foreground hover:text-foreground"
            >
              Pular introdução
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        </header>

        {/* Progress Bar */}
        <div className="px-8 mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <motion.div
                  key={s.id}
                  className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted/50"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <motion.div 
                    className={`h-full bg-gradient-to-r ${s.gradient}`}
                    initial={{ width: 0 }}
                    animate={{ width: i <= currentStep ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  />
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between mt-3">
              <span className="text-xs text-muted-foreground">
                Passo {currentStep + 1} de {steps.length}
              </span>
              <span className="text-xs text-primary font-medium">
                {Math.round(((currentStep + 1) / steps.length) * 100)}% concluído
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 px-8 pb-8 flex items-center justify-center">
          <div className="max-w-5xl w-full">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                initial={{ x: direction > 0 ? 300 : -300, opacity: 0, scale: 0.9 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: direction < 0 ? 300 : -300, opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="grid lg:grid-cols-2 gap-12 items-center"
              >
                {/* Left side - Visual */}
                <motion.div 
                  className="relative"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <Card className={`relative p-12 rounded-[3rem] bg-gradient-to-br ${step.gradient} overflow-hidden border-0 shadow-2xl`}>
                    <motion.div
                      className="relative z-10 flex flex-col items-center text-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <motion.div 
                        className="w-32 h-32 bg-background/20 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl border border-background/20"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        transition={{ duration: 0.3 }}
                      >
                        <StepIcon size={56} className="text-primary-foreground" strokeWidth={1.5} />
                      </motion.div>
                      
                      <div className="space-y-6">
                        {step.features.map((feature, i) => (
                          <motion.div
                            key={feature}
                            className="flex items-center gap-3 px-5 py-3 bg-background/10 backdrop-blur-sm rounded-2xl text-primary-foreground border border-background/10"
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                          >
                            <CheckCircle2 size={18} />
                            <span className="font-medium text-sm">{feature}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                    
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-background/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-60 h-60 bg-background/5 rounded-full blur-3xl" />
                    <Sparkles size={120} className="absolute -bottom-6 -right-6 text-background/5" />
                  </Card>
                </motion.div>

                {/* Right side - Content */}
                <motion.div
                  className="space-y-8"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-primary/20">
                      <Shield size={14} />
                      Recurso {currentStep + 1}
                    </span>
                  </motion.div>
                  
                  <motion.h1 
                    className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    {step.title}
                  </motion.h1>
                  
                  <motion.p 
                    className="text-xl text-primary font-semibold"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    {step.subtitle}
                  </motion.p>
                  
                  <motion.p 
                    className="text-lg text-muted-foreground leading-relaxed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                  >
                    {step.description}
                  </motion.p>

                  {/* Navigation Buttons */}
                  <motion.div 
                    className="flex items-center gap-4 pt-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {currentStep > 0 && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={prevStep}
                        className="rounded-2xl px-6"
                      >
                        <ArrowLeft size={18} className="mr-2" />
                        Anterior
                      </Button>
                    )}
                    
                    <Button
                      variant="premium"
                      size="lg"
                      onClick={nextStep}
                      className="flex-1 max-w-xs rounded-2xl py-6 text-sm font-bold tracking-wide"
                    >
                      {currentStep < steps.length - 1 ? (
                        <>
                          Próximo
                          <ArrowRight size={18} className="ml-2" />
                        </>
                      ) : (
                        <>
                          Começar Agora
                          <Sparkles size={18} className="ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Step indicators */}
        <footer className="px-8 py-6">
          <div className="flex justify-center gap-2">
            {steps.map((s, i) => (
              <motion.button
                key={s.id}
                onClick={() => {
                  setDirection(i > currentStep ? 1 : -1);
                  setCurrentStep(i);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i === currentStep 
                    ? 'bg-primary w-8' 
                    : 'bg-muted hover:bg-muted-foreground/50'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
