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
  CalendarClock, ArrowRight, ShoppingBag, Sparkles, Lightbulb,
  TrendingDown, Target, Zap, RefreshCw, Star,
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

        {/* AI Insights */}
        {!loading && data && <AIInsights data={data} navigate={navigate} />}

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

// ── AI Insights Component ──
interface Insight {
  icon: React.ElementType;
  title: string;
  description: string;
  type: "success" | "warning" | "tip" | "action";
  action?: { label: string; path: string };
}

function generateInsights(data: any): Insight[] {
  const insights: Insight[] = [];
  const dailySales = data.dailySales ?? 0;
  const monthlySales = data.monthlySales ?? 0;
  const salesCount = data.salesCount ?? 0;
  const averageTicket = data.averageTicket ?? 0;
  const lowStockCount = data.lowStockCount ?? 0;
  const overdueInstallments = data.overdueInstallments ?? 0;
  const upcomingPayables = data.upcomingPayables ?? 0;
  const estimatedProfit = data.estimatedProfit ?? 0;

  // Calculate day of month and projected monthly
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projectedMonthly = dayOfMonth > 1 ? (monthlySales / dayOfMonth) * daysInMonth : 0;
  const dailyAverage = dayOfMonth > 1 ? monthlySales / dayOfMonth : 0;

  // 1. Daily performance vs average
  if (dailyAverage > 0 && dailySales > 0) {
    if (dailySales > dailyAverage * 1.3) {
      insights.push({
        icon: TrendingUp,
        title: "Dia acima da média!",
        description: `Hoje você vendeu ${formatCurrency(dailySales)}, que é ${((dailySales / dailyAverage - 1) * 100).toFixed(0)}% acima da sua média diária de ${formatCurrency(dailyAverage)}.`,
        type: "success",
      });
    } else if (dailySales < dailyAverage * 0.5) {
      insights.push({
        icon: TrendingDown,
        title: "Vendas abaixo do esperado hoje",
        description: `A média diária é ${formatCurrency(dailyAverage)}, mas hoje só foi vendido ${formatCurrency(dailySales)}. Considere promoções relâmpago ou contato com clientes que têm receitas vencendo.`,
        type: "warning",
        action: { label: "Ver clientes", path: "/clientes" },
      });
    }
  }

  // 2. Ticket médio insights
  if (averageTicket > 0) {
    if (averageTicket < 200) {
      insights.push({
        icon: Target,
        title: "Oportunidade: aumentar o ticket médio",
        description: `Seu ticket médio é ${formatCurrency(averageTicket)}. Ofereça lentes com tratamento premium ou acessórios no momento da venda. Óticas que fazem cross-sell aumentam o ticket em até 40%.`,
        type: "tip",
        action: { label: "Ver produtos", path: "/produtos" },
      });
    } else if (averageTicket > 500) {
      insights.push({
        icon: Star,
        title: "Excelente ticket médio!",
        description: `Com ${formatCurrency(averageTicket)} de ticket médio, você está vendendo bem produtos de valor agregado. Continue oferecendo lentes multifocais e armações premium.`,
        type: "success",
      });
    }
  }

  // 3. Stock alerts
  if (lowStockCount > 0) {
    insights.push({
      icon: Package,
      title: `${lowStockCount} produto(s) com estoque baixo`,
      description: `Repor estoque evita perder vendas. Produtos sem estoque = clientes comprando na concorrência. Verifique os itens e faça pedidos aos fornecedores.`,
      type: "warning",
      action: { label: "Ver estoque", path: "/produtos" },
    });
  }

  // 4. Overdue installments
  if (overdueInstallments > 0) {
    insights.push({
      icon: AlertTriangle,
      title: `${overdueInstallments} parcela(s) em atraso`,
      description: `Parcelas atrasadas afetam seu fluxo de caixa. Entre em contato com os clientes via WhatsApp — cobranças amigáveis recuperam até 70% dos valores.`,
      type: "action",
      action: { label: "Ver financeiro", path: "/financeiro/contas-receber" },
    });
  }

  // 5. Bills to pay
  if (upcomingPayables > 0) {
    insights.push({
      icon: CalendarClock,
      title: `${formatCurrency(upcomingPayables)} em contas nos próximos 7 dias`,
      description: `Planeje seu fluxo de caixa para cobrir essas despesas. Se necessário, priorize cobranças de parcelas atrasadas para equilibrar as contas.`,
      type: "warning",
      action: { label: "Ver contas", path: "/financeiro/contas-pagar" },
    });
  }

  // 6. Monthly projection
  if (projectedMonthly > 0 && dayOfMonth >= 5) {
    const projText = formatCurrency(projectedMonthly);
    if (projectedMonthly > monthlySales * 1.1) {
      insights.push({
        icon: Zap,
        title: `Projeção mensal: ${projText}`,
        description: `No ritmo atual, você pode fechar o mês com ${projText}. Para atingir esse resultado, mantenha a média de ${formatCurrency(dailyAverage)} por dia nos próximos ${daysInMonth - dayOfMonth} dias.`,
        type: "tip",
      });
    }
  }

  // 7. Sales count insights
  if (salesCount === 0 && dayOfMonth > 1) {
    insights.push({
      icon: ShoppingBag,
      title: "Nenhuma venda registrada este mês",
      description: "Comece a registrar suas vendas no sistema para ter insights mais precisos. Quanto mais dados, melhores as recomendações.",
      type: "action",
      action: { label: "Nova venda", path: "/vendas/nova" },
    });
  }

  // 8. Profit margin tip
  if (estimatedProfit > 0 && monthlySales > 0) {
    const profitMargin = (estimatedProfit / monthlySales) * 100;
    if (profitMargin < 20) {
      insights.push({
        icon: Lightbulb,
        title: "Margem de lucro pode melhorar",
        description: `Sua margem está em ${profitMargin.toFixed(1)}%. Revise a precificação dos produtos com markup abaixo de 80%. Lentes com tratamento anti-reflexo têm margem até 3x maior que armações básicas.`,
        type: "tip",
        action: { label: "Ver produtos", path: "/produtos" },
      });
    }
  }

  // 9. General tips (always show at least one)
  if (insights.length < 2) {
    const generalTips: Insight[] = [
      {
        icon: Lightbulb,
        title: "Dica: Cadastre receitas dos clientes",
        description: "Clientes com receita próxima do vencimento recebem lembretes automáticos. Isso gera retorno garantido — 60% dos clientes renovam na mesma ótica.",
        type: "tip",
        action: { label: "Ver clientes", path: "/clientes" },
      },
      {
        icon: RefreshCw,
        title: "Dica: Diversifique formas de pagamento",
        description: "Ofereça parcelamento em até 10x. Clientes que parcelam gastam em média 35% a mais por compra. Configure as opções nas configurações.",
        type: "tip",
        action: { label: "Configurações", path: "/configuracoes" },
      },
      {
        icon: Users,
        title: "Dica: Pós-venda aumenta a fidelização",
        description: "Envie mensagem via WhatsApp 30 dias após a entrega para saber se o cliente está satisfeito. Isso aumenta a taxa de retorno em até 45%.",
        type: "tip",
      },
    ];
    // Pick one based on day of month
    const tipIdx = dayOfMonth % generalTips.length;
    insights.push(generalTips[tipIdx]);
  }

  return insights.slice(0, 5); // max 5 insights
}

const INSIGHT_STYLES: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600 bg-emerald-100", badge: "bg-emerald-100 text-emerald-700" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600 bg-amber-100", badge: "bg-amber-100 text-amber-700" },
  tip:     { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600 bg-blue-100", badge: "bg-blue-100 text-blue-700" },
  action:  { bg: "bg-rose-50", border: "border-rose-200", icon: "text-rose-600 bg-rose-100", badge: "bg-rose-100 text-rose-700" },
};

function AIInsights({ data, navigate }: { data: any; navigate: (path: string) => void }) {
  const insights = useMemo(() => generateInsights(data), [data]);

  if (insights.length === 0) return null;

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/30 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Insights Inteligentes</CardTitle>
            <CardDescription className="text-xs">Dicas baseadas nos seus números reais</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-2.5">
          {insights.map((insight, idx) => {
            const style = INSIGHT_STYLES[insight.type];
            return (
              <div
                key={idx}
                className={`rounded-xl border ${style.border} ${style.bg} p-3 flex items-start gap-3 transition-colors`}
              >
                <div className={`w-8 h-8 rounded-lg ${style.icon} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <insight.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{insight.description}</p>
                  {insight.action && (
                    <button
                      onClick={() => navigate(insight.action!.path)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      {insight.action.label}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
