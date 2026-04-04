import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Glasses } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600 text-white mb-6 shadow-xl">
          <Glasses className="w-10 h-10" />
        </div>

        {/* 404 */}
        <p className="text-8xl font-black text-blue-600 leading-none">404</p>

        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Página não encontrada
        </h2>
        <p className="mt-2 text-gray-500 text-sm leading-relaxed">
          A página que você está procurando não existe ou foi movida.<br />
          Verifique o endereço digitado ou volte ao início.
        </p>

        {/* Path hint */}
        {location.pathname !== "/" && (
          <div className="mt-4 inline-block bg-gray-100 rounded-lg px-3 py-1.5">
            <code className="text-xs text-gray-500 font-mono">{location.pathname}</code>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button asChild className="bg-blue-600 hover:bg-blue-700 rounded-xl h-11 px-6">
            <Link to="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Ir ao Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="rounded-xl h-11 px-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
