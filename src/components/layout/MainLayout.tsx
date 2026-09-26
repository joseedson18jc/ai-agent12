import { useState } from "react";
import { NavLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Bell, LayoutDashboard, Users, Package, ShoppingCart, Wallet, Menu, Plus, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Sidebar from "./Sidebar";
import GlobalSearch from "./GlobalSearch";
import { useAuth } from "@/contexts/AuthContext";
import { BrandMark, InitialsAvatar } from "@/components/imperio";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import webLeadService, { WEB_LEAD_STATS_KEY } from "@/services/webLead.service";

interface MainLayoutProps {
  children: React.ReactNode;
}

const mobileBottomNav = [
  { label: "Painel", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Vendas", icon: ShoppingCart, path: "/vendas" },
  { label: "Clientes", icon: Users, path: "/clientes" },
  { label: "Produtos", icon: Package, path: "/produtos" },
  { label: "Financeiro", icon: Wallet, path: "/financeiro/contas-pagar" },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: leadStats } = useQuery({
    queryKey: WEB_LEAD_STATS_KEY,
    queryFn: () => webLeadService.stats().then((r) => r.data),
    refetchInterval: 60_000,
    enabled: isAuthenticated,
  });
  const newLeads = leadStats?.newCount ?? 0;

  // Every page that uses the layout is private — send visitors to login.
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="flex h-[100dvh] bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-3 backdrop-blur-md sm:px-5 lg:px-8">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground/80 hover:bg-muted lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 lg:hidden">
            <BrandMark className="h-6 w-6 text-primary" />
          </div>

          <div className="flex flex-1 justify-end sm:justify-start">
            <div className="hidden w-full max-w-md sm:block">
              <GlobalSearch />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button size="sm" className="hidden md:inline-flex" onClick={() => navigate("/vendas/nova")}>
              <Plus className="h-4 w-4" /> Nova venda
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-full"
              onClick={() => navigate("/pedidos-site")}
              aria-label={newLeads > 0 ? `${newLeads} pedidos novos do site` : "Pedidos do site"}
              title={newLeads > 0 ? `${newLeads} ${newLeads === 1 ? "pedido novo" : "pedidos novos"} do site` : "Pedidos do site"}
            >
              <Bell className="h-[18px] w-[18px] text-foreground/70" />
              {newLeads > 0 && (
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-gold ring-2 ring-background" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-muted md:pr-3">
                  <InitialsAvatar name={user?.name} size="sm" />
                  <span className="hidden text-sm font-semibold md:inline">{user?.name?.split(" ")[0] || "Usuário"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
                  <Settings className="mr-2 h-4 w-4" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-danger focus:text-danger" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile search row */}
        <div className="border-b border-border/70 bg-background px-3 py-2 sm:hidden">
          <GlobalSearch />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-3 pb-28 pt-5 sm:px-5 sm:pt-7 lg:px-8 lg:pb-10">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom navigation — below lg */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="flex">
          {mobileBottomNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "absolute top-0 h-[3px] w-8 rounded-b-full bg-gold transition-opacity",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
