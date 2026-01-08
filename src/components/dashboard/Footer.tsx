import { Zap, Activity, Database, Sparkles, Heart, Shield, Lock, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-32 border-t border-border/20 bg-gradient-to-b from-transparent via-muted/5 to-muted/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        {/* Top Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 mb-16">
          <motion.div 
            className="flex items-center gap-5 group cursor-default"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/25 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-primary via-primary to-secondary rounded-2xl flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/30 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <Zap size={26} fill="currentColor" />
              </div>
            </div>
            <div>
              <span className="font-bold text-foreground tracking-tight text-xl">
                Insight Finance
              </span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] mt-1">
                Strategic Analytics Platform
              </p>
            </div>
          </motion.div>
          
          {/* Trust Badges */}
          <motion.div 
            className="flex items-center gap-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            {[
              { icon: Shield, label: 'Seguro' },
              { icon: Lock, label: 'Privado' },
              { icon: Sparkles, label: 'AI Powered' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-card/50 border border-border/20 backdrop-blur-sm">
                <Icon size={16} className="text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mb-12" />
        
        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <motion.p 
            className="text-[11px] text-muted-foreground font-medium flex items-center gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Feito com <Heart size={12} className="text-primary fill-primary" /> para decisões financeiras inteligentes
          </motion.p>
          
          <motion.p 
            className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-[0.3em]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            © {currentYear} Insight Finance • v3.5.0
          </motion.p>
          
          <motion.div 
            className="flex gap-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {[Activity, Database, Sparkles, ExternalLink].map((Icon, i) => (
              <div 
                key={i}
                className="w-9 h-9 rounded-xl bg-card/50 border border-border/20 flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 cursor-pointer backdrop-blur-sm"
              >
                <Icon size={16} />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </footer>
  );
};
