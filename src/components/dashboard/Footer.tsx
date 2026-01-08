import { Zap, Activity, Database, Sparkles, Heart, Shield, Lock } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-24 border-t border-border/30 bg-gradient-to-b from-transparent to-muted/20">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-10 mb-12">
          <div className="flex items-center gap-4 group cursor-default">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <Zap size={22} fill="currentColor" />
              </div>
            </div>
            <div>
              <span className="font-bold text-foreground tracking-tight text-lg">
                Insight Finance
              </span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Strategic Analytics
              </p>
            </div>
          </div>
          
          {/* Trust Badges */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield size={16} className="text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Seguro</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock size={16} className="text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Privado</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles size={16} className="text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">AI Powered</span>
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-8" />
        
        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
            Feito com <Heart size={12} className="text-primary fill-primary" /> para decisões financeiras inteligentes
          </p>
          
          <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-[0.25em]">
            © {currentYear} Insight Finance • v3.5.0
          </p>
          
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer">
              <Activity size={16} />
            </div>
            <div className="w-8 h-8 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer">
              <Database size={16} />
            </div>
            <div className="w-8 h-8 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer">
              <Sparkles size={16} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
