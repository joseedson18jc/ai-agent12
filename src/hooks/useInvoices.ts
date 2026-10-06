import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Invoice {
  id: string;
  customer_id: string;
  stripe_invoice_id: string;
  stripe_subscription_id: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  invoice_url: string | null;
  hosted_invoice_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async (): Promise<Invoice[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });
}
