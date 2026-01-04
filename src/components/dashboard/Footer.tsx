import { Zap, Activity, Database, Sparkles } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="mt-20 border-t border-border/50 py-20 bg-card">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="flex items-center gap-4 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default">
          <div className="w-10 h-10 bg-foreground rounded-xl flex items-center justify-center text-background">
            <Zap size={20} fill="currentColor" />
          </div>
          <span className="font-bold text-foreground tracking-tight uppercase text-base">
            Insight Finance
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-[0.3em] text-center opacity-60">
          Strategic Analytics Framework v3.5.0 | AI Optimized DRE
        </p>
        <div className="flex gap-10 text-muted-foreground grayscale opacity-20">
          <Activity size={20} />
          <Database size={20} />
          <Sparkles size={20} />
        </div>
      </div>
    </footer>
  );
};
