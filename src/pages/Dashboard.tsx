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
  Tooltip, ResponsiveContainer, Legend,
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
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
      },
      {
        title: "Vendas do Mês",
        value: formatCurrency(data.monthlySales ?? 0),
        icon: TrendingUp,
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
      },
      ...(user?.role === "admin"
        ? [
            {
              title: "Lucro Estimado",
              value: formatCurrency(data.estimatedProfit ?? 0),
              icon: BarChart3,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              border: "border-emerald-200",
            },
          ]
        : []),
      {
        title: "Qtd Vendas",
        value: String(data.salesCount ?? 0),
        icon: ShoppingCart,
        color: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-200",
      },
      {
        title: "Ticket Médio",
        value: formatCurrency(data.averageTicket ?? 0),
        icon: CreditCard,
        color: "text-orange-600",
        bg: "bg-orange-50",
        border: "border-orange-200",
      },
      {
        title: "Estoque Baixo",
        value: String(data.lowStockCount ?? 0),
        icon: Package,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        badge: data.lowStockCount > 0,
      },
      {
        title: "Contas a Pagar (7 dias)",
        value: formatCurrency(data.upcomingPayables ?? 0),
        icon: CalendarClock,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
      },
      {
        title: "Parcelas Atrasadas",
        value: String(data.overdueInstallments ?? 0),
        icon: AlertTriangle,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
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
      <div className="space-y-6">
        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting}, {user?.name?.split(" ")[0] || "Usuário"}!
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Aqui está o resumo da sua ótica hoje.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/sales/new")} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" /> Nova Venda
            </Button>
            <Button onClick={() => navigate("/customers/new")} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Novo Cliente
            </Button>
            <Button onClick={() => navigate("/products/new")} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" /> Novo Produto
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <Card key={kpi.title} className={`border ${kpi.border}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 truncate">{kpi.title}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                        {kpi.badge && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            !
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Evolução de Vendas</CardTitle>
                <div className="flex gap-1">
                  {([
                    { key: "7d", label: "7 dias" },
                    { key: "30d", label: "30 dias" },
                    { key: "12m", label: "12 meses" },
                  ] as const).map((p) => (
                    <Button
                      key={p.key}
                      variant={chartPeriod === p.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChartPeriod(p.key)}
                      className="text-xs h-7"
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="w-full h-[280px]" />
              ) : chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[280px] text-gray-400">
                  <BarChart3 className="w-10 h-10 mb-2" />
                  <p className="text-sm">Nenhum dado de vendas para o período.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#999" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#999" tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Vendas"]}
                      contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Top 5 Produtos</CardTitle>
              <CardDescription>Mais vendidos este mês</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="w-full h-[280px]" />
              ) : !data?.topProducts?.length ? (
                <div className="flex flex-col items-center justify-center h-[280px] text-gray-400">
                  <BoxIcon className="w-10 h-10 mb-2" />
                  <p className="text-sm">Sem dados de produtos ainda.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} vendas`, "Quantidade"]}
                      contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
                    />
                    <Bar dataKey="quantity" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Sales + Reminders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Vendas Recentes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/sales")} className="text-xs">
                  Ver todas <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : !data?.recentSales?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <ShoppingBag className="w-8 h-8 mb-2" />
                  <p className="text-sm">Nenhuma venda registrada ainda.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate("/sales/new")}
                  >
                    Registrar primeira venda
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentSales.map((sale: any) => (
                    <div
                      key={sale.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/sales/${sale.id}`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold">
                        {sale.customerName?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {sale.customerName || "Cliente avulso"}
                        </p>
                        <p className="text-xs text-gray-500">{sale.date}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
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
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Lembretes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/reminders")} className="text-xs">
                  Ver todos <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-40" />
                        <Skeleton className="h-3 w-24" />
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
                <div className="space-y-3">
                  {data.reminders.map((reminder: any) => (
                    <div
                      key={reminder.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-xs ${
                        reminder.type === "overdue"
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-600"
                      }`}>
                        {reminder.type === "overdue" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {reminder.title}
                        </p>
                        <p className="text-xs text-gray-500">{reminder.description}</p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {reminder.date}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions (Mobile) */}
        <div className="grid grid-cols-3 gap-3 sm:hidden">
          <Button
            onClick={() => navigate("/sales/new")}
            className="h-20 flex-col gap-1 bg-green-600 hover:bg-green-700"
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="text-xs">Nova Venda</span>
          </Button>
          <Button
            onClick={() => navigate("/customers/new")}
            className="h-20 flex-col gap-1 bg-blue-600 hover:bg-blue-700"
          >
            <Users className="w-6 h-6" />
            <span className="text-xs">Novo Cliente</span>
          </Button>
          <Button
            onClick={() => navigate("/products/new")}
            className="h-20 flex-col gap-1 bg-purple-600 hover:bg-purple-700"
          >
            <BoxIcon className="w-6 h-6" />
            <span className="text-xs">Novo Produto</span>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
