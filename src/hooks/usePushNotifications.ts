import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export const usePushNotifications = () => {
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: 'Não suportado',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast({
          title: '🔔 Notificações ativadas',
          description: 'Você receberá alertas sobre anomalias financeiras.',
        });
        setIsSubscribed(true);
        return true;
      } else if (result === 'denied') {
        toast({
          title: 'Permissão negada',
          description: 'Você não receberá notificações push. Você pode alterar isso nas configurações do navegador.',
          variant: 'destructive',
        });
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported, toast]);

  const sendTestNotification = useCallback(() => {
    if (permission !== 'granted') {
      toast({
        title: 'Permissão necessária',
        description: 'Ative as notificações para receber alertas.',
      });
      return;
    }

    new Notification('🧪 Teste de Notificação', {
      body: 'As notificações estão funcionando corretamente!',
      icon: '/favicon.ico',
    });

    toast({
      title: 'Notificação enviada',
      description: 'Verifique se recebeu a notificação de teste.',
    });
  }, [permission, toast]);

  const saveSubscription = useCallback(async (subscription: PushSubscription) => {
    // No-op without auth, just mark as subscribed
    setIsSubscribed(true);
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    sendTestNotification,
    saveSubscription,
  };
};
