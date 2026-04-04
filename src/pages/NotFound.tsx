import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, SearchX } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center max-w-md px-4">
        <SearchX className="mx-auto h-20 w-20 text-muted-foreground mb-6" />
        <h1 className="mb-2 text-6xl font-bold text-primary">404</h1>
        <h2 className="mb-4 text-2xl font-semibold">
          Pagina nao encontrada
        </h2>
        <p className="mb-8 text-muted-foreground">
          Desculpe, a pagina que voce esta procurando nao existe ou foi movida.
          Verifique o endereco digitado ou volte para a pagina inicial.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Voltar ao Inicio
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Voltar a Pagina Anterior
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
