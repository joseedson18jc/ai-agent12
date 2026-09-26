import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { BrandMark } from "@/components/imperio";

const PILLARS = [
  { n: "01", title: "Clientes & receitas", text: "Histórico óptico completo, com alerta de receitas vencendo." },
  { n: "02", title: "Vendas & OS", text: "Da lente no laboratório à retirada, cada etapa acompanhada." },
  { n: "03", title: "Preço inteligente", text: "Preço mínimo real calculado com todos os custos do negócio." },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState(() => localStorage.getItem("lastEmail") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || "/dashboard";

  useEffect(() => {
    document.title = "Entrar · Óticas Império";
  }, []);

  if (!isLoading && isAuthenticated) return <Navigate to={from} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Informe seu e-mail.");
    if (!password) return setError("Informe sua senha.");

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      localStorage.setItem("lastEmail", email.trim().toLowerCase());
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || "E-mail ou senha inválidos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Brand panel */}
      <aside className="ink-texture relative hidden w-[46%] flex-col justify-between overflow-hidden p-12 text-sidebar-foreground lg:flex xl:p-16">
        {/* Decorative lenses */}
        <svg
          className="pointer-events-none absolute -right-40 top-1/2 h-[640px] w-[640px] -translate-y-1/2 text-gold/[0.09]"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden="true"
        >
          {[90, 74, 58, 42].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} stroke="currentColor" strokeWidth="0.6" />
          ))}
          <circle cx="100" cy="100" r="26" stroke="currentColor" strokeWidth="1.2" />
        </svg>

        <div className="relative flex items-center gap-3 animate-rise">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 ring-1 ring-gold/40">
            <BrandMark className="h-7 w-7 text-gold" />
          </div>
          <div className="leading-none">
            <p className="font-display text-xl font-semibold text-white">Óticas Império</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/80">Gestão da ótica</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="eyebrow mb-5 !text-gold/80 animate-rise" style={{ animationDelay: "80ms" }}>
            Desde a receita até a retirada
          </p>
          <h1
            className="font-display text-[3.25rem] font-medium leading-[1.02] text-white animate-rise"
            style={{ animationDelay: "140ms" }}
          >
            Cada olhar,
            <br />
            <span className="italic text-gold">bem cuidado.</span>
          </h1>
          <div className="mt-10 space-y-6">
            {PILLARS.map((p, i) => (
              <div
                key={p.n}
                className="flex gap-4 animate-rise"
                style={{ animationDelay: `${240 + i * 80}ms` }}
              >
                <span className="num w-6 shrink-0 pt-0.5 font-display text-sm text-gold/70">{p.n}</span>
                <div className="border-l border-white/10 pl-4">
                  <p className="font-semibold text-white">{p.title}</p>
                  <p className="mt-0.5 text-sm text-sidebar-foreground/60">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-sidebar-foreground/40">© {new Date().getFullYear()} Óticas Império</p>
      </aside>

      {/* Form */}
      <main className="flex flex-1 flex-col">
        {/* Mobile brand band */}
        <div className="ink-texture px-6 pb-10 pt-10 text-center lg:hidden">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 ring-1 ring-gold/40">
            <BrandMark className="h-9 w-9 text-gold" />
          </div>
          <p className="font-display text-2xl font-semibold text-white">Óticas Império</p>
          <p className="mt-1 text-sm italic text-gold/80 font-display">Cada olhar, bem cuidado.</p>
        </div>

        <div className="-mt-6 flex flex-1 items-start justify-center px-5 pb-10 lg:mt-0 lg:items-center">
          <div className="w-full max-w-[400px] rounded-2xl bg-card p-6 shadow-lg ring-1 ring-border sm:p-8 lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 animate-rise">
            <p className="eyebrow">Área restrita</p>
            <h2 className="mt-1 font-display text-3xl font-semibold">Bem-vinda de volta</h2>
            <p className="mt-2 text-sm text-muted-foreground">Entre com seu e-mail e senha para acessar o sistema.</p>
            <div className="gold-rule my-7" />

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="voce@oticaimperio.com.br"
                    className="h-11 pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 pl-10 pr-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="group h-12 w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Entrando…
                  </>
                ) : (
                  <>
                    Entrar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Problemas para entrar? Fale com a administração da loja.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
