import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import dashboardService from "@/services/dashboard.service";
import { formatCurrency } from "@/utils/formatters";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, TrendingUp, ShoppingCart, BarChart3, Package,
  AlertTriangle, Clock, CreditCard, Plus, Users, BoxIcon,
  CalendarClock, ArrowRight, ShoppingBag,
} from "lucide-react";

type Period = "7d" | "30d" | "12m";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [chartPeriod, setChartPeriod] = useState<Period>("7d");
  const [error, setError] = useState("");

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const result = await dashboardService.getData();
      setData(result);
    } catch (err: any) {
      setError("Não foi possível carregar o dashboard. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!data?.salesChart) return [];
    return data.salesChart[chartPeriod] || [];
  }, [data, chartPeriod]);

  const kpis = useMemo(() => {
    if (!data) return [];
    return [
      {
        title: "Vendas do Dia",
        value: formatCurrency(data.dailySales ?? 0),
        icon: DollarSign,
        gradient: "from-blue-500 to-blue-600",
        textColor: "text-white",
      },
      {
        title: "Vendas do Mês",
        value: formatCurrency(data.monthlySales ?? 0),
        icon: TrendingUp,
        gradient: "from-emerald-500 to-emerald-600",
        textColor: "text-white",
      },
      ...(user?.role === "admin"
        ? [
            {
              title: "Lucro Estimado",
              value: formatCurrency(data.estimatedProfit ?? 0),
              icon: BarChart3,
              gradient: "from-teal-500 to-teal-600",
              textColor: "text-white",
            },
          ]
        : []),
      {
        title: "Qtd Vendas",
        value: String(data.salesCount ?? 0),
        icon: ShoppingCart,
        gradient: "from-violet-500 to-violet-600",
        textColor: "text-white",
      },
      {
        title: "Ticket Médio",
        value: formatCurrency(data.averageTicket ?? 0),
        icon: CreditCard,
        gradient: "from-orange-500 to-orange-600",
        textColor: "text-white",
      },
      {
        title: "Estoque Baixo",
        value: String(data.lowStockCount ?? 0),
        icon: Package,
        gradient: data.lowStockCount > 0 ? "from-red-500 to-red-600" : "from-slate-400 to-slate-500",
        textColor: "text-white",
        badge: data.lowStockCount > 0,
      },
      {
        title: "Contas (7 dias)",
        value: formatCurrency(data.upcomingPayables ?? 0),
        icon: CalendarClock,
        gradient: "from-amber-500 to-amber-600",
        textColor: "text-white",
      },
      {
        title: "Parcelas Atrasadas",
        value: String(data.overdueInstallments ?? 0),
        icon: AlertTriangle,
        gradient: data.overdueInstallments > 0 ? "from-rose-500 to-rose-600" : "from-slate-400 to-slate-500",
        textColor: "text-white",
        badge: data.overdueInstallments > 0,
      },
    ];
  }, [data, user]);

  if (error && !data) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadDashboard}>Tentar novamente</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Greeting + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {greeting}, {user?.name?.split(" ")[0] || "Usuário"}!
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Resumo da sua ótica hoje.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate("/vendas/nova")}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> Nova Venda
            </Button>
            <Button
              onClick={() => navigate("/clientes/novo")}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> Novo Cliente
            </Button>
            <Button
              onClick={() => navigate("/produtos/novo")}
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> Novo Produto
            </Button>
          </div>
        </div>

        {/* KPI Cards — 2 cols mobile, 4 cols desktop */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-3" />
                  <Skeleton className="h-7 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpis.map((kpi) => (
              <div
                key={kpi.title}
                className={`rounded-xl bg-gradient-to-br ${kpi.gradient} p-4 shadow-md flex flex-col gap-2 relative overflow-hidden`}
              >
                {/* Icon background circle */}
                <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
                <div className="flex items-center justify-between">
                  <p className="text-white/80 text-xs font-medium leading-tight">{kpi.title}</p>
                  {kpi.badge && (
                    <Badge className="bg-white/20 text-white border-0 text-[10px] px-1.5 py-0 h-4">!</Badge>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <p className="text-white text-lg sm:text-xl font-bold leading-none">{kpi.value}</p>
                </div>
                <kpi.icon className="absolute right-3 bottom-3 w-6 h-6 text-white/20" />
              </div>
            ))}
          </div>
        )}

        {/* Charts — stacked on mobile/tablet, side-by-side on lg+ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">Evolução de Vendas</CardTitle>
                <div className="flex gap-1">
                  {([
                    { key: "7d", label: "7d" },
                    { key: "30d", label: "30d" },
                    { key: "12m", label: "12m" },
                  ] as const).map((p) => (
                    <Button
                      key={p.key}
                      variant={chartPeriod === p.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChartPeriod(p.key)}
                      className="text-xs h-7 px-2.5"
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              {loading ? (
                <Skeleton className="w-full h-[220px]" />
              ) : chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] text-gray-400">
                  <BarChart3 className="w-10 h-10 mb-2" />
                  <p className="text-sm">Nenhum dado para o período.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#ccc" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#ccc" tickFormatter={(v) => `R$${v}`} width={60} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Vendas"]}
                      contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#3b82f6" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-base font-semibold">Top 5 Produtos</CardTitle>
              <CardDescription className="text-xs">Mais vendidos este mês</CardDescription>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              {loading ? (
                <Skeleton className="w-full h-[220px]" />
              ) : !data?.topProducts?.length ? (
                <div className="flex flex-col items-center justify-center h-[220px] text-gray-400">
                  <BoxIcon className="w-10 h-10 mb-2" />
                  <p className="text-sm">Sem dados ainda.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.topProducts} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="#ccc" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 10 }}
                      width={90}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} vendas`, "Qtd"]}
                      contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="quantity" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Sales + Reminders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent Sales */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Vendas Recentes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/vendas")} className="text-xs h-7 px-2">
                  Ver todas <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : !data?.recentSales?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <ShoppingBag className="w-8 h-8 mb-2" />
                  <p className="text-sm">Nenhuma venda ainda.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/vendas/nova")}>
                    Registrar venda
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {data.recentSales.map((sale: any) => (
                    <div
                      key={sale.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/vendas/${sale.id}`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
                        {sale.customerName?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {sale.customerName || "Cliente avulso"}
                        </p>
                        <p className="text-xs text-gray-400">{sale.date}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                        {formatCurrency(sale.total ?? 0)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reminders */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Lembretes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-xs h-7 px-2">
                  Ver todos <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-36" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !data?.reminders?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Clock className="w-8 h-8 mb-2" />
                  <p className="text-sm">Nenhum lembrete pendente.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {data.reminders.map((reminder: any) => (
                    <div
                      key={reminder.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          reminder.type === "overdue"
                            ? "bg-red-100 text-red-600"
                            : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        {reminder.type === "overdue" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{reminder.title}</p>
                        <p className="text-xs text-gray-400 truncate">{reminder.description}</p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{reminder.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile Quick Actions */}
        <div className="grid grid-cols-3 gap-3 sm:hidden">
          <button
            onClick={() => navigate("/vendas/nova")}
            className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md active:scale-95 transition-transform"
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="text-xs font-medium">Nova Venda</span>
          </button>
          <button
            onClick={() => navigate("/clientes/novo")}
            className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md active:scale-95 transition-transform"
          >
            <Users className="w-6 h-6" />
            <span className="text-xs font-medium">Novo Cliente</span>
          </button>
          <button
            onClick={() => navigate("/produtos/novo")}
            className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-md active:scale-95 transition-transform"
          >
            <BoxIcon className="w-6 h-6" />
            <span className="text-xs font-medium">Novo Produto</span>
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
