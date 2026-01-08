import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  BellOff, 
  X, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  XCircle,
  Check,
  Settings,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useFinancialAnomalies, FinancialAnomaly } from '@/hooks/useFinancialAnomalies';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { formatCurrency } from '@/utils/finance';

const severityConfig = {
  low: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  medium: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  high: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  critical: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
};

const AnomalyCard = ({ 
  anomaly, 
  onMarkRead, 
  onDismiss 
}: { 
  anomaly: FinancialAnomaly; 
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) => {
  const config = severityConfig[anomaly.severity];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`p-4 rounded-xl border ${config.border} ${config.bg} ${!anomaly.is_read ? 'ring-2 ring-primary/20' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <Icon size={18} className={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-foreground text-sm truncate">{anomaly.title}</h4>
            {!anomaly.is_read && (
              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
            )}
          </div>
          <p className="text-muted-foreground text-xs mb-2">{anomaly.description}</p>
          {anomaly.deviation_percent && (
            <div className="flex items-center gap-2 text-xs">
              <span className={`font-mono font-bold ${anomaly.deviation_percent > 0 ? 'text-destructive' : 'text-green-500'}`}>
                {anomaly.deviation_percent > 0 ? '+' : ''}{anomaly.deviation_percent.toFixed(1)}%
              </span>
              {anomaly.current_value && anomaly.expected_value && (
                <span className="text-muted-foreground">
                  ({formatCurrency(anomaly.current_value)} vs {formatCurrency(anomaly.expected_value)})
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!anomaly.is_read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkRead(anomaly.id)}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <Check size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(anomaly.id)}
            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
          >
            <X size={14} />
          </Button>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        {new Date(anomaly.created_at).toLocaleString('pt-BR')}
      </div>
    </motion.div>
  );
};

export const NotificationsPanel = () => {
  const { anomalies, unreadCount, isLoading, markAsRead, dismissAnomaly } = useFinancialAnomalies();
  const { permission, requestPermission, sendTestNotification } = usePushNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative rounded-xl h-10 w-10 p-0"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-[380px] p-0 rounded-2xl border border-border/50 shadow-xl"
      >
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-primary" />
              <span className="font-bold text-foreground">Alertas Financeiros</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                  {unreadCount} novo{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (permission !== 'granted') {
                  requestPermission();
                } else {
                  sendTestNotification();
                }
              }}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <Settings size={14} />
            </Button>
          </div>
          {permission !== 'granted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={requestPermission}
              className="w-full mt-3 rounded-xl text-xs"
            >
              <Bell size={14} className="mr-2" />
              Ativar Notificações Push
            </Button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-primary animate-spin" />
            </div>
          ) : anomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <BellOff size={32} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">Nenhum alerta</p>
              <p className="text-xs">Anomalias detectadas aparecerão aqui</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {anomalies.map(anomaly => (
                <AnomalyCard
                  key={anomaly.id}
                  anomaly={anomaly}
                  onMarkRead={markAsRead}
                  onDismiss={dismissAnomaly}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
