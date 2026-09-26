import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import dashboardService, {
  type ChartPeriod,
  type DashboardData,
  type SalesChartPoint,
} from "@/services/dashboard.service";
import { formatCurrency } from "@/utils/formatters";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CHART,
  EmptyState,
  InitialsAvatar,
  InsightCard,
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
  chartAxisProps,
  chartTooltipProps,
  rise,
} from "@/components/imperio";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Cake,
  CalendarClock,
  CalendarDays,
  Crown,
  Glasses,
  Lightbulb,
  Package,
  PackageCheck,
  PiggyBank,
  Plus,
  Receipt,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Wallet,
  Zap,
} from "lucide-react";

/* ─── helpers ──────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const WEEKDAYS_LONG = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const compactMoney = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$ ${Math.round(v)}`;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(iso)).replace(".", "");

const shortDateTime = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

/** Days between today (local) and a date-only ISO value (stored at UTC midnight). */
const daysFromToday = (iso: string) => {
  const d = new Date(iso);
  const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
};

const relativeDue = (iso: string) => {
  const diff = daysFromToday(iso);
  if (diff === 0) return "vence hoje";
  if (diff === 1) return "vence amanhã";
  if (diff > 1) return `vence em ${diff} dias`;
  if (diff === -1) return "venceu ontem";
  return `venceu há ${Math.abs(diff)} dias`;
};

const SALE_STATUS: Record<string, { label: string; tone: "warning" | "info" | "success" | "navy" | "danger" }> = {
  AWAITING_LENS: { label: "Aguardando lente", tone: "warning" },
  IN_PRODUCTION: { label: "Em produção", tone: "info" },
  READY_FOR_PICKUP: { label: "Pronta p/ retirada", tone: "success" },
  DELIVERED: { label: "Entregue", tone: "navy" },
  CANCELLED: { label: "Cancelada", tone: "danger" },
};

/** Builds a gap-free series for the chosen period (backend omits days without sales). */
function buildSeries(points: SalesChartPoint[], period: ChartPeriod) {
  const map = new Map(points.map((p) => [p.date, p]));
  const now = new Date();
  const out: { key: string; label: string; tooltip: string; total: number; count: number }[] = [];
  if (period === "12m") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = monthKey(d);
      const p = map.get(k);
      out.push({
        key: k,
        label: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        tooltip: `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`,
        total: p?.total ?? 0,
        count: p?.count ?? 0,
      });
    }
  } else {
    const n = period === "7d" ? 7 : 30;
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const k = dayKey(d);
      const p = map.get(k);
      out.push({
        key: k,
        label: period === "7d" ? `${WEEKDAYS[d.getDay()]} ${d.getDate()}` : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
        tooltip: `${WEEKDAYS_LONG[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
        total: p?.total ?? 0,
        count: p?.count ?? 0,
      });
    }
  }
  return out;
}

/* ─── page ─────────────────────────────────────────────────── */

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("30d");

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const result = await dashboardService.getData();
        setData(result);
        if (result.failed.length > 0) {
          toast({
            title: "Alguns dados não carregaram",
            description: "Parte do painel pode estar incompleta. Tente atualizar.",
            variant: "destructive",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        setError(msg || "Não foi possível carregar o painel.");
        toast({ title: "Erro ao carregar o painel", description: msg || "Tente novamente.", variant: "destructive" });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const kpis = data?.kpis ?? null;
  const series = useMemo(() => buildSeries(data?.salesChart[chartPeriod] ?? [], chartPeriod), [data, chartPeriod]);
  const seriesTotal = series.reduce((s, p) => s + p.total, 0);
  const seriesCount = series.reduce((s, p) => s + p.count, 0);
  const hasSeries = series.some((p) => p.total > 0);

  // Month projection
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthSales = kpis?.monthSales ?? 0;
  const projection = dayOfMonth > 0 ? (monthSales / dayOfMonth) * daysInMonth : 0;

  const firstName = user?.name?.split(" ")[0] || "equipe";

  const headerActions = (
    <>
      <Button variant="gold" size="sm" onClick={() => navigate("/vendas/nova")}>
        <ShoppingCart className="h-4 w-4 mr-1.5" /> Nova venda
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate("/clientes/novo")}>
        <UserPlus className="h-4 w-4 mr-1.5" /> Novo cliente
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate("/produtos/novo")}>
        <Plus className="h-4 w-4 mr-1.5" /> Novo produto
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => load(true)}
        disabled={refreshing || loading}
        aria-label="Atualizar painel"
        title="Atualizar"
      >
        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
      </Button>
    </>
  );

  if (error && !data) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader eyebrow={todayLabel} title={`${greeting}, ${firstName}`} icon={Crown} actions={headerActions} />
          <Panel>
            <EmptyState
              icon={AlertTriangle}
              title="Não foi possível carregar o painel"
              description={error}
              action={
                <Button onClick={() => load()}>
                  <RefreshCw className="h-4 w-4 mr-1.5" /> Tentar novamente
                </Button>
              }
            />
          </Panel>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow={todayLabel}
          title={`${greeting}, ${firstName}`}
          description="Um panorama do dia na Óticas Império."
          icon={Crown}
          actions={headerActions}
        />

        {data && data.failed.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Algumas seções não puderam ser carregadas.
            </span>
            <Button size="sm" variant="outline" onClick={() => load(true)} disabled={refreshing}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", refreshing && "animate-spin")} /> Tentar novamente
            </Button>
          </div>
        )}

        {/* ── KPIs ─────────────────────────────────────────── */}
        {loading ? (
          <KpiSkeleton />
        ) : (
          <div className="space-y-3">
            <div className={cn("grid grid-cols-2 gap-3", isAdmin ? "lg:grid-cols-6" : "lg:grid-cols-5")}>
              <StatCard
                featured
                label="Faturamento do mês"
                value={formatCurrency(monthSales)}
                icon={Crown}
                className={cn("col-span-2", rise(0).className)}
                style={rise(0).style}
                onClick={() => navigate("/vendas")}
                hint={
                  <span className="block">
                    {plural(kpis?.monthSalesCount ?? 0, "venda", "vendas")} no mês
                    {monthSales > 0 && dayOfMonth < daysInMonth && (
                      <>
                        {" · "}projeção{" "}
                        <span className="num font-semibold text-gold">{formatCurrency(projection)}</span>
                      </>
                    )}
                    <span className="mt-2.5 block h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full bg-gold"
                        style={{ width: `${Math.round((dayOfMonth / daysInMonth) * 100)}%` }}
                      />
                    </span>
                    <span className="mt-1 block text-[11px]">
                      Dia {dayOfMonth} de {daysInMonth}
                    </span>
                  </span>
                }
              />
              <StatCard
                label="Vendas hoje"
                value={formatCurrency(kpis?.todaySales ?? 0)}
                hint={plural(kpis?.todaySalesCount ?? 0, "venda", "vendas")}
                icon={TrendingUp}
                tone="gold"
                {...rise(1)}
              />
              <StatCard
                label="Ticket médio"
                value={formatCurrency(kpis?.ticketAvg ?? 0)}
                hint="Média do mês"
                icon={Target}
                tone="navy"
                {...rise(2)}
              />
              <StatCard
                label="Qtd. de vendas"
                value={<span className="num">{kpis?.monthSalesCount ?? 0}</span>}
                hint="No mês atual"
                icon={ShoppingBag}
                tone="info"
                className={cn(!isAdmin && "col-span-2 lg:col-span-1", rise(3).className)}
                style={rise(3).style}
              />
              {isAdmin && (
                <StatCard
                  label="Lucro estimado"
                  value={formatCurrency(kpis?.monthProfit ?? 0)}
                  hint={
                    monthSales > 0 && kpis?.monthProfit != null
                      ? `Margem de ${((kpis.monthProfit / monthSales) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
                      : "No mês atual"
                  }
                  icon={PiggyBank}
                  tone="success"
                  {...rise(4)}
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label="Estoque baixo"
                value={<span className="num">{kpis?.lowStockCount ?? 0}</span>}
                hint={(kpis?.lowStockCount ?? 0) > 0 ? "Produtos no mínimo ou abaixo" : "Estoque em dia"}
                icon={Package}
                tone={(kpis?.lowStockCount ?? 0) > 0 ? "warning" : "neutral"}
                onClick={() => navigate("/produtos")}
                {...rise(5)}
              />
              <StatCard
                label="Contas a vencer (7 dias)"
                value={
                  kpis?.upcomingBillsAmount != null && kpis.upcomingBillsAmount > 0
                    ? formatCurrency(kpis.upcomingBillsAmount)
                    : <span className="num">{kpis?.upcomingBills ?? 0}</span>
                }
                hint={
                  (kpis?.upcomingBills ?? 0) > 0
                    ? `${plural(kpis?.upcomingBills ?? 0, "conta", "contas")} (inclui vencidas)`
                    : "Nada a pagar nos próximos dias"
                }
                icon={CalendarClock}
                tone={(kpis?.upcomingBills ?? 0) > 0 ? "gold" : "neutral"}
                onClick={() => navigate("/financeiro/contas-pagar")}
                {...rise(6)}
              />
              <StatCard
                label="Parcelas atrasadas"
                value={<span className="num">{kpis?.overdueInstallments ?? 0}</span>}
                hint={
                  (kpis?.overdueInstallments ?? 0) > 0
                    ? `${formatCurrency(kpis?.overdueInstallmentsAmount ?? 0)} a receber`
                    : "Nenhuma parcela em atraso"
                }
                icon={AlertTriangle}
                tone={(kpis?.overdueInstallments ?? 0) > 0 ? "danger" : "neutral"}
                onClick={() => navigate("/financeiro/contas-receber")}
                {...rise(7)}
              />
            </div>
          </div>
        )}

        {/* ── Chart + top products ─────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel
            className={cn("lg:col-span-2", rise(8).className)}
            style={rise(8).style}
            title="Evolução de vendas"
            description={
              loading
                ? "Carregando…"
                : `${formatCurrency(seriesTotal)} em ${plural(seriesCount, "venda", "vendas")} no período`
            }
            icon={BarChart3}
            actions={
              <div className="inline-flex rounded-lg border border-border bg-muted p-0.5" role="tablist">
                {(["7d", "30d", "12m"] as const).map((p) => (
                  <button
                    key={p}
                    role="tab"
                    aria-selected={chartPeriod === p}
                    onClick={() => setChartPeriod(p)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                      chartPeriod === p ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "12 meses"}
                  </button>
                ))}
              </div>
            }
            bodyClassName="px-2 pb-4 pt-4 sm:px-4"
          >
            {loading ? (
              <Skeleton className="h-[240px] w-full rounded-xl" />
            ) : !hasSeries ? (
              <EmptyState
                icon={BarChart3}
                title="Sem vendas no período"
                description="Assim que houver vendas registradas, a evolução aparece aqui."
                action={
                  <Button size="sm" onClick={() => navigate("/vendas/nova")}>
                    <Plus className="h-4 w-4 mr-1.5" /> Registrar venda
                  </Button>
                }
                className="py-10"
              />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashSalesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.navy} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={CHART.navy} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    {...chartAxisProps}
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
                  <YAxis {...chartAxisProps} width={56} tickFormatter={compactMoney} />
                  <Tooltip
                    {...chartTooltipProps}
                    cursor={{ stroke: CHART.gold, strokeWidth: 1, strokeDasharray: "3 3" }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltip ?? ""}
                    formatter={(value: number, _name, item) => [
                      `${formatCurrency(value)} · ${plural(item?.payload?.count ?? 0, "venda", "vendas")}`,
                      "Faturamento",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={CHART.navy}
                    strokeWidth={2.25}
                    fill="url(#dashSalesFill)"
                    dot={chartPeriod === "7d" ? { r: 3, fill: CHART.navy, strokeWidth: 0 } : false}
                    activeDot={{ r: 5, fill: CHART.gold, stroke: "white", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Top 5 produtos" description="Mais vendidos no mês" icon={Glasses} {...rise(9)}>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-1.5 w-full" />
                  </div>
                ))}
              </div>
            ) : !data?.topProducts.length ? (
              <EmptyState
                icon={Glasses}
                title="Sem produtos vendidos"
                description="Os campeões de venda do mês aparecem aqui."
                className="py-8"
              />
            ) : (
              <ol className="space-y-4">
                {data.topProducts.map((row, i) => {
                  const max = data.topProducts[0].quantity || 1;
                  return (
                    <li key={row.product.id} className="min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <span className="font-display num text-sm font-semibold text-gold">{i + 1}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{row.product.name}</p>
                            {row.product.brand && (
                              <p className="truncate text-[11px] text-muted-foreground">{row.product.brand}</p>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="num text-sm font-semibold">{row.quantity} un.</p>
                          <p className="num text-[11px] text-muted-foreground">{formatCurrency(row.revenue)}</p>
                        </div>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", i === 0 ? "bg-gold" : "bg-primary/70")}
                          style={{ width: `${Math.max(6, (row.quantity / max) * 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        </div>

        {/* ── Recent sales + reminders ─────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel
            title="Vendas recentes"
            icon={Receipt}
            {...rise(10)}
            actions={
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate("/vendas")}>
                Ver todas <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            }
            bodyClassName="p-2 sm:p-3"
          >
            {loading ? (
              <ListSkeleton />
            ) : !data?.recentSales.length ? (
              <EmptyState
                icon={ShoppingBag}
                title="Nenhuma venda ainda"
                description="Registre a primeira venda para acompanhar por aqui."
                action={
                  <Button size="sm" onClick={() => navigate("/vendas/nova")}>
                    <Plus className="h-4 w-4 mr-1.5" /> Registrar venda
                  </Button>
                }
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-border">
                {data.recentSales.map((sale) => {
                  const st = SALE_STATUS[sale.status];
                  return (
                    <li key={sale.id}>
                      <button
                        onClick={() => navigate(`/vendas/${sale.id}`)}
                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-3 text-left transition-colors hover:bg-accent"
                      >
                        <InitialsAvatar name={sale.customer?.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{sale.customer?.name || "Cliente avulso"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            <span className="num">#{sale.orderNumber}</span> · {shortDateTime(sale.date)}
                            {sale.seller?.name ? ` · ${sale.seller.name.split(" ")[0]}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={cn(
                              "num font-display text-sm font-semibold",
                              sale.status === "CANCELLED" && "text-muted-foreground line-through",
                            )}
                          >
                            {formatCurrency(sale.total ?? 0)}
                          </span>
                          {st && <StatusPill tone={st.tone}>{st.label}</StatusPill>}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <RemindersPanel data={data} loading={loading} onNavigate={navigate} {...rise(11)} />
        </div>

        {/* ── Assistente Império ───────────────────────────── */}
        {!loading && data?.kpis && (
          <AssistantPanel data={data} isAdmin={isAdmin} onNavigate={navigate} {...rise(12)} />
        )}
      </div>
    </MainLayout>
  );
}

/* ─── skeletons ────────────────────────────────────────────── */

function KpiSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Skeleton className="col-span-2 h-[132px] rounded-2xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/* ─── reminders ────────────────────────────────────────────── */

type ReminderGroup = "financeiro" | "clientes" | "pedidos";
interface Reminder {
  id: string;
  group: ReminderGroup;
  icon: ElementType;
  tone: "danger" | "warning" | "gold" | "info" | "success";
  title: string;
  detail: string;
  meta?: string;
  priority: number;
  path: string;
}

const REMINDER_TONE: Record<Reminder["tone"], string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  gold: "bg-gold-soft text-gold-foreground",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
};

function buildReminders(data: DashboardData): Reminder[] {
  const list: Reminder[] = [];

  for (const inst of data.reminders.overdueInstallments) {
    const so = inst.payment?.salesOrder;
    list.push({
      id: `inst-${inst.id}`,
      group: "financeiro",
      icon: AlertTriangle,
      tone: "danger",
      title: `Parcela ${inst.number} em atraso — ${so?.customer?.name ?? "cliente"}`,
      detail: `${formatCurrency(inst.amount)} · ${relativeDue(inst.dueDate)}`,
      meta: so ? `#${so.orderNumber}` : undefined,
      priority: 0,
      path: "/financeiro/contas-receber",
    });
  }

  for (const bill of data.reminders.upcomingBills) {
    const diff = daysFromToday(bill.dueDate);
    list.push({
      id: `bill-${bill.id}`,
      group: "financeiro",
      icon: CalendarClock,
      tone: diff <= 1 ? "warning" : "gold",
      title: bill.description,
      detail: `${formatCurrency(bill.amount)} · ${relativeDue(bill.dueDate)}`,
      meta: bill.category?.name,
      priority: 1 + diff / 10,
      path: "/financeiro/contas-pagar",
    });
  }

  for (const sale of data.readyForPickup) {
    list.push({
      id: `pickup-${sale.id}`,
      group: "pedidos",
      icon: PackageCheck,
      tone: "success",
      title: `Óculos pronto para retirada — ${sale.customer?.name ?? "cliente"}`,
      detail: "Avise o cliente que o pedido está disponível",
      meta: `#${sale.orderNumber}`,
      priority: 2,
      path: `/vendas/${sale.id}`,
    });
  }

  for (const lo of data.readyLensOrders) {
    list.push({
      id: `lens-${lo.id}`,
      group: "pedidos",
      icon: Glasses,
      tone: "info",
      title: `Lentes prontas no laboratório — ${lo.salesOrder?.customer?.name ?? "cliente"}`,
      detail: lo.laboratory?.name ? `Retirar em ${lo.laboratory.name}` : "Lentes prontas para montagem",
      meta: lo.salesOrder ? `#${lo.salesOrder.orderNumber}` : undefined,
      priority: 2.5,
      path: `/vendas/${lo.salesOrderId}`,
    });
  }

  const today = new Date().getDate();
  for (const c of data.birthdays) {
    const day = new Date(c.birthDate).getUTCDate();
    if (day < today) continue; // already passed this month
    const isToday = day === today;
    list.push({
      id: `bday-${c.id}`,
      group: "clientes",
      icon: Cake,
      tone: "gold",
      title: isToday ? `Hoje é aniversário de ${c.name}` : `Aniversário de ${c.name}`,
      detail: isToday ? "Envie os parabéns e um cupom especial" : `Dia ${pad(day)} — prepare uma mensagem`,
      priority: isToday ? 0.5 : 3 + (day - today) / 100,
      path: `/clientes/${c.id}`,
    });
  }

  return list.sort((a, b) => a.priority - b.priority);
}

function RemindersPanel({
  data,
  loading,
  onNavigate,
  className,
  style,
}: {
  data: DashboardData | null;
  loading: boolean;
  onNavigate: (p: string) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const [filter, setFilter] = useState<"todos" | ReminderGroup>("todos");
  const [expanded, setExpanded] = useState(false);
  const all = useMemo(() => (data ? buildReminders(data) : []), [data]);
  const counts = useMemo(
    () => ({
      todos: all.length,
      financeiro: all.filter((r) => r.group === "financeiro").length,
      pedidos: all.filter((r) => r.group === "pedidos").length,
      clientes: all.filter((r) => r.group === "clientes").length,
    }),
    [all],
  );
  const filtered = filter === "todos" ? all : all.filter((r) => r.group === filter);
  const visible = expanded ? filtered : filtered.slice(0, 6);

  return (
    <Panel
      title="Lembretes"
      description="O que merece atenção agora"
      icon={CalendarDays}
      className={className}
      style={style}
      bodyClassName="p-2 sm:p-3"
    >
      {loading ? (
        <ListSkeleton />
      ) : all.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Tudo em dia"
          description="Sem parcelas atrasadas, contas próximas, pedidos prontos ou aniversários pela frente."
          className="py-8"
        />
      ) : (
        <>
          <div className="-mx-1 mb-1 flex gap-1.5 overflow-x-auto px-3 pb-2 pt-1">
            {(
              [
                ["todos", "Todos"],
                ["financeiro", "Financeiro"],
                ["pedidos", "Pedidos"],
                ["clientes", "Clientes"],
              ] as const
            ).map(([key, label]) =>
              key !== "todos" && counts[key] === 0 ? null : (
                <button
                  key={key}
                  onClick={() => {
                    setFilter(key);
                    setExpanded(false);
                  }}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    filter === key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label} <span className="num opacity-70">{counts[key]}</span>
                </button>
              ),
            )}
          </div>
          <ul className="divide-y divide-border">
            {visible.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => onNavigate(r.path)}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", REMINDER_TONE[r.tone])}>
                    <r.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.title}</span>
                    <span className="num block truncate text-xs text-muted-foreground">{r.detail}</span>
                  </span>
                  {r.meta && (
                    <span className="num hidden shrink-0 text-[11px] text-muted-foreground sm:inline">{r.meta}</span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
          {filtered.length > 6 && (
            <div className="px-2 pt-2">
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Mostrar menos" : `Ver mais ${filtered.length - 6}`}
              </Button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

/* ─── Assistente Império ───────────────────────────────────── */

interface Insight {
  key: string;
  icon: ElementType;
  tone: "success" | "warning" | "info" | "danger" | "gold";
  title: string;
  text: string;
  action?: { label: string; path: string };
  weight: number;
}

function generateInsights(data: DashboardData, isAdmin: boolean): Insight[] {
  const k = data.kpis;
  if (!k) return [];
  const out: Insight[] = [];
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  // Average of previous days of the month (today is still in progress).
  const prevDays = dayOfMonth - 1;
  const monthBeforeToday = k.monthSales - k.todaySales;
  const dailyAvg = prevDays > 0 ? monthBeforeToday / prevDays : 0;

  // Last full months from the 12m series, for comparison.
  const months12 = data.salesChart["12m"];
  const lastMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonth = months12.find((m) => m.date === lastMonthKey)?.total ?? 0;

  // 1. Month projection
  if (k.monthSales > 0 && dayOfMonth >= 3 && daysLeft > 0) {
    const projection = (k.monthSales / dayOfMonth) * daysInMonth;
    const vsLast = lastMonth > 0 ? (projection / lastMonth - 1) * 100 : null;
    out.push({
      key: "projection",
      icon: Zap,
      tone: vsLast != null && vsLast < -5 ? "warning" : "gold",
      title: `Projeção de fechamento: ${formatCurrency(projection)}`,
      text:
        vsLast != null
          ? `No ritmo atual o mês fecha ${Math.abs(vsLast).toFixed(0)}% ${vsLast >= 0 ? "acima" : "abaixo"} do mês passado (${formatCurrency(lastMonth)}). ${
              vsLast < 0
                ? `Para empatar, são necessários ${formatCurrency(Math.max(0, (lastMonth - k.monthSales) / daysLeft))} por dia nos ${daysLeft} dias restantes.`
                : "Mantenha o ritmo!"
            }`
          : `Mantendo a média de ${formatCurrency(k.monthSales / dayOfMonth)} por dia nos ${daysLeft} dias restantes.`,
      action: { label: "Ver relatórios", path: "/relatorios" },
      weight: 2,
    });
  }

  // 2. Today's pace vs daily average
  if (dailyAvg > 0) {
    const hour = now.getHours();
    if (k.todaySales > dailyAvg * 1.2) {
      out.push({
        key: "pace-up",
        icon: TrendingUp,
        tone: "success",
        title: "Dia acima da média!",
        text: `Hoje já são ${formatCurrency(k.todaySales)}, ${((k.todaySales / dailyAvg - 1) * 100).toFixed(0)}% acima da média diária do mês (${formatCurrency(dailyAvg)}).`,
        weight: 3,
      });
    } else if (hour >= 14 && k.todaySales < dailyAvg * 0.5) {
      out.push({
        key: "pace-down",
        icon: TrendingDown,
        tone: "warning",
        title: "Ritmo de hoje abaixo do normal",
        text: `A média diária do mês é ${formatCurrency(dailyAvg)} e hoje estão ${formatCurrency(k.todaySales)}. Que tal contatar clientes com receitas antigas ou aniversariantes?`,
        action: { label: "Ver clientes", path: "/clientes" },
        weight: 4,
      });
    }
  }

  // 3. Overdue installments
  if (k.overdueInstallments > 0) {
    out.push({
      key: "overdue",
      icon: AlertTriangle,
      tone: "danger",
      title: `${plural(k.overdueInstallments, "parcela", "parcelas")} em atraso`,
      text: `${k.overdueInstallmentsAmount ? `${formatCurrency(k.overdueInstallmentsAmount)} parados no crediário. ` : ""}Uma cobrança gentil por WhatsApp costuma resolver a maioria dos casos.`,
      action: { label: "Ver contas a receber", path: "/financeiro/contas-receber" },
      weight: 1,
    });
  }

  // 4. Bills due soon
  if (k.upcomingBills > 0) {
    const cover = k.upcomingBillsAmount && k.monthSales > 0 ? k.upcomingBillsAmount / (k.monthSales / dayOfMonth) : null;
    out.push({
      key: "bills",
      icon: Wallet,
      tone: "warning",
      title: `${plural(k.upcomingBills, "conta vence", "contas vencem")} em até 7 dias`,
      text: `${k.upcomingBillsAmount ? `Total de ${formatCurrency(k.upcomingBillsAmount)}` : "Confira os valores"}${
        cover != null ? ` — o equivalente a ${cover.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dia(s) de vendas.` : "."
      } Programe os pagamentos para evitar juros.`,
      action: { label: "Ver contas a pagar", path: "/financeiro/contas-pagar" },
      weight: 2,
    });
  }

  // 5. Low stock
  if (k.lowStockCount > 0) {
    out.push({
      key: "stock",
      icon: Package,
      tone: "warning",
      title: `${plural(k.lowStockCount, "produto", "produtos")} com estoque baixo`,
      text: "Reponha antes que falte: armação sem estoque é venda que vai para a concorrência.",
      action: { label: "Ver produtos", path: "/produtos" },
      weight: 3,
    });
  }

  // 6. Ticket médio
  if (k.monthSalesCount >= 3 && k.ticketAvg > 0) {
    if (k.ticketAvg < 300) {
      out.push({
        key: "ticket-low",
        icon: Target,
        tone: "info",
        title: `Ticket médio de ${formatCurrency(k.ticketAvg)}`,
        text: "Ofereça tratamentos (antirreflexo, filtro de luz azul) e um segundo par — pequenos upgrades elevam o ticket.",
        action: { label: "Ver produtos", path: "/produtos" },
        weight: 5,
      });
    } else if (k.ticketAvg >= 700) {
      out.push({
        key: "ticket-high",
        icon: Crown,
        tone: "success",
        title: `Ticket médio excelente: ${formatCurrency(k.ticketAvg)}`,
        text: "A equipe está vendendo bem produtos de maior valor agregado. Continue destacando multifocais e armações premium.",
        weight: 6,
      });
    }
  }

  // 7. Margin (admin only)
  if (isAdmin && k.monthProfit != null && k.monthSales > 0) {
    const margin = (k.monthProfit / k.monthSales) * 100;
    if (margin < 35) {
      out.push({
        key: "margin",
        icon: Lightbulb,
        tone: "info",
        title: `Margem estimada de ${margin.toFixed(1)}%`,
        text: "Está abaixo do ideal para o varejo óptico. Revise descontos concedidos e o markup dos itens mais vendidos.",
        action: { label: "Ver produtos", path: "/produtos" },
        weight: 4,
      });
    } else if (margin >= 55) {
      out.push({
        key: "margin-good",
        icon: PiggyBank,
        tone: "success",
        title: `Margem saudável de ${margin.toFixed(1)}%`,
        text: "Os preços estão bem posicionados. Bom momento para investir em estoque dos campeões de venda.",
        weight: 7,
      });
    }
  }

  // 8. Birthdays today
  const today = now.getDate();
  const bdays = data.birthdays.filter((c) => new Date(c.birthDate).getUTCDate() === today);
  if (bdays.length > 0) {
    out.push({
      key: "bday",
      icon: Cake,
      tone: "gold",
      title:
        bdays.length === 1 ? `${bdays[0].name} faz aniversário hoje` : `${bdays.length} clientes fazem aniversário hoje`,
      text: "Uma mensagem de parabéns com um desconto especial é um ótimo motivo para trazê-los de volta à loja.",
      action: bdays.length === 1 ? { label: "Abrir cliente", path: `/clientes/${bdays[0].id}` } : { label: "Ver clientes", path: "/clientes" },
      weight: 2.5,
    });
  }

  // 9. Orders waiting for pickup
  if (data.readyForPickup.length > 0) {
    out.push({
      key: "pickup",
      icon: PackageCheck,
      tone: "success",
      title: `${plural(data.readyForPickup.length, "pedido pronto", "pedidos prontos")} para retirada`,
      text: "Avise os clientes: entrega rápida gera boa impressão e libera o recebimento do saldo.",
      action: { label: "Ver vendas", path: "/vendas" },
      weight: 3,
    });
  }

  // 10. Best weekday (last 30 days)
  const last30 = data.salesChart["30d"].filter((p) => p.total > 0);
  if (last30.length >= 8) {
    const byDow = Array.from({ length: 7 }, () => ({ total: 0, n: 0 }));
    for (const p of last30) {
      const [y, m, d] = p.date.split("-").map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      byDow[dow].total += p.total;
      byDow[dow].n += 1;
    }
    const best = byDow
      .map((v, i) => ({ i, avg: v.n ? v.total / v.n : 0 }))
      .sort((a, b) => b.avg - a.avg)[0];
    if (best.avg > 0) {
      out.push({
        key: "best-day",
        icon: CalendarDays,
        tone: "info",
        title: `${WEEKDAYS_LONG[best.i][0].toUpperCase()}${WEEKDAYS_LONG[best.i].slice(1)} é o dia mais forte`,
        text: `Nos últimos 30 dias, a média nesse dia foi de ${formatCurrency(best.avg)}. Reforce a equipe e concentre ações de vendas nele.`,
        weight: 8,
      });
    }
  }

  // 11. No sales this month
  if (k.monthSalesCount === 0 && dayOfMonth > 1) {
    out.push({
      key: "no-sales",
      icon: ShoppingBag,
      tone: "info",
      title: "Nenhuma venda registrada neste mês",
      text: "Registre as vendas no sistema para acompanhar metas, estoque e comissões com precisão.",
      action: { label: "Nova venda", path: "/vendas/nova" },
      weight: 1,
    });
  }

  return out.sort((a, b) => a.weight - b.weight).slice(0, 6);
}

function AssistantPanel({
  data,
  isAdmin,
  onNavigate,
  className,
  style,
}: {
  data: DashboardData;
  isAdmin: boolean;
  onNavigate: (p: string) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const insights = useMemo(() => generateInsights(data, isAdmin), [data, isAdmin]);
  return (
    <Panel
      title="Assistente Império"
      description="Leituras automáticas dos seus números reais"
      icon={Sparkles}
      className={className}
      style={style}
    >
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tudo tranquilo por aqui — nenhum ponto de atenção nos números de hoje.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((ins) => (
            <InsightCard
              key={ins.key}
              icon={ins.icon}
              tone={ins.tone}
              title={ins.title}
              action={
                ins.action && (
                  <button
                    onClick={() => onNavigate(ins.action!.path)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-gold-foreground"
                  >
                    {ins.action.label} <ArrowRight className="h-3 w-3" />
                  </button>
                )
              }
            >
              {ins.text}
            </InsightCard>
          ))}
        </div>
      )}
    </Panel>
  );
}
