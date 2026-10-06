import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutButton } from "@/components/dashboard/billing/CheckoutButton";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Básico",
    price: "R$ 29",
    period: "/mês",
    description: "Ideal para freelancers e profissionais autônomos",
    priceId: "price_basic",
    features: [
      "Até 100 transações/mês",
      "Relatórios financeiros básicos",
      "1 usuário",
      "Suporte por e-mail",
    ],
  },
  {
    name: "Profissional",
    price: "R$ 79",
    period: "/mês",
    description: "Para pequenas e médias empresas",
    priceId: "price_pro",
    popular: true,
    features: [
      "Transações ilimitadas",
      "Relatórios avançados e dashboards",
      "Até 5 usuários",
      "Detecção de anomalias com IA",
      "Suporte prioritário",
      "Exportação de dados",
    ],
  },
  {
    name: "Empresarial",
    price: "R$ 199",
    period: "/mês",
    description: "Para empresas em crescimento",
    priceId: "price_enterprise",
    features: [
      "Tudo do plano Profissional",
      "Usuários ilimitados",
      "API de integração",
      "Relatórios personalizados",
      "Gerente de conta dedicado",
      "SLA garantido",
      "Treinamento da equipe",
    ],
  },
];

export default function Pricing() {
  const { data: subscription } = useSubscription();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Escolha o plano ideal para você
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Simplifique sua gestão financeira com ferramentas inteligentes.
            Cancele a qualquer momento.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col ${
                plan.popular ? "border-primary shadow-lg scale-105" : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Mais popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {subscription?.price_id === plan.priceId ? (
                  <Button variant="outline" className="w-full" disabled>
                    Plano atual
                  </Button>
                ) : (
                  <CheckoutButton
                    priceId={plan.priceId}
                    label={subscription ? "Trocar plano" : "Assinar agora"}
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
                  />
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="link" onClick={() => navigate("/")}>
            ← Voltar ao painel
          </Button>
        </div>
      </div>
    </div>
  );
}
