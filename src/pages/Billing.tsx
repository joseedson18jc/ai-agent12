import { BillingPortal } from "@/components/dashboard/billing/BillingPortal";
import { InvoiceHistory } from "@/components/dashboard/billing/InvoiceHistory";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Billing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Cobrança e Assinatura</h1>
          <p className="text-muted-foreground">
            Gerencie sua assinatura, método de pagamento e faturas.
          </p>
        </div>

        <div className="space-y-8">
          <BillingPortal />
          <InvoiceHistory />
        </div>

        <div className="mt-8">
          <Button variant="link" onClick={() => navigate("/")}>
            ← Voltar ao painel
          </Button>
        </div>
      </div>
    </div>
  );
}
