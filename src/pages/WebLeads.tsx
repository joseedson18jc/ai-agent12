import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, differenceInHours, format, formatDistanceToNowStrict, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Clock, ExternalLink, Globe,
  Inbox, Link2, Loader2, Mail, MessageCircle, MessageSquareText, Phone, RefreshCw, RotateCcw, Save, Search,
  ShoppingBag, ShoppingCart, Sparkles, Trash2, TrendingUp, UserPlus, UserRound, Wallet, X, XCircle,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  EmptyState, InitialsAvatar, InsightCard, PageHeader, Panel, StatCard, StatusPill, rise,
} from "@/components/imperio";
import webLeadService, {
  WEB_LEAD_STATS_KEY, type WebLead, type WebLeadStatus, type WebLeadType,
} from "@/services/webLead.service";
import customerService from "@/services/customer.service";
import { formatCurrency, formatPhone } from "@/utils/formatters";
import { cn } from "@/lib/utils";

/* ── Meta ────────────────────────────────────────────────── */
type Tone = "navy" | "gold" | "success" | "warning" | "danger" | "info" | "neutral";

const TYPE_META: Record<WebLeadType, { label: string; plural: string; icon: React.ElementType; tone: Tone; chip: string }> = {
  RESERVATION: { label: "Reserva", plural: "Reservas", icon: ShoppingBag, tone: "gold", chip: "bg-gold-soft text-gold-foreground" },
  APPOINTMENT: { label: "Agendamento", plural: "Agendamentos", icon: CalendarClock, tone: "info", chip: "bg-info-soft text-info" },
  CONTACT: { label: "Mensagem", plural: "Mensagens", icon: MessageSquareText, tone: "navy", chip: "bg-primary/10 text-primary" },
};

const STATUS_META: Record<WebLeadStatus, { label: string; tab: string; tone: Tone }> = {
  NEW: { label: "Novo", tab: "Novos", tone: "gold" },
  CONTACTED: { label: "Em contato", tab: "Em contato", tone: "info" },
  CONVERTED: { label: "Convertido", tab: "Convertidos", tone: "success" },
  DISCARDED: { label: "Descartado", tab: "Descartados", tone: "neutral" },
};

type Tab = WebLeadStatus | "ALL";
const TABS: Tab[] = ["NEW", "CONTACTED", "CONVERTED", "DISCARDED", "ALL"];
const TYPES: WebLeadType[] = ["RESERVATION", "APPOINTMENT", "CONTACT"];
const PAGE_SIZE = 20;
const REFRESH_MS = 60_000;
const STORE_NAME = "Óticas Império";

/* ── Helpers ─────────────────────────────────────────────── */
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** Local phone digits (drops a leading 55 country code). */
const localPhone = (phone: string) => {
  const d = (phone || "").replace(/\D/g, "");
  return d.length > 11 && d.startsWith("55") ? d.slice(2) : d;
};

/** preferredDate is stored at local noon — read only the calendar day. */
const leadDay = (iso?: string | null) => {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const timeAgo = (iso: string) => formatDistanceToNowStrict(new Date(iso), { locale: ptBR, addSuffix: true });

const dayLabel = (day: Date) => {
  const diff = differenceInCalendarDays(day, new Date());
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  return format(day, "EEEE, dd/MM", { locale: ptBR });
};

function waLink(phone: string, text: string) {
  const d = localPhone(phone);
  if (d.length < 10) return null;
  return `https://wa.me/55${d}?text=${encodeURIComponent(text)}`;
}

function replyText(lead: WebLead) {
  const hi = `Olá, ${firstName(lead.name)}! Aqui é da ${STORE_NAME}.`;
  if (lead.type === "RESERVATION") {
    const items = (lead.items ?? []).map((i) => `• ${i.quantity}x ${i.name} — ${formatCurrency(i.unitPrice * i.quantity)}`).join("\n");
    return `${hi} Recebemos sua reserva pelo site:\n${items}\nTotal: ${formatCurrency(lead.total ?? 0)}\n\nJá separamos tudo para você! Qual o melhor dia e horário para retirar na loja?`;
  }
  if (lead.type === "APPOINTMENT") {
    const day = leadDay(lead.preferredDate);
    const service = lead.service ? ` de ${lead.service.toLowerCase()}` : "";
    if (day) {
      const when = `${format(day, "EEEE, dd/MM", { locale: ptBR })}${lead.preferredTime ? ` (${lead.preferredTime})` : ""}`;
      return `${hi} Recebemos seu pedido de agendamento${service} pelo site para ${when}. Podemos confirmar esse horário para você?`;
    }
    return `${hi} Recebemos seu pedido de agendamento${service} pelo site. Qual dia e horário ficam melhores para você?`;
  }
  const msg = lead.message ? ` “${lead.message.length > 140 ? `${lead.message.slice(0, 140)}…` : lead.message}”` : "";
  return `${hi} Recebemos sua mensagem pelo site${msg ? ":" + msg : ""}. Como podemos ajudar?`;
}

const isOpen = (l: WebLead) => l.status === "NEW" || l.status === "CONTACTED";

/* ── Page ────────────────────────────────────────────────── */
export default function WebLeads() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("NEW");
  const [type, setType] = useState<WebLeadType | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tabTouched = useRef(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    document.title = "Pedidos do site · Óticas Império";
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const statsQuery = useQuery({
    queryKey: WEB_LEAD_STATS_KEY,
    queryFn: () => webLeadService.stats().then((r) => r.data),
    refetchInterval: REFRESH_MS,
  });

  const listQuery = useQuery({
    queryKey: ["web-leads", "list", { tab, type, search, page }],
    queryFn: () =>
      webLeadService.list({ status: tab === "ALL" ? undefined : tab, type, search, page, limit: PAGE_SIZE }),
    refetchInterval: REFRESH_MS,
    placeholderData: (prev) => prev,
  });

  // Latest 100 requests (any status) feed the KPIs and the assistant.
  const recentQuery = useQuery({
    queryKey: ["web-leads", "recent"],
    queryFn: () => webLeadService.list({ limit: 100 }).then((r) => r.data ?? []),
    refetchInterval: REFRESH_MS,
  });

  const stats = statsQuery.data;
  const leads = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const total = listQuery.data?.pagination?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const recent = useMemo(() => recentQuery.data ?? [], [recentQuery.data]);

  // Nothing new? Open on "Todos" instead of an empty inbox.
  useEffect(() => {
    if (!tabTouched.current && stats && stats.newCount === 0) {
      const all = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);
      if (all > 0) setTab("ALL");
    }
  }, [stats]);

  // Desktop: keep a lead open in the detail pane.
  useEffect(() => {
    if (!isDesktop) return;
    if (!leads.length) return;
    if (!selectedId || !leads.some((l) => l.id === selectedId)) setSelectedId(leads[0].id);
  }, [isDesktop, leads, selectedId]);

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  const changeTab = (t: Tab) => {
    tabTouched.current = true;
    setTab(t);
    setPage(1);
    setSelectedId(null);
  };

  /* KPIs */
  const kpis = useMemo(() => {
    const all = stats ? Object.values(stats.byStatus).reduce((a, b) => a + b, 0) : 0;
    const converted = stats?.byStatus.CONVERTED ?? 0;
    const openReservations = recent.filter((l) => l.type === "RESERVATION" && isOpen(l));
    return {
      all,
      rate: all ? Math.round((converted / all) * 100) : 0,
      converted,
      openResValue: openReservations.reduce((s, l) => s + (l.total ?? 0), 0),
      openResCount: openReservations.length,
    };
  }, [stats, recent]);

  /* Mutations */
  const invalidate = () => qc.invalidateQueries({ queryKey: ["web-leads"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof webLeadService.update>[1] }) =>
      webLeadService.update(id, data),
    onSuccess: (_r, vars) => {
      if (vars.data.status) toast.success(`Marcado como “${STATUS_META[vars.data.status].label}”`);
      else if (vars.data.customerId) toast.success("Cliente vinculado ao pedido");
      else if ("notes" in vars.data) toast.success("Anotação salva");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar o pedido"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webLeadService.remove(id),
    onSuccess: () => {
      toast.success("Pedido excluído");
      setSelectedId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível excluir o pedido"),
  });

  const setStatus = (lead: WebLead, status: WebLeadStatus) => updateMutation.mutate({ id: lead.id, data: { status } });

  const onWhatsApp = (lead: WebLead) => {
    if (lead.status !== "NEW") return;
    toast("Conversou com o cliente?", {
      description: `Marque ${firstName(lead.name)} como “Em contato” para a equipe saber.`,
      action: { label: "Marcar", onClick: () => setStatus(lead, "CONTACTED") },
      duration: 8000,
    });
  };

  /* Assistente Império */
  const insights = useMemo(() => {
    const out: { key: string; icon: React.ElementType; tone: "success" | "warning" | "info" | "danger" | "gold"; title: string; body: string; action?: { label: string; onClick: () => void } }[] = [];
    const now = new Date();
    const stale = recent.filter((l) => l.status === "NEW" && differenceInHours(now, new Date(l.createdAt)) >= 2);
    if (stale.length) {
      const oldest = stale[stale.length - 1];
      out.push({
        key: "stale",
        icon: Clock,
        tone: "danger",
        title: `${stale.length} ${stale.length === 1 ? "pedido novo está" : "pedidos novos estão"} há mais de 2h sem contato`,
        body: `O mais antigo é de ${firstName(oldest.name)} (${timeAgo(oldest.createdAt)}). Responda rápido — quem é atendido na primeira hora compra muito mais.`,
        action: { label: "Ver novos", onClick: () => { changeTab("NEW"); setType(undefined); setSelectedId(oldest.id); } },
      });
    }
    const tomorrow = addDays(now, 1);
    const apptTomorrow = recent.filter((l) => l.type === "APPOINTMENT" && isOpen(l) && l.preferredDate && isSameDay(leadDay(l.preferredDate)!, tomorrow));
    const apptToday = recent.filter((l) => l.type === "APPOINTMENT" && isOpen(l) && l.preferredDate && isSameDay(leadDay(l.preferredDate)!, now));
    if (apptToday.length) {
      out.push({
        key: "today",
        icon: CalendarClock,
        tone: "warning",
        title: `${apptToday.length} ${apptToday.length === 1 ? "agendamento" : "agendamentos"} para hoje`,
        body: `${apptToday.map((l) => `${firstName(l.name)}${l.preferredTime ? ` (${l.preferredTime})` : ""}`).join(", ")}. Deixe a sala de exame e a agenda prontas.`,
        action: { label: "Abrir", onClick: () => { changeTab("ALL"); setType("APPOINTMENT"); setSelectedId(apptToday[0].id); } },
      });
    }
    if (apptTomorrow.length) {
      out.push({
        key: "tomorrow",
        icon: CalendarClock,
        tone: "info",
        title: `${apptTomorrow.length} ${apptTomorrow.length === 1 ? "agendamento" : "agendamentos"} para amanhã`,
        body: `${apptTomorrow.map((l) => firstName(l.name)).join(", ")}. Mande uma confirmação pelo WhatsApp hoje para evitar faltas.`,
        action: { label: "Confirmar", onClick: () => { changeTab("ALL"); setType("APPOINTMENT"); setSelectedId(apptTomorrow[0].id); } },
      });
    }
    const staleRes = recent.filter((l) => l.type === "RESERVATION" && isOpen(l) && differenceInCalendarDays(now, new Date(l.createdAt)) >= 3);
    if (staleRes.length) {
      const value = staleRes.reduce((s, l) => s + (l.total ?? 0), 0);
      out.push({
        key: "stale-res",
        icon: ShoppingBag,
        tone: "warning",
        title: `${staleRes.length} ${staleRes.length === 1 ? "reserva parada" : "reservas paradas"} há 3+ dias`,
        body: `${formatCurrency(value)} em produtos separados. Ligue para combinar a retirada ou descarte para liberar o estoque.`,
        action: { label: "Ver reservas", onClick: () => { changeTab("ALL"); setType("RESERVATION"); setSelectedId(staleRes[0].id); } },
      });
    }
    const pastAppt = recent.filter((l) => l.type === "APPOINTMENT" && isOpen(l) && l.preferredDate && differenceInCalendarDays(leadDay(l.preferredDate)!, now) < 0);
    if (pastAppt.length) {
      out.push({
        key: "past",
        icon: AlertTriangle,
        tone: "gold",
        title: `${pastAppt.length} ${pastAppt.length === 1 ? "agendamento já passou" : "agendamentos já passaram"} e segue em aberto`,
        body: "Se o cliente veio, marque como convertido; se faltou, chame para remarcar.",
      });
    }
    const unlinked = recent.filter((l) => isOpen(l) && !l.customerId).length;
    if (unlinked >= 2) {
      out.push({
        key: "unlinked",
        icon: UserPlus,
        tone: "info",
        title: `${unlinked} pedidos em aberto de pessoas sem cadastro`,
        body: "Cadastre-as como clientes para registrar receitas, vendas e lembretes de retorno.",
      });
    }
    if (!out.length && recent.length) {
      out.push({
        key: "ok",
        icon: CheckCircle2,
        tone: "success",
        title: "Tudo em dia por aqui",
        body: "Nenhum pedido do site esperando resposta. Novos pedidos aparecem sozinhos a cada minuto.",
      });
    }
    return out.slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent]);

  const detail = selected ? (
    <LeadDetail
      key={selected.id}
      lead={selected}
      busy={updateMutation.isPending}
      onStatus={(s) => setStatus(selected, s)}
      onSaveNotes={(notes) => updateMutation.mutate({ id: selected.id, data: { notes: notes.trim() || null } })}
      onLink={(customerId) => updateMutation.mutate({ id: selected.id, data: { customerId } })}
      onDelete={() => deleteMutation.mutate(selected.id)}
      deleting={deleteMutation.isPending}
      onWhatsApp={() => onWhatsApp(selected)}
      onClose={isDesktop ? undefined : () => setSelectedId(null)}
      navigate={navigate}
    />
  ) : null;

  const refreshing = listQuery.isFetching || statsQuery.isFetching;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Site Óticas Império"
          title="Pedidos do site"
          icon={Inbox}
          description="Reservas, agendamentos e mensagens enviados pela vitrine online. Atualiza sozinho a cada minuto."
          actions={
            <>
              <Button variant="outline" onClick={() => invalidate()} disabled={refreshing}>
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Atualizar
              </Button>
              <Button variant="outline" asChild>
                <a href="/" target="_blank" rel="noreferrer">
                  <Globe className="h-4 w-4" /> Ver site
                </a>
              </Button>
            </>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {statsQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[112px] rounded-2xl" />)
          ) : (
            <>
              <StatCard
                {...rise(1)}
                featured
                label="Novos pedidos"
                value={stats?.newCount ?? 0}
                hint={stats?.newCount ? "aguardando o primeiro contato" : "nenhum aguardando"}
                icon={Inbox}
                onClick={() => changeTab("NEW")}
              />
              <StatCard
                {...rise(2)}
                label="Últimos 30 dias"
                value={stats?.last30 ?? 0}
                hint={`${kpis.all} pedidos no total`}
                icon={TrendingUp}
                tone="navy"
              />
              <StatCard
                {...rise(3)}
                label="Taxa de conversão"
                value={`${kpis.rate}%`}
                hint={`${kpis.converted} ${kpis.converted === 1 ? "pedido virou" : "pedidos viraram"} atendimento`}
                icon={CheckCircle2}
                tone="success"
              />
              <StatCard
                {...rise(4)}
                label="Reservas em aberto"
                value={formatCurrency(kpis.openResValue)}
                hint={`${kpis.openResCount} ${kpis.openResCount === 1 ? "reserva" : "reservas"} para retirar`}
                icon={Wallet}
                tone="gold"
                onClick={() => { changeTab("ALL"); setType("RESERVATION"); }}
              />
            </>
          )}
        </div>

        {/* Assistant */}
        {insights.length > 0 && (
          <Panel
            {...rise(5)}
            title="Assistente Império"
            description="O que merece atenção agora nos pedidos do site"
            icon={Sparkles}
            bodyClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            {insights.map((i) => (
              <InsightCard
                key={i.key}
                icon={i.icon}
                tone={i.tone}
                title={i.title}
                action={
                  i.action && (
                    <button onClick={i.action.onClick} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                      {i.action.label} <ArrowUpRight className="h-3 w-3" />
                    </button>
                  )
                }
              >
                {i.body}
              </InsightCard>
            ))}
          </Panel>
        )}

        {/* Filters */}
        <Panel {...rise(6)} bodyClassName="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nome, telefone ou e-mail"
                className="h-10 pl-9 pr-9"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:pb-0">
              <TypeChip active={!type} onClick={() => { setType(undefined); setPage(1); }}>
                Todos os tipos
              </TypeChip>
              {TYPES.map((t) => {
                const M = TYPE_META[t];
                return (
                  <TypeChip key={t} active={type === t} onClick={() => { setType(type === t ? undefined : t); setPage(1); }}>
                    <M.icon className="h-3.5 w-3.5" /> {M.plural}
                    <span className="num text-[11px] opacity-70">{stats?.byType[t] ?? 0}</span>
                  </TypeChip>
                );
              })}
            </div>
          </div>

          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {TABS.map((t) => {
              const active = tab === t;
              const count = t === "ALL" ? kpis.all : stats?.byStatus[t] ?? 0;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => changeTab(t)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-gold/50 hover:text-foreground",
                  )}
                >
                  {t === "ALL" ? "Todos" : STATUS_META[t].tab}
                  <span
                    className={cn(
                      "num rounded-full px-1.5 text-[11px] font-semibold",
                      active ? "bg-white/15 text-gold" : t === "NEW" && count > 0 ? "bg-gold text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {statsQuery.isLoading ? "·" : count}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* List + detail */}
        <div
          className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]", rise(7).className)}
          style={rise(7).style}
        >
          <div className="min-w-0">
            {listQuery.isLoading ? (
              <Panel bodyClassName="p-0">
                <div className="divide-y divide-border">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              </Panel>
            ) : listQuery.isError ? (
              <Panel>
                <EmptyState
                  icon={AlertTriangle}
                  title="Não foi possível carregar os pedidos"
                  description={(listQuery.error as Error)?.message}
                  action={
                    <Button variant="outline" onClick={() => listQuery.refetch()}>
                      <RefreshCw className="h-4 w-4" /> Tentar novamente
                    </Button>
                  }
                />
              </Panel>
            ) : leads.length === 0 ? (
              <Panel>
                <EmptyState
                  icon={Inbox}
                  title={search || type ? "Nenhum pedido encontrado" : tab === "NEW" ? "Nenhum pedido novo" : "Nada por aqui"}
                  description={
                    search || type
                      ? "Tente outra busca ou limpe os filtros."
                      : "Quando alguém reservar um produto, agendar um exame ou mandar uma mensagem pelo site, o pedido aparece aqui."
                  }
                  action={
                    search || type ? (
                      <Button variant="outline" onClick={() => { setSearchInput(""); setType(undefined); }}>
                        Limpar filtros
                      </Button>
                    ) : tab !== "ALL" ? (
                      <Button variant="outline" onClick={() => changeTab("ALL")}>Ver todos os pedidos</Button>
                    ) : (
                      <Button variant="gold" asChild>
                        <a href="/" target="_blank" rel="noreferrer"><Globe className="h-4 w-4" /> Abrir o site</a>
                      </Button>
                    )
                  }
                />
              </Panel>
            ) : (
              <div className="space-y-3">
                <Panel bodyClassName="p-0">
                  <ul className="divide-y divide-border">
                    {leads.map((lead) => {
                      const active = lead.id === selectedId;
                      return (
                        <li key={lead.id}>
                          <LeadRow
                            lead={lead}
                            active={active}
                            onClick={() => setSelectedId(active && !isDesktop ? null : lead.id)}
                          />
                          {active && !isDesktop && detail && (
                            <div className="border-t border-border bg-background/60 p-3 sm:p-4">{detail}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
                {pages > 1 && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      Página <span className="num font-semibold text-foreground">{page}</span> de <span className="num">{pages}</span> ·{" "}
                      <span className="num">{total}</span> pedidos
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detail pane (desktop) */}
          <div className="hidden min-w-0 lg:block">
            <div className="lg:sticky lg:top-4">
              {detail ? (
                <Panel bodyClassName="p-5">{detail}</Panel>
              ) : leads.length > 0 ? (
                <Panel>
                  <EmptyState icon={Inbox} title="Selecione um pedido" description="Os detalhes e as ações aparecem aqui." />
                </Panel>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

/* ── Pieces ──────────────────────────────────────────────── */
function useIsDesktop() {
  const query = "(min-width: 1024px)";
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setMatch(mql.matches);
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return match;
}

function TypeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors",
        active ? "border-gold/60 bg-gold-soft text-gold-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function TypeIcon({ type, className }: { type: WebLeadType; className?: string }) {
  const M = TYPE_META[type];
  return (
    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", M.chip, className)}>
      <M.icon className="h-[18px] w-[18px]" />
    </div>
  );
}

function leadSummary(lead: WebLead) {
  if (lead.type === "RESERVATION") {
    const items = lead.items ?? [];
    const qty = items.reduce((s, i) => s + i.quantity, 0);
    return `${qty} ${qty === 1 ? "item" : "itens"} · ${items.map((i) => i.name).join(", ")}`;
  }
  if (lead.type === "APPOINTMENT") {
    const day = leadDay(lead.preferredDate);
    return [lead.service || "Atendimento", day && dayLabel(day), lead.preferredTime].filter(Boolean).join(" · ");
  }
  return lead.message || "Mensagem sem texto";
}

function LeadRow({ lead, active, onClick }: { lead: WebLead; active: boolean; onClick: () => void }) {
  const M = TYPE_META[lead.type];
  const S = STATUS_META[lead.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full items-start gap-3 p-4 text-left transition-colors",
        active ? "bg-accent/70" : "hover:bg-muted/50",
      )}
    >
      {active && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gold" />}
      <TypeIcon type={lead.type} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("truncate text-sm", lead.status === "NEW" ? "font-bold" : "font-semibold")}>{lead.name}</p>
          {lead.status === "NEW" && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Novo" />}
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{timeAgo(lead.createdAt)}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{M.label}</span> · {leadSummary(lead)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusPill tone={S.tone}>{S.label}</StatusPill>
          {lead.type === "RESERVATION" && lead.total != null && (
            <span className="num font-display text-sm font-semibold">{formatCurrency(lead.total)}</span>
          )}
          {lead.customerId && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <UserRound className="h-3 w-3" /> Cliente
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function LeadDetail({
  lead, busy, deleting, onStatus, onSaveNotes, onLink, onDelete, onWhatsApp, onClose, navigate,
}: {
  lead: WebLead;
  busy: boolean;
  deleting: boolean;
  onStatus: (s: WebLeadStatus) => void;
  onSaveNotes: (notes: string) => void;
  onLink: (customerId: string) => void;
  onDelete: () => void;
  onWhatsApp: () => void;
  onClose?: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const M = TYPE_META[lead.type];
  const S = STATUS_META[lead.status];
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = notes.trim() !== (lead.notes ?? "").trim();
  const phone = localPhone(lead.phone);
  const wa = waLink(lead.phone, replyText(lead));
  const day = leadDay(lead.preferredDate);
  const dayDiff = day ? differenceInCalendarDays(day, new Date()) : null;

  // Keep the note in sync when the lead is refreshed and nothing was typed.
  useEffect(() => {
    if (!dirty) setNotes(lead.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.notes]);

  // Not linked yet? Look for a customer registered with the same phone.
  const matchQuery = useQuery({
    queryKey: ["web-leads", "match", lead.id, phone.slice(-8)],
    queryFn: () => customerService.list({ search: phone.slice(-8), limit: 1 }).then((r) => r.data[0] ?? null),
    enabled: !lead.customerId && phone.length >= 8,
    staleTime: 60_000,
  });
  const match = matchQuery.data;

  const registerUrl = `/clientes/novo?${new URLSearchParams({
    nome: lead.name,
    telefone: phone,
    ...(lead.email ? { email: lead.email } : {}),
  }).toString()}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <InitialsAvatar name={lead.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold leading-tight">{lead.name}</h3>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", M.chip)}>
              <M.icon className="h-3 w-3" /> {M.label}
            </span>
            <StatusPill tone={S.tone}>{S.label}</StatusPill>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground" title={format(new Date(lead.createdAt), "dd/MM/yyyy HH:mm")}>
            Recebido {timeAgo(lead.createdAt)} · {format(new Date(lead.createdAt), "dd/MM 'às' HH:mm")}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {wa && (
          <Button variant="gold" asChild className="col-span-2 sm:col-span-1">
            <a href={wa} target="_blank" rel="noreferrer" onClick={onWhatsApp}>
              <MessageCircle className="h-4 w-4" /> Responder no WhatsApp
            </a>
          </Button>
        )}
        <Button variant="outline" asChild>
          <a href={`tel:+55${phone}`}>
            <Phone className="h-4 w-4" /> <span className="num">{formatPhone(phone)}</span>
          </a>
        </Button>
        {lead.email && (
          <Button variant="outline" asChild className="min-w-0">
            <a href={`mailto:${lead.email}`} title={lead.email}>
              <Mail className="h-4 w-4" /> <span className="truncate">E-mail</span>
            </a>
          </Button>
        )}
      </div>

      {/* Request */}
      {lead.type === "APPOINTMENT" && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="eyebrow mb-2">Agendamento solicitado</p>
          <p className="font-semibold">{lead.service || "Atendimento"}</p>
          {day ? (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
              {lead.preferredTime && <span className="text-muted-foreground">· {lead.preferredTime}</span>}
              {dayDiff === 0 && <StatusPill tone="warning">Hoje</StatusPill>}
              {dayDiff === 1 && <StatusPill tone="info">Amanhã</StatusPill>}
              {dayDiff !== null && dayDiff < 0 && <StatusPill tone="neutral">Data já passou</StatusPill>}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Sem data definida{lead.preferredTime ? ` · prefere ${lead.preferredTime}` : ""}
            </p>
          )}
        </div>
      )}

      {lead.type === "RESERVATION" && (
        <div className="rounded-xl border border-border bg-card">
          <p className="eyebrow px-4 pt-4">Produtos reservados</p>
          <ul className="divide-y divide-border px-4">
            {(lead.items ?? []).map((i) => (
              <li key={i.productId} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    to={`/produtos/${i.productId}/editar`}
                    className="text-sm font-medium hover:text-primary hover:underline"
                  >
                    {i.name}
                  </Link>
                  <p className="num text-xs text-muted-foreground">
                    {i.quantity} × {formatCurrency(i.unitPrice)}
                  </p>
                </div>
                <span className="num shrink-0 text-sm font-semibold">{formatCurrency(i.unitPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between rounded-b-xl border-t border-border bg-muted/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">Total estimado</span>
            <span className="num font-display text-xl font-semibold">{formatCurrency(lead.total ?? 0)}</span>
          </div>
        </div>
      )}

      {lead.message && (
        <div>
          <p className="eyebrow mb-1.5">{lead.type === "CONTACT" ? "Mensagem" : "Observação do cliente"}</p>
          <blockquote className="whitespace-pre-line rounded-xl border-l-[3px] border-gold bg-gold-soft/40 px-4 py-3 text-sm leading-relaxed">
            {lead.message}
          </blockquote>
        </div>
      )}

      {/* Customer */}
      <div className="rounded-xl border border-dashed border-border p-3.5">
        {lead.customerId ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              <UserRound className="h-4 w-4 shrink-0 text-success" />
              <span className="font-medium">Cliente já cadastrado</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate(`/clientes/${lead.customerId}`)}>
              Ver cliente
            </Button>
            {lead.type === "RESERVATION" && (
              <Button size="sm" onClick={() => navigate(`/vendas/nova?customerId=${lead.customerId}`)}>
                <ShoppingCart className="h-4 w-4" /> Abrir venda
              </Button>
            )}
          </div>
        ) : match ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-sm">
              Encontramos <span className="font-semibold">{match.name}</span> com o mesmo telefone.
            </p>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onLink(match.id)}>
              <Link2 className="h-4 w-4" /> Vincular
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">Ainda não é cliente cadastrado.</p>
            <Button size="sm" variant="outline" onClick={() => navigate(registerUrl)}>
              <UserPlus className="h-4 w-4" /> Cadastrar cliente
            </Button>
          </div>
        )}
      </div>

      {/* Status */}
      <div>
        <p className="eyebrow mb-2">Andamento</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatusButton current={lead.status} value="CONTACTED" disabled={busy} onClick={onStatus} icon={Phone} label="Em contato" />
          <StatusButton current={lead.status} value="CONVERTED" disabled={busy} onClick={onStatus} icon={CheckCircle2} label="Convertido" />
          <StatusButton current={lead.status} value="DISCARDED" disabled={busy} onClick={onStatus} icon={XCircle} label="Descartado" />
          {lead.status !== "NEW" && (
            <Button variant="ghost" size="sm" className="h-10 text-muted-foreground" disabled={busy} onClick={() => onStatus("NEW")}>
              <RotateCcw className="h-4 w-4" /> Voltar para novo
            </Button>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="eyebrow">Anotações internas</p>
          <span className="num text-[11px] text-muted-foreground">{notes.length}/2000</span>
        </div>
        <Textarea
          value={notes}
          maxLength={2000}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: ligou dia 12, volta sábado para provar as armações."
          rows={3}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-soft hover:text-danger"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4" /> Excluir pedido
          </Button>
          <Button size="sm" disabled={!dirty || busy} onClick={() => onSaveNotes(notes)}>
            {busy && dirty ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar anotação
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              O pedido de {lead.name} será removido definitivamente. Para apenas arquivar, prefira marcar como “Descartado”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-white hover:bg-danger/90" onClick={onDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ExternalLink className="h-3 w-3" /> Enviado pelo site · atualizado {timeAgo(lead.updatedAt)}
      </p>
    </div>
  );
}

function StatusButton({
  current, value, disabled, onClick, icon: Icon, label,
}: {
  current: WebLeadStatus;
  value: WebLeadStatus;
  disabled: boolean;
  onClick: (s: WebLeadStatus) => void;
  icon: React.ElementType;
  label: string;
}) {
  const active = current === value;
  const tone =
    value === "CONVERTED" ? "border-success/40 bg-success-soft text-success" : value === "DISCARDED" ? "border-border bg-muted text-muted-foreground" : "border-info/40 bg-info-soft text-info";
  return (
    <button
      type="button"
      disabled={disabled || active}
      onClick={() => onClick(value)}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-default",
        active ? tone : "border-border bg-card hover:border-gold/50 hover:bg-accent",
        disabled && !active && "opacity-60",
      )}
    >
      <Icon className="h-4 w-4" /> {label}
      {active && <CheckCircle2 className="h-3.5 w-3.5" />}
    </button>
  );
}
