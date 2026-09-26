import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, Cake, CalendarClock, ChevronLeft, ChevronRight, Eye, Loader2, MapPin, MessageCircle,
  Pencil, Phone, Plus, RefreshCw, Search, Sparkles, Trash2, UserPlus, Users, X,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState, InitialsAvatar, InsightCard, PageHeader, Panel, StatCard, StatusPill, rise,
} from "@/components/imperio";
import customerService, { whatsAppLink, type CustomerListItem } from "@/services/customer.service";
import prescriptionService from "@/services/prescription.service";
import { formatCPF, formatCurrency, formatPhone } from "@/utils/formatters";
import { formatDay } from "@/components/prescriptions/PrescriptionParts";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CustomerStatus, UserRole, type Customer } from "@/types";

const PAGE_SIZE = 12;

type StatusFilter = "all" | CustomerStatus;

/** Dias até o próximo aniversário (0 = hoje). Usa a parte AAAA-MM-DD da data. */
function daysToBirthday(iso?: string | null): number | null {
  if (!iso) return null;
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!m || !d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function birthdayMonth(iso?: string | null): number | null {
  if (!iso) return null;
  const m = Number(iso.slice(5, 7));
  return m || null;
}

function monthStartIso() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString();
}

function relativeDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}

export default function Customers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = user?.role !== UserRole.VIEWER;
  const [params, setParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(params.get("busca") ?? "");
  const [search, setSearch] = useState(searchInput);
  const [cityInput, setCityInput] = useState(params.get("cidade") ?? "");
  const [city, setCity] = useState(cityInput);
  const [status, setStatus] = useState<StatusFilter>((params.get("status") as StatusFilter) || "all");
  const [birthdaysOnly, setBirthdaysOnly] = useState(params.get("aniversariantes") === "1");
  const [page, setPage] = useState(Number(params.get("pagina")) || 1);

  const [rows, setRows] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [birthdays, setBirthdays] = useState<Customer[] | null>(null);
  const [stats, setStats] = useState<{ total: number; newThisMonth: number; expiringRx: number; expiringRxNames: string[] } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CustomerListItem | Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce de busca e cidade
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => {
    const t = setTimeout(() => setCity(cityInput.trim()), 400);
    return () => clearTimeout(t);
  }, [cityInput]);

  // Volta para a página 1 quando os filtros mudam (exceto na montagem)
  const firstFilterRun = useRef(true);
  useEffect(() => {
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
      return;
    }
    setPage(1);
  }, [search, city, status, birthdaysOnly]);

  // Sincroniza filtros na URL (permite voltar do detalhe sem perder o estado)
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set("busca", search);
    if (city) next.set("cidade", city);
    if (status !== "all") next.set("status", status);
    if (birthdaysOnly) next.set("aniversariantes", "1");
    if (page > 1) next.set("pagina", String(page));
    setParams(next, { replace: true });
  }, [search, city, status, birthdaysOnly, page, setParams]);

  const birthdaysRef = useRef<Customer[] | null>(null);
  const loadBirthdays = useCallback(async () => {
    try {
      const res = await customerService.getBirthdays();
      birthdaysRef.current = res.data ?? [];
    } catch {
      birthdaysRef.current = [];
    }
    setBirthdays(birthdaysRef.current);
    return birthdaysRef.current;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (birthdaysOnly) {
        // Endpoint de aniversariantes não pagina: filtramos e paginamos aqui
        const list = birthdaysRef.current ?? (await loadBirthdays());
        const q = search.toLowerCase();
        const qDigits = search.replace(/\D/g, "");
        const filtered = list
          .filter((c) => (status === "all" ? true : c.status === status))
          .filter((c) => (city ? (c.city ?? "").toLowerCase().includes(city.toLowerCase()) : true))
          .filter((c) =>
            !q
              ? true
              : c.name.toLowerCase().includes(q) ||
                (qDigits.length >= 3 && ((c.cpf ?? "").includes(qDigits) || c.phone.includes(qDigits))),
          )
          .sort((a, b) => (a.birthDate ?? "").slice(8, 10).localeCompare((b.birthDate ?? "").slice(8, 10)));
        setTotal(filtered.length);
        setRows(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
      } else {
        const res = await customerService.list({
          search: search || undefined,
          status: status === "all" ? undefined : status,
          city: city || undefined,
          page,
          limit: PAGE_SIZE,
        });
        setRows(res.data);
        setTotal(res.total);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar clientes";
      setError(msg);
      toast({ title: "Erro ao carregar clientes", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [birthdaysOnly, loadBirthdays, search, status, city, page, toast]);

  const loadStats = useCallback(async () => {
    try {
      const [all, fresh, expiring] = await Promise.all([
        customerService.list({ limit: 1 }),
        customerService.list({ limit: 1, createdFrom: monthStartIso() }),
        prescriptionService.list({ filter: "expiring" }).catch(() => []),
      ]);
      const byCustomer = new Map<string, string>();
      expiring.forEach((p) => p.customer && byCustomer.set(p.customer.id, p.customer.name));
      setStats({
        total: all.total,
        newThisMonth: fresh.total,
        expiringRx: byCustomer.size,
        expiringRxNames: Array.from(byCustomer.values()),
      });
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadStats();
    if (!birthdaysRef.current) loadBirthdays();
  }, [loadStats, loadBirthdays]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!search || !!city || status !== "all" || birthdaysOnly;

  const clearFilters = () => {
    setSearchInput("");
    setCityInput("");
    setStatus("all");
    setBirthdaysOnly(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await customerService.delete(deleteTarget.id);
      toast({ title: "Cliente excluído", description: deleteTarget.name });
      setDeleteTarget(null);
      await loadBirthdays();
      if (rows.length === 1 && page > 1) setPage(page - 1);
      else load();
      loadStats();
    } catch (e) {
      toast({
        title: "Não foi possível excluir",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  /* ── Assistente ──────────────────────────────────────── */
  const upcomingBirthdays = useMemo(() => {
    if (!birthdays) return [];
    return birthdays
      .map((c) => ({ c, d: daysToBirthday(c.birthDate) }))
      .filter((x): x is { c: Customer; d: number } => x.d !== null && x.d <= 7)
      .sort((a, b) => a.d - b.d);
  }, [birthdays]);

  const insights = useMemo(() => {
    const out: JSX.Element[] = [];
    const today = upcomingBirthdays.filter((x) => x.d === 0);
    if (today.length) {
      const first = today[0].c;
      const link = whatsAppLink(first.whatsapp || first.phone, `Olá, ${first.name.split(" ")[0]}! A Óticas Império deseja um feliz aniversário!`);
      out.push(
        <InsightCard
          key="bday-today"
          icon={Cake}
          tone="gold"
          title={today.length === 1 ? `${first.name} faz aniversário hoje` : `${today.length} clientes fazem aniversário hoje`}
          action={
            link && (
              <a href={link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
                Enviar parabéns pelo WhatsApp →
              </a>
            )
          }
        >
          Uma mensagem carinhosa com um cupom de desconto fideliza e traz o cliente de volta à loja.
        </InsightCard>,
      );
    }
    const week = upcomingBirthdays.filter((x) => x.d > 0);
    if (week.length) {
      out.push(
        <InsightCard
          key="bday-week"
          icon={Cake}
          tone="info"
          title={`${week.length} aniversário${week.length > 1 ? "s" : ""} nos próximos 7 dias`}
          action={
            <button type="button" onClick={() => setBirthdaysOnly(true)} className="text-xs font-semibold text-primary hover:underline">
              Ver aniversariantes →
            </button>
          }
        >
          {week
            .slice(0, 3)
            .map((x) => `${x.c.name.split(" ")[0]} (${x.d === 1 ? "amanhã" : `em ${x.d} dias`})`)
            .join(", ")}
          {week.length > 3 ? "…" : "."}
        </InsightCard>,
      );
    }
    if (stats && stats.expiringRx > 0) {
      out.push(
        <InsightCard
          key="rx"
          icon={CalendarClock}
          tone="warning"
          title={`${stats.expiringRx} cliente${stats.expiringRx > 1 ? "s" : ""} com receita vencendo em 30 dias`}
          action={
            <button type="button" onClick={() => navigate("/receitas?filtro=expiring")} className="text-xs font-semibold text-primary hover:underline">
              Ver receitas →
            </button>
          }
        >
          Sugira um novo exame de vista a {stats.expiringRxNames.slice(0, 2).map((n) => n.split(" ")[0]).join(" e ")}
          {stats.expiringRx > 2 ? " e outros" : ""} — ótima oportunidade de venda.
        </InsightCard>,
      );
    }
    if (stats && stats.newThisMonth > 0) {
      out.push(
        <InsightCard key="new" icon={UserPlus} tone="success" title={`${stats.newThisMonth} novo${stats.newThisMonth > 1 ? "s" : ""} cliente${stats.newThisMonth > 1 ? "s" : ""} este mês`}>
          Confirme se o cadastro está completo (CPF, data de nascimento e WhatsApp) para campanhas futuras.
        </InsightCard>,
      );
    }
    return out.slice(0, 4);
  }, [upcomingBirthdays, stats, navigate]);

  /* ── Pedaços de UI ───────────────────────────────────── */
  const statusPill = (s: CustomerStatus) =>
    s === CustomerStatus.INACTIVE ? <StatusPill tone="neutral">Inativo</StatusPill> : <StatusPill tone="success">Ativo</StatusPill>;

  const birthdayBadge = (c: Customer) => {
    const d = daysToBirthday(c.birthDate);
    const thisMonth = birthdayMonth(c.birthDate) === new Date().getMonth() + 1;
    if (d === null || (!thisMonth && d > 7)) return null;
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-semibold text-gold-foreground"
        title={`Aniversário: ${formatDay(c.birthDate)}`}
      >
        <Cake className="h-3 w-3" />
        {d === 0 ? "Hoje" : d <= 7 ? `em ${d}d` : `dia ${c.birthDate!.slice(8, 10)}`}
      </span>
    );
  };

  const lastPurchase = (c: CustomerListItem) => {
    const o = c.salesOrders?.[0];
    if (!o) return <span className="text-xs text-muted-foreground">Sem compras</span>;
    return (
      <div className="leading-tight">
        <span className="num font-medium">{formatCurrency(o.total)}</span>
        <span className="block text-xs text-muted-foreground">{relativeDays(o.date)}</span>
      </div>
    );
  };

  const waButton = (c: Customer, size: "icon" | "sm" = "sm") => {
    const link = whatsAppLink(c.whatsapp || c.phone);
    if (!link) return null;
    return (
      <Button asChild size="sm" variant="ghost" className={cn("text-success hover:text-success", size === "icon" && "px-2")} title="Abrir WhatsApp">
        <a href={link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
          <MessageCircle className="h-4 w-4" />
        </a>
      </Button>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Relacionamento"
          title="Clientes"
          description="Cadastro, histórico de compras e receitas de cada cliente."
          icon={Users}
          actions={
            canEdit && (
              <Button onClick={() => navigate("/clientes/novo")}>
                <Plus className="mr-2 h-4 w-4" /> Novo cliente
              </Button>
            )
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats ? (
            <>
              <StatCard {...rise(1)} featured label="Clientes cadastrados" value={stats.total.toLocaleString("pt-BR")} icon={Users} onClick={clearFilters} />
              <StatCard {...rise(2)} label="Novos no mês" value={stats.newThisMonth.toLocaleString("pt-BR")} tone="success" icon={UserPlus} hint="Cadastrados desde o dia 1º" />
              <StatCard
                {...rise(3)}
                label="Aniversariantes do mês"
                value={(birthdays?.length ?? 0).toLocaleString("pt-BR")}
                tone="gold"
                icon={Cake}
                hint={upcomingBirthdays.length ? `${upcomingBirthdays.length} nos próximos 7 dias` : undefined}
                onClick={() => setBirthdaysOnly(true)}
              />
              <StatCard
                {...rise(4)}
                label="Com receita vencendo"
                value={stats.expiringRx.toLocaleString("pt-BR")}
                tone="warning"
                icon={CalendarClock}
                hint="Próximos 30 dias"
                onClick={() => navigate("/receitas?filtro=expiring")}
              />
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)
          )}
        </div>

        {insights.length > 0 && (
          <Panel title="Assistente Império" description="Oportunidades de contato identificadas na sua base" icon={Sparkles} {...rise(5)}>
            <div className="grid gap-3 md:grid-cols-2">{insights}</div>
          </Panel>
        )}

        <Panel bodyClassName="p-0" {...rise(6)}>
          {/* Filtros */}
          <div className="space-y-3 border-b border-border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_200px_180px_auto]">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF, telefone ou e-mail…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Cidade" value={cityInput} onChange={(e) => setCityInput(e.target.value)} className="pl-9" />
              </div>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value={CustomerStatus.ACTIVE}>Ativos</SelectItem>
                  <SelectItem value={CustomerStatus.INACTIVE}>Inativos</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant={birthdaysOnly ? "gold" : "outline"}
                onClick={() => setBirthdaysOnly((v) => !v)}
                aria-pressed={birthdaysOnly}
              >
                <Cake className="mr-2 h-4 w-4" /> Aniversariantes
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="num">
                {loading ? "Carregando…" : `${total.toLocaleString("pt-BR")} cliente${total === 1 ? "" : "s"}${birthdaysOnly ? " fazendo aniversário este mês" : ""}`}
              </span>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  <X className="h-3.5 w-3.5" /> Limpar filtros
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="hidden h-4 w-24 md:block" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertTriangle}
              title="Não foi possível carregar os clientes"
              description={error}
              action={
                <Button variant="outline" onClick={load}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
                </Button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={birthdaysOnly ? Cake : Users}
              title={hasFilters ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              description={hasFilters ? "Ajuste a busca ou limpe os filtros." : "Cadastre o primeiro cliente para começar a vender."}
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                ) : (
                  canEdit && (
                    <Button onClick={() => navigate("/clientes/novo")}>
                      <Plus className="mr-2 h-4 w-4" /> Cadastrar cliente
                    </Button>
                  )
                )
              }
            />
          ) : (
            <>
              {/* Mobile */}
              <ul className="divide-y divide-border md:hidden">
                {rows.map((c) => (
                  <li key={c.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/clientes/${c.id}`)}
                      onKeyDown={(e) => e.key === "Enter" && navigate(`/clientes/${c.id}`)}
                      className="flex items-start gap-3 p-4 active:bg-accent/50"
                    >
                      <InitialsAvatar name={c.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-semibold">{c.name}</p>
                          {statusPill(c.status)}
                        </div>
                        <p className="num mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {formatPhone(c.phone)}
                          {c.city && <span className="truncate"> · {c.city}</span>}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            {c.salesOrders?.[0] ? (
                              <span className="text-muted-foreground">
                                Última compra <span className="num font-medium text-foreground">{formatCurrency(c.salesOrders[0].total)}</span>{" "}
                                {relativeDays(c.salesOrders[0].date)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Sem compras</span>
                            )}
                            {birthdayBadge(c)}
                          </div>
                          <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                            {waButton(c, "icon")}
                            {canEdit && (
                              <Button size="sm" variant="ghost" className="px-2" onClick={() => navigate(`/clientes/${c.id}/editar`)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">Cliente</th>
                      <th className="px-4 py-2.5 font-semibold">Contato</th>
                      <th className="hidden px-4 py-2.5 font-semibold xl:table-cell">Cidade</th>
                      <th className="px-4 py-2.5 font-semibold">Última compra</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((c) => (
                      <tr key={c.id} className="cursor-pointer transition-colors hover:bg-accent/40" onClick={() => navigate(`/clientes/${c.id}`)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <InitialsAvatar name={c.name} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">{c.name}</span>
                                {birthdayBadge(c)}
                              </div>
                              {c.cpf && <span className="num block text-xs text-muted-foreground">{formatCPF(c.cpf)}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="num">{formatPhone(c.phone)}</span>
                          {c.email && <span className="block max-w-[200px] truncate text-xs text-muted-foreground">{c.email}</span>}
                        </td>
                        <td className="hidden px-4 py-3 xl:table-cell">
                          {c.city ? `${c.city}${c.state ? `/${c.state}` : ""}` : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">{lastPurchase(c)}</td>
                        <td className="px-4 py-3">{statusPill(c.status)}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            {waButton(c)}
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/clientes/${c.id}`)} title="Ver perfil">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/clientes/${c.id}/editar`)} title="Editar">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setDeleteTarget(c)} title="Excluir">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <p className="num text-xs text-muted-foreground">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                      <span className="hidden sm:inline">Próxima</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>

      {/* Excluir */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir cliente?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> deixará de aparecer nas listas. O histórico de vendas e receitas é preservado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
