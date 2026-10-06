import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCheckout } from "@/hooks/useCheckout";

interface CheckoutButtonProps {
  priceId: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}

export function CheckoutButton({ priceId, label = "Assinar agora", variant = "default", className }: CheckoutButtonProps) {
  const { checkout, loading } = useCheckout();

  return (
    <Button
      onClick={() => checkout(priceId)}
      disabled={loading}
      variant={variant}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processando...
        </>
      ) : (
        label
      )}
    </Button>
  );
}
