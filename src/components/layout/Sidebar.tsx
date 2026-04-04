import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Truck,
  FlaskConical,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: { label: string; path: string; icon: React.ElementType }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Clientes", icon: Users, path: "/clientes" },
  { label: "Produtos", icon: Package, path: "/produtos" },
  { label: "Vendas / OS", icon: ShoppingCart, path: "/vendas" },
  {
    label: "Financeiro",
    icon: DollarSign,
    children: [
      { label: "Contas a Pagar", path: "/financeiro/contas-pagar", icon: DollarSign },
      { label: "Contas a Receber", path: "/financeiro/contas-receber", icon: DollarSign },
      { label: "Caixa", path: "/financeiro/caixa", icon: DollarSign },
    ],
  },
  { label: "Fornecedores", icon: Truck, path: "/fornecedores" },
  { label: "Laboratórios", icon: FlaskConical, path: "/laboratorios" },
  { label: "Relatórios", icon: BarChart3, path: "/relatorios" },
  { label: "Configurações", icon: Settings, path: "/configuracoes" },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [openSubmenus, setOpenSubmenus] = useState<string[]>(["Financeiro"]);

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const isChildActive = (children: NavItem["children"]) => {
    return children?.some((child) => location.pathname.startsWith(child.path));
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Botão hambúrguer para mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={onToggle}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">
            Ótica<span className="text-blue-600">Gestão</span>
          </h1>
        </div>

        {/* Navegação */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              if (item.children) {
                const isSubmenuOpen = openSubmenus.includes(item.label);
                const isActive = isChildActive(item.children);

                return (
                  <Collapsible
                    key={item.label}
                    open={isSubmenuOpen}
                    onOpenChange={() => toggleSubmenu(item.label)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "text-blue-600 bg-blue-50"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {isSubmenuOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-8 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={() => {
                            if (window.innerWidth < 1024) onToggle();
                          }}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                              isActive
                                ? "text-blue-600 bg-blue-50 font-medium"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            )
                          }
                        >
                          <span>{child.label}</span>
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
                  onClick={() => {
                    if (window.innerWidth < 1024) onToggle();
                  }}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )
                  }
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Informações do usuário */}
        <div className="border-t border-gray-200 p-4">
          <Separator className="mb-4" />
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
                {user ? getInitials(user.name) : "??"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || "Usuário"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-red-600"
              onClick={logout}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
