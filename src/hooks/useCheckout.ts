import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkout = async (priceId: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Erro", description: "Faça login para continuar.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId,
          successUrl: `${window.location.origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({
        title: "Erro no checkout",
        description: err.message || "Não foi possível iniciar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { checkout, loading };
}
