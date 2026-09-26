import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, CalendarClock, CheckCircle2, Eye, FileText, Loader2, Pencil, Plus, RefreshCw,
  Search, Sparkles, Stethoscope, Trash2, UserRound,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState, InitialsAvatar, InsightCard, PageHeader, Panel, StatCard, rise,
} from "@/components/imperio";
import {
  LensSummary, PrescriptionFormDialog, PrescriptionGrid, ValidityPill, formatDay,
} from "@/components/prescriptions/PrescriptionParts";
import prescriptionService, { LENS_TYPE_LABELS, getValidity } from "@/services/prescription.service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LensType, UserRole, type Prescription } from "@/types";

type Filter = "all" | "valid" | "expiring" | "expired";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "valid", label: "Válidas" },
  { value: "expiring", label: "Vencem em 30 dias" },
  { value: "expired", label: "Vencidas" },
];

const LIST_CAP = 100; // limite do endpoint /prescriptions

export default function Prescriptions() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role !== UserRole.VIEWER;
  const [params, setParams] = useSearchParams();

  const initialFilter = (params.get("filtro") as Filter) || "all";
  const [filter, setFilter] = useState<Filter>(FILTERS.some((f) => f.value === initialFilter) ? initialFilter : "all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [items, setItems] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<{ all: Prescription[]; expiring: number; expired: number } | null>(null);

  const [viewing, setViewing] = useState<Prescription | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Prescription | null>(null);
  const [deleting, setDeleting] = useState<Prescription | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const serverFilter = filter === "expiring" || filter === "expired" ? filter : "all";
      let data = await prescriptionService.list({ search: search || undefined, filter: serverFilter });
      if (filter === "valid") data = data.filter((p) => getValidity(p.validity).state === "valid");
      setItems(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar receitas";
      setError(msg);
      toast({ title: "Erro ao carregar receitas", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filter, search, toast]);

  const loadStats = useCallback(async () => {
    try {
      const [all, expiring, expired] = await Promise.all([
        prescriptionService.list(),
        prescriptionService.list({ filter: "expiring" }),
        prescriptionService.list({ filter: "expired" }),
      ]);
      setStats({ all, expiring: expiring.length, expired: expired.length });
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const changeFilter = (f: Filter) => {
    setFilter(f);
    const next = new URLSearchParams(params);
    if (f === "all") next.delete("filtro");
    else next.set("filtro", f);
    setParams(next, { replace: true });
  };

  const refreshAll = () => {
    load();
    loadStats();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await prescriptionService.remove(deleting.id);
      toast({ title: "Receita excluída" });
      setDeleting(null);
      if (viewing?.id === deleting.id) setViewing(null);
      refreshAll();
    } catch (e) {
      toast({
        title: "Não foi possível excluir",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Prescription) => {
    setViewing(null);
    setEditing(p);
    setFormOpen(true);
  };

  /* ── Estatísticas e assistente ───────────────────────── */
  const fmtCount = (n: number) => (n >= LIST_CAP ? `${LIST_CAP}+` : String(n));
  const total = stats?.all.length ?? 0;
  const validCount = stats ? stats.all.filter((p) => getValidity(p.validity).state === "valid").length : 0;

  const insights = useMemo(() => {
    if (!stats) return [];
    const out: { key: string; tone: "warning" | "danger" | "info" | "gold"; icon: typeof Sparkles; title: string; body: string; action?: { label: string; onClick: () => void } }[] = [];
    const in7 = stats.all.filter((p) => {
      const v = getValidity(p.validity);
      return v.state === "expiring" && v.days <= 7;
    });
    if (in7.length) {
      out.push({
        key: "week",
        tone: "warning",
        icon: CalendarClock,
        title: `${in7.length} receita${in7.length > 1 ? "s vencem" : " vence"} nesta semana`,
        body: `Ligue ou mande WhatsApp para ${in7.slice(0, 2).map((p) => p.customer?.name?.split(" ")[0]).filter(Boolean).join(" e ")}${in7.length > 2 ? " e outros" : ""} oferecendo um novo exame e óculos atualizados.`,
        action: { label: "Ver quem vence", onClick: () => changeFilter("expiring") },
      });
    } else if (stats.expiring > 0) {
      out.push({
        key: "month",
        tone: "warning",
        icon: CalendarClock,
        title: `${fmtCount(stats.expiring)} receita(s) vencem nos próximos 30 dias`,
        body: "Boa janela para agendar retorno e apresentar lançamentos de armações.",
        action: { label: "Ver lista", onClick: () => changeFilter("expiring") },
      });
    }
    const now = Date.now();
    const recentExpired = stats.all.filter((p) => {
      const v = getValidity(p.validity);
      return v.state === "expired" && now - new Date(p.validity).getTime() <= 90 * 86400000;
    });
    if (recentExpired.length) {
      out.push({
        key: "renew",
        tone: "danger",
        icon: RefreshCw,
        title: `${recentExpired.length} receita(s) venceram nos últimos 90 dias`,
        body: "Clientes com receita recém-vencida costumam precisar de lentes novas — ofereça a renovação.",
        action: { label: "Ver vencidas", onClick: () => changeFilter("expired") },
      });
    }
    const multifocalNoAdd = stats.all.filter(
      (p) => p.lensType === LensType.MULTIFOCAL && p.odAddition == null && p.oeAddition == null,
    );
    if (multifocalNoAdd.length) {
      out.push({
        key: "addition",
        tone: "info",
        icon: AlertTriangle,
        title: `${multifocalNoAdd.length} receita(s) multifocal sem adição informada`,
        body: "Confira os dados antes de enviar ao laboratório para evitar retrabalho.",
        action: canEdit ? { label: "Revisar a primeira", onClick: () => openEdit(multifocalNoAdd[0]) } : undefined,
      });
    }
    const noDoctor = stats.all.filter((p) => !p.doctor).length;
    if (noDoctor >= 3) {
      out.push({
        key: "doctor",
        tone: "gold",
        icon: Stethoscope,
        title: `${noDoctor} receitas sem médico informado`,
        body: "Registrar médico e CRM ajuda a rastrear indicações e parcerias.",
      });
    }
    return out.slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, canEdit]);

  /* ── Render ──────────────────────────────────────────── */
  const rowActions = (p: Prescription) => (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant="ghost" onClick={() => setViewing(p)} title="Ver receita">
        <Eye className="h-4 w-4" />
      </Button>
      {canEdit && (
        <>
          <Button size="sm" variant="ghost" onClick={() => openEdit(p)} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setDeleting(p)} title="Excluir">
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Atendimento"
          title="Receitas ópticas"
          description="Prescrições dos clientes, validade e grau de cada olho."
          icon={FileText}
          actions={
            canEdit && (
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> Nova receita
              </Button>
            )
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats ? (
            <>
              <StatCard {...rise(1)} featured label="Receitas cadastradas" value={fmtCount(total)} icon={FileText} onClick={() => changeFilter("all")} />
              <StatCard {...rise(2)} label="Válidas" value={fmtCount(validCount)} tone="success" icon={CheckCircle2} onClick={() => changeFilter("valid")} />
              <StatCard {...rise(3)} label="Vencem em 30 dias" value={fmtCount(stats.expiring)} tone="warning" icon={CalendarClock} onClick={() => changeFilter("expiring")} />
              <StatCard {...rise(4)} label="Vencidas" value={fmtCount(stats.expired)} tone="danger" icon={AlertTriangle} onClick={() => changeFilter("expired")} />
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)
          )}
        </div>

        {insights.length > 0 && (
          <Panel title="Assistente Império" description="Sugestões com base nas validades das receitas" icon={Sparkles} {...rise(5)}>
            <div className="grid gap-3 md:grid-cols-2">
              {insights.map((i) => (
                <InsightCard
                  key={i.key}
                  icon={i.icon}
                  tone={i.tone}
                  title={i.title}
                  action={
                    i.action && (
                      <button type="button" onClick={i.action.onClick} className="text-xs font-semibold text-primary hover:underline">
                        {i.action.label} →
                      </button>
                    )
                  }
                >
                  {i.body}
                </InsightCard>
              ))}
            </div>
          </Panel>
        )}

        <Panel bodyClassName="p-0" {...rise(6)}>
          {/* Filtros */}
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou médico…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:pb-0">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => changeFilter(f.value)}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    filter === f.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
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
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertTriangle}
              title="Não foi possível carregar as receitas"
              description={error}
              action={
                <Button variant="outline" onClick={load}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
                </Button>
              }
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={search || filter !== "all" ? "Nenhuma receita encontrada" : "Nenhuma receita cadastrada"}
              description={
                search || filter !== "all"
                  ? "Ajuste a busca ou o filtro de validade."
                  : "Cadastre a primeira receita para acompanhar validade e grau dos clientes."
              }
              action={
                canEdit && !search && filter === "all" ? (
                  <Button onClick={openNew}>
                    <Plus className="mr-2 h-4 w-4" /> Nova receita
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Mobile */}
              <ul className="divide-y divide-border md:hidden">
                {items.map((p) => (
                  <li key={p.id} className="p-4">
                    <button type="button" onClick={() => setViewing(p)} className="flex w-full items-start gap-3 text-left">
                      <InitialsAvatar name={p.customer?.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{p.customer?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDay(p.date)}
                          {p.doctor ? ` · ${p.doctor}` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <ValidityPill validity={p.validity} />
                          <span className="num text-xs text-muted-foreground">até {formatDay(p.validity)}</span>
                        </div>
                      </div>
                    </button>
                    <div className="mt-2 flex justify-end">{rowActions(p)}</div>
                  </li>
                ))}
              </ul>

              {/* Desktop */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">Cliente</th>
                      <th className="px-4 py-2.5 font-semibold">Data</th>
                      <th className="px-4 py-2.5 font-semibold">Médico</th>
                      <th className="hidden px-4 py-2.5 font-semibold lg:table-cell">Lente</th>
                      <th className="px-4 py-2.5 font-semibold">Validade</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-accent/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <InitialsAvatar name={p.customer?.name} size="sm" />
                            {p.customer ? (
                              <Link to={`/clientes/${p.customer.id}`} className="font-medium hover:text-primary hover:underline">
                                {p.customer.name}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </div>
                        </td>
                        <td className="num px-4 py-3">{formatDay(p.date)}</td>
                        <td className="px-4 py-3">
                          {p.doctor || <span className="text-muted-foreground">—</span>}
                          {p.doctorCrm && <span className="block text-xs text-muted-foreground">CRM {p.doctorCrm}</span>}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {p.lensType ? LENS_TYPE_LABELS[p.lensType] : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <ValidityPill validity={p.validity} />
                            <span className="num text-xs text-muted-foreground">{formatDay(p.validity)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{rowActions(p)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {items.length >= LIST_CAP && (
                <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                  Exibindo as {LIST_CAP} receitas mais recentes. Use a busca para encontrar receitas mais antigas.
                </p>
              )}
            </>
          )}
        </Panel>
      </div>

      {/* Detalhe */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Receita de {viewing.customer?.name ?? "cliente"}</DialogTitle>
                <DialogDescription>Emitida em {formatDay(viewing.date)} · válida até {formatDay(viewing.validity)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ValidityPill validity={viewing.validity} />
                  <LensSummary rx={viewing} />
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="eyebrow">Médico(a)</dt>
                    <dd className="font-medium">{viewing.doctor || "—"}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">CRM</dt>
                    <dd className="font-medium">{viewing.doctorCrm || "—"}</dd>
                  </div>
                </dl>
                <PrescriptionGrid rx={viewing} />
                {viewing.notes && (
                  <div className="rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="eyebrow mb-1">Observações</p>
                    <p className="whitespace-pre-wrap">{viewing.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                {viewing.customer && (
                  <Button variant="outline" onClick={() => navigate(`/clientes/${viewing.customer!.id}`)}>
                    <UserRound className="mr-2 h-4 w-4" /> Ver cliente
                  </Button>
                )}
                {canEdit && (
                  <Button onClick={() => openEdit(viewing)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <PrescriptionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        prescription={editing}
        onSaved={refreshAll}
      />

      {/* Excluir */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && !deleteBusy && setDeleting(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir receita?</DialogTitle>
            <DialogDescription>
              A receita de <strong>{deleting?.customer?.name}</strong> emitida em {formatDay(deleting?.date)} será removida.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
