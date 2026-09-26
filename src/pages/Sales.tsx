import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import { format, startOfDay, endOfDay, subDays, startOfMonth, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, CalendarDays, CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, CreditCard, Eye, Glasses, MessageCircle, MoreHorizontal, PackageCheck, PackageSearch, Plus,
  Printer, Receipt, RefreshCw, Search, ShoppingBag, Sparkles, TrendingUp, Trophy, Wallet, X, XCircle,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState, InitialsAvatar, InsightCard, PageHeader, Panel, StatCard, StatusPill, rise,
} from "@/components/imperio";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import salesService, {
  PAYMENT_METHOD_LABELS, SALE_FLOW, SALE_STATUS, formatOrderNumber, nextSaleStatus, whatsappLink,
  type Sale, type SaleStatus,
} from "@/services/sales.service";

/* ── Period presets ──────────────────────────────────────── */
type Preset = "today" | "7d" | "month" | "30d" | "all" | "custom";
const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "month", label: "Este mês" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "all", label: "Todo o período" },
  { value: "custom", label: "Personalizado" },
];

function resolveRange(preset: Preset, custom?: DateRange): { start?: Date; end?: Date } {
  const now = new Date();
  switch (preset) {
    case "today": return { start: startOfDay(now), end: endOfDay(now) };
    case "7d": return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "month": return { start: startOfMonth(now), end: endOfDay(now) };
    case "30d": return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case "custom": return {
      start: custom?.from ? startOfDay(custom.from) : undefined,
      end: custom?.to ? endOfDay(custom.to) : custom?.from ? endOfDay(custom.from) : undefined,
    };
    default: return {};
  }
}

type StatusTab = "ALL" | SaleStatus;
const TABS: { value: StatusTab; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "AWAITING_LENS", label: "Aguard. lente" },
  { value: "IN_PRODUCTION", label: "Em produção" },
  { value: "READY_FOR_PICKUP", label: "Prontas" },
  { value: "DELIVERED", label: "Entregues" },
  { value: "CANCELLED", label: "Canceladas" },
];

const PAGE_SIZE = 15;
const SUMMARY_LIMIT = 1000;

const itemLabel = (s: Sale) => {
  const items = s.items ?? [];
  if (!items.length) return "Sem itens";
  const first = items[0].product?.name || items[0].description || "Item";
  return items.length > 1 ? `${first} +${items.length - 1}` : first;
};

const paymentLabel = (s: Sale) => {
  const methods = Array.from(new Set((s.payments ?? []).map((p) => PAYMENT_METHOD_LABELS[p.method] ?? p.method)));
  return methods.length ? methods.join(" · ") : "—";
};

const daysSince = (iso: string) => differenceInCalendarDays(new Date(), new Date(iso));

export default function Sales() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("ALL");
  const [preset, setPreset] = useState<Preset>("30d");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const range = useMemo(() => resolveRange(preset, customRange), [preset, customRange]);
  const startISO = range.start?.toISOString();
  const endISO = range.end?.toISOString();

  /* ── Queries ── */
  const listQuery = useQuery({
    queryKey: ["sales", "list", { tab, search, startISO, endISO, page }],
    queryFn: () => salesService.list({
      status: tab === "ALL" ? undefined : tab,
      search: search || undefined,
      startDate: startISO,
      endDate: endISO,
      page,
      limit: PAGE_SIZE,
    }),
    placeholderData: (prev) => prev,
  });

  const summaryQuery = useQuery({
    queryKey: ["sales", "summary", { startISO, endISO }],
    queryFn: () => salesService.list({ startDate: startISO, endDate: endISO, limit: SUMMARY_LIMIT }),
  });

  const pendingQuery = useQuery({
    queryKey: ["sales", "pending"],
    queryFn: () => salesService.getPending(),
  });

  useEffect(() => {
    if (listQuery.error) toast.error((listQuery.error as Error).message || "Erro ao carregar vendas");
  }, [listQuery.error]);

  const sales = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ── Aggregates for the period ── */
  const summary = useMemo(() => {
    const all = summaryQuery.data?.data ?? [];
    const counts: Record<StatusTab, number> = {
      ALL: summaryQuery.data?.pagination?.total ?? all.length,
      AWAITING_LENS: 0, IN_PRODUCTION: 0, READY_FOR_PICKUP: 0, DELIVERED: 0, CANCELLED: 0,
    };
    let revenue = 0;
    let profit = 0;
    let valid = 0;
    let storeCredit = 0;
    const bySeller = new Map<string, { name: string; total: number; count: number }>();
    for (const s of all) {
      counts[s.status] += 1;
      if (s.status === "CANCELLED") continue;
      valid += 1;
      revenue += s.total;
      profit += s.estimatedProfit ?? 0;
      for (const p of s.payments ?? []) if (p.method === "STORE_CREDIT") storeCredit += p.amount;
      const sellerName = s.seller?.name ?? "—";
      const cur = bySeller.get(s.sellerId) ?? { name: sellerName, total: 0, count: 0 };
      cur.total += s.total;
      cur.count += 1;
      bySeller.set(s.sellerId, cur);
    }
    const topSeller = [...bySeller.values()].sort((a, b) => b.total - a.total)[0];
    return {
      counts, revenue, profit, valid, storeCredit, topSeller, sellerCount: bySeller.size,
      truncated: (summaryQuery.data?.pagination?.total ?? 0) > all.length,
    };
  }, [summaryQuery.data]);

  const pending = pendingQuery.data?.data ?? [];
  const pendingStats = useMemo(() => {
    const awaiting = pending.filter((s) => s.status === "AWAITING_LENS" || s.status === "IN_PRODUCTION");
    const ready = pending.filter((s) => s.status === "READY_FOR_PICKUP");
    const lateLens = awaiting.filter((s) => daysSince(s.date) > 7);
    const staleReady = ready.filter((s) => daysSince(s.updatedAt) >= 5);
    return { awaiting, ready, lateLens, staleReady };
  }, [pending]);

  const periodLabel = useMemo(() => {
    if (preset === "all") return "todo o período";
    if (preset === "custom") {
      if (!range.start) return "período personalizado";
      return `${format(range.start, "dd/MM")} – ${format(range.end ?? range.start, "dd/MM")}`;
    }
    return PRESETS.find((p) => p.value === preset)?.label.toLowerCase() ?? "";
  }, [preset, range.start, range.end]);

  /* ── Mutations ── */
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["sales"] });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SaleStatus }) => salesService.updateStatus(id, status),
    onSuccess: (_, v) => {
      toast.success(`Status atualizado para “${SALE_STATUS[v.status].label}”.`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar o status."),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesService.cancel(id, reason),
    onSuccess: () => {
      toast.success("Venda cancelada. O estoque dos produtos foi restaurado.");
      setCancelTarget(null);
      setCancelReason("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível cancelar a venda."),
  });

  const notifyReady = (s: Sale) => {
    const link = whatsappLink(
      s.customer?.phone,
      `Olá, ${s.customer?.name?.split(" ")[0] ?? ""}! Aqui é da Óticas Império. Sua ${formatOrderNumber(s.orderNumber)} está pronta para retirada. Estamos te esperando!`,
    );
    if (!link) return toast.error("Cliente sem telefone válido cadastrado.");
    window.open(link, "_blank", "noopener");
  };

  const hasFilters = !!search || tab !== "ALL" || preset !== "30d";
  const clearFilters = () => {
    setSearchInput(""); setSearch(""); setTab("ALL"); setPreset("30d"); setCustomRange(undefined); setPage(1);
  };

  /* ── Insights ── */
  const insights = useMemo(() => {
    const list: { key: string; tone: "success" | "warning" | "info" | "danger" | "gold"; icon: typeof Sparkles; title: string; body: string; action?: { label: string; onClick: () => void } }[] = [];
    if (pendingStats.ready.length) {
      const oldest = [...pendingStats.ready].sort((a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt))[0];
      list.push({
        key: "ready",
        tone: pendingStats.staleReady.length ? "warning" : "success",
        icon: PackageCheck,
        title: `${pendingStats.ready.length} OS pronta${pendingStats.ready.length > 1 ? "s" : ""} aguardando retirada`,
        body: pendingStats.staleReady.length
          ? `${pendingStats.staleReady.length} delas há 5 dias ou mais. Um lembrete no WhatsApp costuma resolver.`
          : "Avise os clientes pelo WhatsApp para agilizar a entrega.",
        action: oldest ? { label: `Avisar ${oldest.customer?.name?.split(" ")[0] ?? "cliente"}`, onClick: () => notifyReady(oldest) } : undefined,
      });
    }
    if (pendingStats.lateLens.length) {
      const oldest = [...pendingStats.lateLens].sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];
      list.push({
        key: "late",
        tone: "danger",
        icon: Clock,
        title: `${pendingStats.lateLens.length} OS em aberto há mais de 7 dias`,
        body: `A mais antiga é a ${formatOrderNumber(oldest.orderNumber)} (${daysSince(oldest.date)} dias). Vale cobrar o laboratório.`,
        action: { label: "Abrir OS", onClick: () => navigate(`/vendas/${oldest.id}`) },
      });
    }
    if (summary.valid >= 5) {
      const cancelRate = summary.counts.CANCELLED / (summary.valid + summary.counts.CANCELLED);
      if (cancelRate >= 0.1) {
        list.push({
          key: "cancel",
          tone: "warning",
          icon: XCircle,
          title: `Taxa de cancelamento em ${(cancelRate * 100).toFixed(0)}%`,
          body: "Acima de 10% no período. Revise os motivos para entender o que está travando as vendas.",
          action: { label: "Ver canceladas", onClick: () => { setTab("CANCELLED"); setPage(1); } },
        });
      }
    }
    if (summary.revenue > 0 && summary.storeCredit / summary.revenue >= 0.3) {
      list.push({
        key: "credit",
        tone: "info",
        icon: CreditCard,
        title: `${((summary.storeCredit / summary.revenue) * 100).toFixed(0)}% do faturamento no crediário`,
        body: "Acompanhe as parcelas a receber para manter o caixa saudável.",
        action: { label: "Contas a receber", onClick: () => navigate("/financeiro/contas-receber") },
      });
    }
    if (isAdmin && summary.topSeller && summary.sellerCount > 1) {
      list.push({
        key: "top",
        tone: "gold",
        icon: Trophy,
        title: `${summary.topSeller.name} lidera as vendas`,
        body: `${formatCurrency(summary.topSeller.total)} em ${summary.topSeller.count} venda${summary.topSeller.count > 1 ? "s" : ""} (${periodLabel}).`,
      });
    }
    return list.slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStats, summary, isAdmin, periodLabel]);

  /* ── Row actions menu ── */
  const RowActions = ({ s }: { s: Sale }) => {
    const open = s.status !== "DELIVERED" && s.status !== "CANCELLED";
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações da venda">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => navigate(`/vendas/${s.id}`)}>
            <Eye className="mr-2 h-4 w-4" /> Ver detalhes
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/vendas/${s.id}?imprimir=1`)}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir OS
          </DropdownMenuItem>
          {s.status === "READY_FOR_PICKUP" && (
            <DropdownMenuItem onClick={() => notifyReady(s)}>
              <MessageCircle className="mr-2 h-4 w-4" /> Avisar no WhatsApp
            </DropdownMenuItem>
          )}
          {open && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Alterar status</DropdownMenuLabel>
              {SALE_FLOW.filter((st) => st !== s.status).map((st) => (
                <DropdownMenuItem key={st} onClick={() => statusMutation.mutate({ id: s.id, status: st })}>
                  <RefreshCw className="mr-2 h-4 w-4" /> {SALE_STATUS[st].label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger"
                onClick={() => { setCancelTarget(s); setCancelReason(""); }}
              >
                <XCircle className="mr-2 h-4 w-4" /> Cancelar venda
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const AdvanceButton = ({ s, compact }: { s: Sale; compact?: boolean }) => {
    const next = nextSaleStatus(s.status);
    if (!next) return null;
    const busy = statusMutation.isPending && statusMutation.variables?.id === s.id;
    return (
      <Button
        size="sm"
        variant="outline"
        className={cn("h-8 gap-1", compact && "px-2.5 text-xs")}
        disabled={busy}
        onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: s.id, status: next }); }}
      >
        {SALE_STATUS[next].short} <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    );
  };

  const statsLoading = summaryQuery.isLoading;
  const ticket = summary.valid ? summary.revenue / summary.valid : 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Vendas"
          title="Vendas e ordens de serviço"
          description="Acompanhe cada OS da venda até a entrega dos óculos."
          icon={ShoppingBag}
          actions={
            <Button variant="gold" onClick={() => navigate("/vendas/nova")}>
              <Plus className="h-4 w-4" /> Nova venda
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {statsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className={cn("h-[108px] rounded-2xl", i === 0 && "col-span-2 lg:col-span-1")} />
            ))
          ) : (
            <>
              <StatCard
                featured
                className={cn("col-span-2 lg:col-span-1", rise(1).className)}
                style={rise(1).style}
                label="Faturamento"
                value={formatCurrency(summary.revenue)}
                hint={isAdmin ? `Lucro estimado ${formatCurrency(summary.profit)}` : `Período: ${periodLabel}`}
                icon={Wallet}
              />
              <StatCard
                {...rise(2)}
                label="Vendas no período"
                value={summary.valid.toLocaleString("pt-BR")}
                hint={summary.counts.CANCELLED ? `${summary.counts.CANCELLED} cancelada(s)` : periodLabel}
                icon={Receipt}
                tone="navy"
              />
              <StatCard
                {...rise(3)}
                label="Ticket médio"
                value={formatCurrency(ticket)}
                hint="Por venda válida"
                icon={TrendingUp}
                tone="gold"
              />
              <StatCard
                {...rise(4)}
                label="OS aguardando"
                value={pendingQuery.isLoading ? "…" : pendingStats.awaiting.length}
                hint={pendingStats.lateLens.length ? `${pendingStats.lateLens.length} há mais de 7 dias` : "Lente ou produção"}
                icon={Glasses}
                tone={pendingStats.lateLens.length ? "danger" : "info"}
                onClick={() => { setTab("AWAITING_LENS"); setPreset("all"); setPage(1); }}
              />
              <StatCard
                {...rise(5)}
                label="Prontas p/ retirada"
                value={pendingQuery.isLoading ? "…" : pendingStats.ready.length}
                hint="Todas as datas"
                icon={PackageCheck}
                tone="success"
                onClick={() => { setTab("READY_FOR_PICKUP"); setPreset("all"); setPage(1); }}
              />
            </>
          )}
        </div>
        {summary.truncated && (
          <p className="-mt-3 text-xs text-muted-foreground">
            Indicadores calculados sobre as {SUMMARY_LIMIT} vendas mais recentes do período.
          </p>
        )}

        {/* Filters */}
        <Panel bodyClassName="p-4 sm:p-5" {...rise(6)}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nº da OS, cliente ou telefone…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchInput("")}
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={preset} onValueChange={(v) => { setPreset(v as Preset); setPage(1); }}>
                <SelectTrigger className="h-10 w-full sm:w-[190px]">
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {preset === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 w-full justify-start font-normal sm:w-auto">
                      <CalendarIcon className="h-4 w-4" />
                      {customRange?.from
                        ? `${format(customRange.from, "dd/MM/yy")}${customRange.to ? ` – ${format(customRange.to, "dd/MM/yy")}` : ""}`
                        : "Escolher datas"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={customRange}
                      onSelect={(r) => { setCustomRange(r); setPage(1); }}
                      locale={ptBR}
                      numberOfMonths={1}
                      disabled={{ after: new Date() }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
              {hasFilters && (
                <Button variant="ghost" className="h-10 text-muted-foreground" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Status tabs with counts */}
          <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {TABS.map((t) => {
              const active = tab === t.value;
              const count = summary.counts[t.value];
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setTab(t.value); setPage(1); }}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-gold/50 hover:text-foreground",
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      "num rounded-full px-1.5 text-[11px] font-semibold",
                      active ? "bg-white/15 text-gold" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {statsLoading ? "·" : count}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* List */}
          <div className="min-w-0 space-y-4" {...rise(7)}>
            {listQuery.isLoading ? (
              <Panel bodyClassName="p-0">
                <div className="divide-y divide-border">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              </Panel>
            ) : listQuery.isError ? (
              <Panel>
                <EmptyState
                  icon={AlertTriangle}
                  title="Não foi possível carregar as vendas"
                  description={(listQuery.error as Error)?.message}
                  action={<Button variant="outline" onClick={() => listQuery.refetch()}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button>}
                />
              </Panel>
            ) : sales.length === 0 ? (
              <Panel>
                <EmptyState
                  icon={PackageSearch}
                  title="Nenhuma venda encontrada"
                  description={hasFilters ? "Ajuste a busca, o status ou o período." : "Registre a primeira venda da loja."}
                  action={
                    hasFilters
                      ? <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>
                      : <Button variant="gold" onClick={() => navigate("/vendas/nova")}><Plus className="h-4 w-4" /> Nova venda</Button>
                  }
                />
              </Panel>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="space-y-2.5 md:hidden">
                  {sales.map((s) => {
                    const st = SALE_STATUS[s.status];
                    return (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/vendas/${s.id}`)}
                        onKeyDown={(e) => e.key === "Enter" && navigate(`/vendas/${s.id}`)}
                        className="surface cursor-pointer p-4 transition-colors active:bg-accent"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <InitialsAvatar name={s.customer?.name} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{s.customer?.name ?? "Cliente"}</p>
                              <p className="num text-xs text-muted-foreground">
                                {formatOrderNumber(s.orderNumber)} · {format(new Date(s.date), "dd/MM/yy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-start gap-1">
                            <p className="num font-display text-base font-semibold">{formatCurrency(s.total)}</p>
                            {RowActions({ s })}
                          </div>
                        </div>
                        <p className="mt-2 truncate text-xs text-muted-foreground">{itemLabel(s)} · {paymentLabel(s)}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <StatusPill tone={st.tone}>{st.label}</StatusPill>
                          {AdvanceButton({ s, compact: true })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <Panel className="hidden md:block" bodyClassName="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="w-[92px]">OS</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="hidden lg:table-cell">Itens</TableHead>
                          <TableHead className="hidden xl:table-cell">Vendedor</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[150px] text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sales.map((s) => {
                          const st = SALE_STATUS[s.status];
                          return (
                            <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/vendas/${s.id}`)}>
                              <TableCell>
                                <p className="num font-display font-semibold text-primary">#{String(s.orderNumber).padStart(4, "0")}</p>
                                <p className="num text-xs text-muted-foreground">{format(new Date(s.date), "dd/MM/yy")}</p>
                              </TableCell>
                              <TableCell>
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <InitialsAvatar name={s.customer?.name} size="sm" />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{s.customer?.name ?? "—"}</p>
                                    <p className="num truncate text-xs text-muted-foreground">{s.customer?.phone ?? ""}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden max-w-[220px] lg:table-cell">
                                <p className="truncate text-sm">{itemLabel(s)}</p>
                                <p className="truncate text-xs text-muted-foreground">{paymentLabel(s)}</p>
                              </TableCell>
                              <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">{s.seller?.name ?? "—"}</TableCell>
                              <TableCell className="num text-right font-display font-semibold">{formatCurrency(s.total)}</TableCell>
                              <TableCell><StatusPill tone={st.tone}>{st.label}</StatusPill></TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  {AdvanceButton({ s, compact: true })}
                                  {RowActions({ s })}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Panel>

                {/* Pagination */}
                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="num text-xs text-muted-foreground">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total} venda{total !== 1 ? "s" : ""}
                    {listQuery.isFetching && " · atualizando…"}
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-9 w-9" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                        .map((n, i, arr) => (
                          <span key={n} className="flex items-center">
                            {i > 0 && arr[i - 1] !== n - 1 && <span className="px-1 text-muted-foreground">…</span>}
                            <Button
                              variant={n === page ? "default" : "ghost"}
                              size="icon"
                              className="num h-9 w-9"
                              onClick={() => setPage(n)}
                            >
                              {n}
                            </Button>
                          </span>
                        ))}
                      <Button variant="outline" size="icon" className="h-9 w-9" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Assistente Império */}
          <div className="space-y-4" {...rise(8)}>
            <Panel title="Assistente Império" description="Sugestões a partir das suas OS" icon={Sparkles}>
              {pendingQuery.isLoading || statsLoading ? (
                <div className="space-y-2.5">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
              ) : insights.length === 0 ? (
                <div className="flex items-start gap-3 rounded-xl bg-success-soft/60 p-3.5 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <p>Tudo em dia: nenhuma OS atrasada ou esperando retirada.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {insights.map((ins) => (
                    <InsightCard
                      key={ins.key}
                      icon={ins.icon}
                      tone={ins.tone}
                      title={ins.title}
                      action={ins.action && (
                        <button type="button" onClick={ins.action.onClick} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                          {ins.action.label} <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    >
                      {ins.body}
                    </InsightCard>
                  ))}
                </div>
              )}
            </Panel>

            {pendingStats.ready.length > 0 && (
              <Panel title="Prontas para retirada" icon={PackageCheck} bodyClassName="p-0 pt-3">
                <ul className="divide-y divide-border">
                  {pendingStats.ready.slice(0, 5).map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/vendas/${s.id}`)}>
                        <p className="truncate text-sm font-medium">{s.customer?.name}</p>
                        <p className="num text-xs text-muted-foreground">
                          {formatOrderNumber(s.orderNumber)} · {formatCurrency(s.total)}
                        </p>
                      </button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={() => notifyReady(s)} aria-label="Avisar no WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      </div>

      {/* Cancel dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) { setCancelTarget(null); setCancelReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Cancelar {formatOrderNumber(cancelTarget?.orderNumber)}</DialogTitle>
            <DialogDescription>
              A venda de <strong>{cancelTarget?.customer?.name}</strong> ({formatCurrency(cancelTarget?.total ?? 0)}) será cancelada
              e o estoque dos produtos voltará automaticamente. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo do cancelamento *</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex.: cliente desistiu da compra"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim() || cancelMutation.isPending}
              onClick={() => cancelTarget && cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason.trim() })}
            >
              {cancelMutation.isPending ? "Cancelando…" : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
