import { motion } from 'framer-motion';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics';

export const RealtimeKpiIndicator = () => {
  const { lastUpdate, isLoading } = useRealtimeMetrics();

  const isOnline = lastUpdate && (new Date().getTime() - lastUpdate.getTime()) < 60000;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30"
    >
      <div className="relative">
        {isLoading ? (
          <Activity size={14} className="text-muted-foreground animate-pulse" />
        ) : isOnline ? (
          <>
            <Wifi size={14} className="text-green-500" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full"
            />
          </>
        ) : (
          <WifiOff size={14} className="text-muted-foreground" />
        )}
      </div>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {isLoading ? 'Conectando...' : isOnline ? 'Tempo Real' : 'Offline'}
      </span>
      {lastUpdate && !isLoading && (
        <span className="text-[9px] text-muted-foreground/60">
          {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </motion.div>
  );
};
