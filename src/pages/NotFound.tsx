import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { BrandMark } from "@/components/imperio";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background p-6">
      {/* Eye-chart backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 font-display font-semibold text-foreground/[0.04] select-none"
      >
        <span className="text-[9rem] leading-none">E</span>
        <span className="text-7xl tracking-[0.3em]">F P</span>
        <span className="text-5xl tracking-[0.35em]">T O Z</span>
        <span className="text-3xl tracking-[0.4em]">L P E D</span>
      </div>

      <div className="relative max-w-md text-center animate-rise">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary ring-1 ring-gold/40 shadow-lg">
          <BrandMark className="h-10 w-10 text-gold" />
        </div>
        <p className="eyebrow">Erro 404</p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Esta página saiu <span className="italic text-gold">de foco.</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          O endereço que você procurou não existe ou foi movido.
        </p>
        {location.pathname !== "/" && (
          <code className="mt-4 inline-block rounded-md bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground">
            {location.pathname}
          </code>
        )}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/dashboard">
              <Home className="h-4 w-4" /> Ir ao painel
            </Link>
          </Button>
          <Button variant="outline" size="lg" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
