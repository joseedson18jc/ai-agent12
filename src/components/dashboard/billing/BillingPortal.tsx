import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  active: "Ativa",
  trialing: "Período de teste",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  incomplete: "Incompleta",
};

export function BillingPortal() {
  const { data: subscription, isLoading } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { returnUrl: window.location.href },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível abrir o portal de cobrança.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Assinatura
        </CardTitle>
        <CardDescription>Gerencie seu plano e método de pagamento</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                {statusLabels[subscription.status] || subscription.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Período atual</span>
              <span className="text-sm">
                {new Date(subscription.current_period_start).toLocaleDateString("pt-BR")} —{" "}
                {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
              </span>
            </div>
            {subscription.cancel_at_period_end && (
              <p className="text-sm text-amber-600">
                Sua assinatura será cancelada ao final do período atual.
              </p>
            )}
            <Button onClick={openPortal} disabled={portalLoading} className="w-full">
              {portalLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Abrindo...
                </>
              ) : (
                <>
                  Gerenciar assinatura
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">Você ainda não possui uma assinatura ativa.</p>
            <Button variant="outline" onClick={() => window.location.href = "/pricing"}>
              Ver planos disponíveis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
