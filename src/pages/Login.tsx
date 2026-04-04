import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Glasses, Loader2, ShieldCheck, TrendingUp, Users } from "lucide-react";

const FEATURES = [
  { icon: Users, text: "Gestão completa de clientes e receitas" },
  { icon: TrendingUp, text: "Relatórios de vendas em tempo real" },
  { icon: ShieldCheck, text: "Controle financeiro e de estoque" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Informe seu e-mail."); return; }
    if (!password.trim()) { setError("Informe sua senha."); return; }

    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message || "E-mail ou senha inválidos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 -right-16 w-48 h-48 rounded-full bg-white/10" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Glasses className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold">Óticas Império</span>
        </div>

        {/* Main text */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-bold leading-tight">
              Sistema de Gestão<br />para Óticas
            </h2>
            <p className="text-blue-200 mt-3 text-lg">
              Tudo que você precisa para gerenciar sua ótica com eficiência.
            </p>
          </div>
          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4" />
                </div>
                <span className="text-blue-100 text-sm">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-blue-300 text-xs relative z-10">
          &copy; {new Date().getFullYear()} Óticas Império. Todos os direitos reservados.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg mb-3">
              <Glasses className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Óticas Império</h1>
            <p className="text-gray-500 text-sm mt-1">Sistema de Gestão</p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Bem-vindo!</h2>
              <p className="text-gray-500 text-sm mt-1">Entre com suas credenciais de acesso</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                  className="h-11 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    className="h-11 rounded-xl border-gray-200 pr-10 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Entrando...</>
                ) : (
                  "Entrar no Sistema"
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5 lg:hidden">
            &copy; {new Date().getFullYear()} Óticas Império. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
