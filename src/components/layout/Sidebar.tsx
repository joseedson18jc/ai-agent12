import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Wallet,
  Truck,
  FlaskConical,
  BarChart3,
  Settings,
  ChevronDown,
  LogOut,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  Inbox,
  ExternalLink,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import webLeadService, { WEB_LEAD_STATS_KEY } from "@/services/webLead.service";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { BrandMark, InitialsAvatar } from "@/components/imperio";

interface NavChild {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: NavChild[];
  /** Shows the count of new website requests. */
  badge?: "webLeads";
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: "Operação",
    items: [
      { label: "Painel", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Vendas / OS", icon: ShoppingCart, path: "/vendas" },
      { label: "Clientes", icon: Users, path: "/clientes" },
      { label: "Receitas", icon: FileText, path: "/receitas" },
      { label: "Produtos", icon: Package, path: "/produtos" },
      { label: "Pedidos do site", icon: Inbox, path: "/pedidos-site", badge: "webLeads" },
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        label: "Financeiro",
        icon: Wallet,
        children: [
          { label: "Contas a Pagar", path: "/financeiro/contas-pagar", icon: ArrowUpCircle },
          { label: "Contas a Receber", path: "/financeiro/contas-receber", icon: ArrowDownCircle },
          { label: "Caixa", path: "/financeiro/caixa", icon: Landmark },
        ],
      },
      { label: "Fornecedores", icon: Truck, path: "/fornecedores" },
      { label: "Laboratórios", icon: FlaskConical, path: "/laboratorios" },
      { label: "Relatórios", icon: BarChart3, path: "/relatorios" },
    ],
  },
  {
    title: "Sistema",
    items: [{ label: "Configurações", icon: Settings, path: "/configuracoes" }],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const linkBase =
  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60";

function Indicator({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gold transition-all duration-300",
        active ? "opacity-100" : "opacity-0 scale-y-50",
      )}
    />
  );
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [openFinance, setOpenFinance] = useState(location.pathname.startsWith("/financeiro"));
  const { data: leadStats } = useQuery({
    queryKey: WEB_LEAD_STATS_KEY,
    queryFn: () => webLeadService.stats().then((r) => r.data),
    refetchInterval: 60_000,
    enabled: !!user,
  });
  const newLeads = leadStats?.newCount ?? 0;

  const closeOnMobile = () => {
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-[hsl(224_52%_6%/0.55)] backdrop-blur-[2px] transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "ink-texture fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col text-sidebar-foreground transition-transform duration-300 ease-out",
          "lg:static lg:z-auto lg:translate-x-0",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 ring-1 ring-gold/40">
              <BrandMark className="h-7 w-7 text-gold" />
            </div>
            <div className="leading-none">
              <p className="font-display text-[19px] font-semibold tracking-tight text-white">Óticas Império</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/80">Gestão da ótica</p>
            </div>
          </div>
          <div className="gold-rule mt-5 opacity-60" />
        </div>

        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-6 pb-6 pl-3">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    if (item.children) {
                      const childActive = item.children.some((c) => location.pathname.startsWith(c.path));
                      return (
                        <Collapsible key={item.label} open={openFinance} onOpenChange={setOpenFinance}>
                          <CollapsibleTrigger asChild>
                            <button
                              className={cn(
                                linkBase,
                                "w-full",
                                childActive ? "text-white" : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white",
                              )}
                            >
                              <Indicator active={childActive && !openFinance} />
                              <item.icon className={cn("h-[18px] w-[18px]", childActive ? "text-gold" : "")} />
                              <span className="flex-1 text-left">{item.label}</span>
                              <ChevronDown
                                className={cn("h-4 w-4 opacity-60 transition-transform", openFinance && "rotate-180")}
                              />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-0.5 space-y-0.5 overflow-hidden border-l border-white/10 ml-[21px] pl-2 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                            {item.children.map((child) => (
                              <NavLink
                                key={child.path}
                                to={child.path}
                                onClick={closeOnMobile}
                                className={({ isActive }) =>
                                  cn(
                                    "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors",
                                    isActive
                                      ? "bg-white/10 text-white"
                                      : "text-sidebar-foreground/60 hover:bg-white/5 hover:text-white",
                                  )
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    <child.icon className={cn("h-3.5 w-3.5", isActive && "text-gold")} />
                                    {child.label}
                                  </>
                                )}
                              </NavLink>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    }

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path!}
                        onClick={closeOnMobile}
                        className={({ isActive }) =>
                          cn(
                            linkBase,
                            isActive
                              ? "bg-white/[0.07] text-white"
                              : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white",
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Indicator active={isActive} />
                            <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-gold")} />
                            <span className="flex-1">{item.label}</span>
                            {item.badge === "webLeads" && newLeads > 0 && (
                              <span
                                className="num min-w-[20px] rounded-full bg-gold px-1.5 py-0.5 text-center text-[10.5px] font-bold leading-none text-primary"
                                title={`${newLeads} ${newLeads === 1 ? "pedido novo" : "pedidos novos"}`}
                              >
                                {newLeads > 99 ? "99+" : newLeads}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Public website */}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-gold/25 px-3 py-2 text-[12.5px] font-medium text-gold/90 transition-colors hover:bg-gold/10 hover:text-gold"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="flex-1">Ver site da loja</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/40">nova aba</span>
        </a>

        {/* User */}
        <div className="m-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center gap-3">
            <InitialsAvatar name={user?.name} size="sm" className="bg-gold text-primary ring-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name || "Usuário"}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/50">{user?.email || ""}</p>
            </div>
            <button
              onClick={logout}
              title="Sair"
              className="rounded-md p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
