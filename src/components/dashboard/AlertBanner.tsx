import { CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AlertBannerProps {
  alert: { type: 'success' | 'error', msg: string } | null;
  onDismiss: () => void;
}

export const AlertBanner = ({ alert, onDismiss }: AlertBannerProps) => {
  if (!alert) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`mb-10 p-5 rounded-[1.5rem] flex items-center justify-between shadow-2xl backdrop-blur-md border ${
        alert.type === 'success' 
          ? 'bg-chart-3/10 text-foreground border-chart-3/20' 
          : 'bg-destructive/10 text-foreground border-destructive/20'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl ${alert.type === 'success' ? 'bg-chart-3/20' : 'bg-destructive/20'}`}>
          {alert.type === 'success' ? (
            <CheckCircle2 size={20} className="text-chart-3" />
          ) : (
            <AlertCircle size={20} className="text-destructive" />
          )}
        </div>
        <p className="font-bold text-sm tracking-tight">{alert.msg}</p>
      </div>
      <button 
        onClick={onDismiss} 
        className="p-2 hover:bg-foreground/5 rounded-full transition-colors opacity-50 hover:opacity-100"
      >
        ✕
      </button>
    </motion.div>
  );
};
