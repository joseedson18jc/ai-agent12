import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPhone } from "@/utils/formatters";
import { maskPhone } from "@/utils/masks";
import {
  PageHeader, Panel, StatCard, StatusPill, EmptyState, InsightCard, InitialsAvatar, rise,
} from "@/components/imperio";
import {
  FlaskConical, Plus, Pencil, Trash2, MessageCircle, Phone, Mail, Search, X, RefreshCw, AlertTriangle,
  Timer, PackageCheck, Clock, CircleDollarSign, Sparkles, Trophy, Loader2,
} from "lucide-react";
import laboratoryService, { type LaboratoryItem, type LensOrderItem } from "@/services/laboratory.service";

const emptyForm = { name: "", phone: "", whatsapp: "", email: "", contactName: "", terms: "", notes: "" };
type FormState = typeof emptyForm;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (v: string) => v.replace(/\D/g, "");
const ACTIVE = new Set(["ORDERED", "IN_PRODUCTION", "READY"]);
const DAY = 86_400_000;

function waLink(phone: string, name?: string | null) {
  const clean = digits(phone);
  const number = clean.startsWith("55") ? clean : `55${clean}`;
  const first = name?.split(" ")[0];
  return `https://wa.me/${number}?text=${encodeURIComponent(`Olá${first ? `, ${first}` : ""}! Aqui é da Óticas Império, tudo bem?`)}`;
}

interface LabSummary {
  active: number;
  late: number;
  ready: number;
  monthCost: number;
  total: number;
  avgLeadDays: number | null;
  leadSamples: number;
}

function isLate(o: LensOrderItem) {
  return ACTIVE.has(o.status) && o.status !== "READY" && !!o.expectedDelivery && new Date(o.expectedDelivery).getTime() < Date.now();
}

export default function Laboratories() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [labs, setLabs] = useState<LaboratoryItem[]>([]);
  const [orders, setOrders] = useState<LensOrderItem[]>([]);
  const [ordersAvailable, setOrdersAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LaboratoryItem | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [labsRes, ordersRes] = await Promise.all([
        laboratoryService.list({ limit: 200 }),
        laboratoryService.listLensOrders({ limit: 500 }).catch(() => null),
      ]);
      setLabs(labsRes.data || []);
      setOrders(ordersRes?.data || []);
      setOrdersAvailable(!!ordersRes);
    } catch (e) {
      setError(true);
      toast({ title: "Erro ao carregar laboratórios", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const summaries = useMemo(() => {
    const map = new Map<string, LabSummary>();
    const now = new Date();
    for (const o of orders) {
      const s = map.get(o.laboratoryId) || { active: 0, late: 0, ready: 0, monthCost: 0, total: 0, avgLeadDays: null, leadSamples: 0 };
      if (o.status !== "CANCELLED") s.total += 1;
      if (ACTIVE.has(o.status)) s.active += 1;
      if (o.status === "READY") s.ready += 1;
      if (isLate(o)) s.late += 1;
      const od = new Date(o.orderDate);
      if (o.status !== "CANCELLED" && od.getMonth() === now.getMonth() && od.getFullYear() === now.getFullYear()) s.monthCost += o.cost || 0;
      if (o.receivedDate) {
        const lead = (new Date(o.receivedDate).getTime() - od.getTime()) / DAY;
        if (lead >= 0) {
          s.avgLeadDays = ((s.avgLeadDays ?? 0) * s.leadSamples + lead) / (s.leadSamples + 1);
          s.leadSamples += 1;
        }
      }
      map.set(o.laboratoryId, s);
    }
    return map;
  }, [orders]);

  const totals = useMemo(() => {
    let active = 0, late = 0, monthCost = 0, ready = 0;
    summaries.forEach((s) => { active += s.active; late += s.late; monthCost += s.monthCost; ready += s.ready; });
    return { active, late, monthCost, ready };
  }, [summaries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return labs;
    return labs.filter((l) =>
      l.name.toLowerCase().includes(q) || l.contactName?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q),
    );
  }, [labs, search]);

  const insights = useMemo(() => {
    const out: { key: string; tone: "danger" | "warning" | "success" | "info" | "gold"; icon: typeof Sparkles; title: string; body: string }[] = [];
    if (!orders.length) return out;
    const nameOf = (id: string) => labs.find((l) => l.id === id)?.name ?? "Laboratório";
    const entries = [...summaries.entries()];

    const lateLabs = entries.filter(([, s]) => s.late > 0).sort((a, b) => b[1].late - a[1].late);
    if (lateLabs.length) {
      const [id, s] = lateLabs[0];
      const lab = labs.find((l) => l.id === id);
      out.push({
        key: "late",
        tone: "danger",
        icon: Clock,
        title: `${nameOf(id)} tem ${s.late} ${s.late === 1 ? "pedido atrasado" : "pedidos atrasados"}`,
        body: lab?.whatsapp || lab?.phone
          ? "Cobre um prazo atualizado pelo WhatsApp e avise os clientes afetados."
          : "Entre em contato para cobrar um prazo e avise os clientes afetados.",
      });
    }
    if (totals.ready > 0) {
      out.push({
        key: "ready",
        tone: "success",
        icon: PackageCheck,
        title: `${totals.ready} ${totals.ready === 1 ? "lente pronta" : "lentes prontas"} no laboratório`,
        body: "Programe a retirada para agilizar a entrega aos clientes.",
      });
    }
    const withLead = entries.filter(([, s]) => s.leadSamples >= 2 && s.avgLeadDays != null);
    if (withLead.length >= 2) {
      const fastest = [...withLead].sort((a, b) => (a[1].avgLeadDays ?? 0) - (b[1].avgLeadDays ?? 0))[0];
      const slowest = [...withLead].sort((a, b) => (b[1].avgLeadDays ?? 0) - (a[1].avgLeadDays ?? 0))[0];
      if (fastest[0] !== slowest[0]) {
        out.push({
          key: "lead",
          tone: "gold",
          icon: Trophy,
          title: `${nameOf(fastest[0])} é o mais rápido: ${Math.round(fastest[1].avgLeadDays!)} dias em média`,
          body: `${nameOf(slowest[0])} leva ${Math.round(slowest[1].avgLeadDays!)} dias. Considere priorizar o mais rápido em pedidos urgentes.`,
        });
      }
    } else if (withLead.length === 1) {
      const [id, s] = withLead[0];
      out.push({
        key: "lead1",
        tone: "info",
        icon: Timer,
        title: `${nameOf(id)} entrega em ${Math.round(s.avgLeadDays!)} dias em média`,
        body: `Baseado em ${s.leadSamples} pedidos recebidos. Use esse prazo ao prometer a entrega ao cliente.`,
      });
    }
    return out;
  }, [orders, summaries, labs, totals.ready]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (lab: LaboratoryItem) => {
    setEditId(lab.id);
    setErrors({});
    setForm({
      name: lab.name || "",
      phone: lab.phone ? maskPhone(lab.phone) : "",
      whatsapp: lab.whatsapp ? maskPhone(lab.whatsapp) : "",
      email: lab.email || "",
      contactName: lab.contactName || "",
      terms: lab.terms || "",
      notes: lab.notes || "",
    });
    setDialogOpen(true);
  };

  const handleChange = (field: keyof FormState, value: string) => {
    const v = field === "phone" || field === "whatsapp" ? maskPhone(value) : value;
    setForm((prev) => ({ ...prev, [field]: v }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSave = async () => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) errs.name = "Informe o nome (mín. 2 caracteres)";
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errs.email = "E-mail inválido";
    if (digits(form.phone) && digits(form.phone).length < 10) errs.phone = "Telefone incompleto";
    if (digits(form.whatsapp) && digits(form.whatsapp).length < 10) errs.whatsapp = "WhatsApp incompleto";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    // Backend zod: strings only (null is rejected). "" clears on edit; undefined skips on create.
    const text = (v: string) => {
      const t = v.trim();
      return t ? t : editId ? "" : undefined;
    };
    const payload = {
      name: form.name.trim(),
      phone: text(digits(form.phone)),
      whatsapp: text(digits(form.whatsapp)),
      email: text(form.email),
      contactName: text(form.contactName),
      terms: text(form.terms),
      notes: text(form.notes),
    };
    try {
      if (editId) {
        await laboratoryService.update(editId, payload);
        toast({ title: "Laboratório atualizado", description: payload.name });
      } else {
        await laboratoryService.create(payload);
        toast({ title: "Laboratório cadastrado", description: payload.name });
      }
      setDialogOpen(false);
      fetchAll();
    } catch (e) {
      toast({ title: "Erro ao salvar laboratório", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await laboratoryService.remove(deleteTarget.id);
      toast({ title: "Laboratório removido", description: deleteTarget.name });
      fetchAll();
    } catch (e) {
      toast({ title: "Erro ao remover", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const Contact = ({ lab }: { lab: LaboratoryItem }) => (
    <>
      {lab.whatsapp && (
        <Button size="icon" variant="ghost" asChild title="WhatsApp">
          <a href={waLink(lab.whatsapp, lab.contactName)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle className="text-success" /></a>
        </Button>
      )}
      {lab.phone && (
        <Button size="icon" variant="ghost" asChild title="Ligar">
          <a href={`tel:${digits(lab.phone)}`} aria-label="Ligar"><Phone className="text-primary" /></a>
        </Button>
      )}
      {lab.email && (
        <Button size="icon" variant="ghost" asChild title="E-mail">
          <a href={`mailto:${lab.email}`} aria-label="E-mail"><Mail className="text-primary" /></a>
        </Button>
      )}
    </>
  );

  const OrdersSummary = ({ id }: { id: string }) => {
    const s = summaries.get(id);
    if (!ordersAvailable) return <span className="text-muted-foreground">—</span>;
    if (!s || s.total === 0) return <span className="text-xs text-muted-foreground">Sem pedidos</span>;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {s.active > 0 && <StatusPill tone="info">{s.active} em andamento</StatusPill>}
        {s.late > 0 && <StatusPill tone="danger">{s.late} {s.late === 1 ? "atrasado" : "atrasados"}</StatusPill>}
        {s.ready > 0 && <StatusPill tone="success">{s.ready} {s.ready === 1 ? "pronto" : "prontos"}</StatusPill>}
        {s.active === 0 && <span className="text-xs text-muted-foreground num">{s.total} no total</span>}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Cadastros"
          title="Laboratórios"
          description="Parceiros de surfaçagem e montagem de lentes."
          icon={FlaskConical}
          actions={<Button onClick={openCreate}><Plus /> Novo laboratório</Button>}
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {loading ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[112px] rounded-2xl" />)
          ) : (
            <>
              <StatCard {...rise(1)} featured label="Pedidos em andamento" icon={FlaskConical} value={totals.active}
                hint={`${labs.length} ${labs.length === 1 ? "laboratório parceiro" : "laboratórios parceiros"}`} />
              <StatCard {...rise(2)} tone="danger" label="Atrasados" icon={Clock} value={totals.late} hint="Previsão de entrega vencida" />
              <StatCard {...rise(3)} tone="success" label="Prontos para retirar" icon={PackageCheck} value={totals.ready} />
              <StatCard {...rise(4)} tone="gold" label="Custo no mês" icon={CircleDollarSign} value={formatCurrency(totals.monthCost)} hint="Pedidos de lentes" />
            </>
          )}
        </div>

        <Panel {...rise(5)} bodyClassName="p-0"
          title="Laboratórios parceiros"
          icon={FlaskConical}
          actions={<Button variant="ghost" size="icon" onClick={fetchAll} aria-label="Atualizar"><RefreshCw className={cn(loading && "animate-spin")} /></Button>}
        >
          <div className="px-5 pb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, contato ou e-mail" className="pl-9 pr-9" />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar busca">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 border-t border-border p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/4" /></div>
                  <Skeleton className="h-6 w-28" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState icon={AlertTriangle} title="Não foi possível carregar" description="Verifique sua conexão e tente novamente."
              action={<Button variant="outline" onClick={fetchAll}><RefreshCw /> Tentar novamente</Button>} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title={labs.length === 0 ? "Nenhum laboratório cadastrado" : "Nenhum laboratório encontrado"}
              description={labs.length === 0 ? "Adicione seus laboratórios parceiros para registrar pedidos de lentes." : `Nada corresponde a "${search}".`}
              action={labs.length === 0 ? <Button onClick={openCreate}><Plus /> Cadastrar laboratório</Button> : <Button variant="outline" onClick={() => setSearch("")}>Limpar busca</Button>}
            />
          ) : (
            <>
              {/* mobile */}
              <div className="divide-y divide-border border-t border-border md:hidden">
                {filtered.map((lab) => {
                  const s = summaries.get(lab.id);
                  return (
                    <div key={lab.id} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <InitialsAvatar name={lab.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{lab.name}</p>
                          <p className="num truncate text-xs text-muted-foreground">
                            {[lab.contactName, lab.phone ? formatPhone(lab.phone) : null].filter(Boolean).join(" · ") || "Sem contato"}
                          </p>
                          {lab.terms && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{lab.terms}</p>}
                          <div className="mt-2"><OrdersSummary id={lab.id} /></div>
                          {s?.avgLeadDays != null && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              <Timer className="mr-1 inline h-3 w-3" />Entrega média: <span className="num">{Math.round(s.avgLeadDays)}</span> dias
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end gap-1">
                        <Contact lab={lab} />
                        <Button size="icon" variant="ghost" onClick={() => openEdit(lab)} aria-label="Editar"><Pencil /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(lab)} aria-label="Remover"><Trash2 className="text-danger" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Laboratório</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Pedidos</TableHead>
                      <TableHead className="text-right">Entrega média</TableHead>
                      <TableHead className="text-right">Custo no mês</TableHead>
                      <TableHead className="pr-5 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((lab) => {
                      const s = summaries.get(lab.id);
                      return (
                        <TableRow key={lab.id}>
                          <TableCell className="pl-5">
                            <div className="flex items-center gap-3">
                              <InitialsAvatar name={lab.name} size="sm" />
                              <div className="min-w-0">
                                <p className="font-medium">{lab.name}</p>
                                {lab.terms && <p className="max-w-[260px] truncate text-xs text-muted-foreground" title={lab.terms}>{lab.terms}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{lab.contactName || "—"}</p>
                            <p className="num text-xs text-muted-foreground">{lab.phone ? formatPhone(lab.phone) : lab.email || ""}</p>
                          </TableCell>
                          <TableCell><OrdersSummary id={lab.id} /></TableCell>
                          <TableCell className="num text-right text-sm">
                            {s?.avgLeadDays != null ? `${Math.round(s.avgLeadDays)} dias` : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="num text-right font-display font-semibold">
                            {s?.monthCost ? formatCurrency(s.monthCost) : <span className="font-sans font-normal text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <div className="flex justify-end gap-0.5">
                              <Contact lab={lab} />
                              <Button size="icon" variant="ghost" onClick={() => openEdit(lab)} aria-label="Editar"><Pencil /></Button>
                              <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(lab)} aria-label="Remover"><Trash2 className="text-danger" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Panel>

        {!loading && insights.length > 0 && (
          <Panel {...rise(6)} title="Assistente Império" description="Leituras automáticas dos pedidos de lentes" icon={Sparkles}>
            <div className="grid gap-3 md:grid-cols-2">
              {insights.map((i) => (
                <InsightCard key={i.key} icon={i.icon} tone={i.tone} title={i.title}
                  action={i.key === "ready" || i.key === "late" ? (
                    <Button size="sm" variant="link" className="h-auto p-0" onClick={() => navigate("/vendas")}>Ver vendas →</Button>
                  ) : undefined}
                >
                  {i.body}
                </InsightCard>
              ))}
            </div>
          </Panel>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editId ? "Editar laboratório" : "Novo laboratório"}</DialogTitle>
            <DialogDescription>Contatos e condições comerciais do parceiro.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lab-name">Nome *</Label>
              <Input id="lab-name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Nome do laboratório" />
              {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lab-phone">Telefone</Label>
                <Input id="lab-phone" inputMode="tel" className="num" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="(00) 0000-0000" />
                {errors.phone && <p className="text-xs text-danger">{errors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lab-wa">WhatsApp</Label>
                <Input id="lab-wa" inputMode="tel" className="num" value={form.whatsapp} onChange={(e) => handleChange("whatsapp", e.target.value)} placeholder="(00) 00000-0000" />
                {errors.whatsapp && <p className="text-xs text-danger">{errors.whatsapp}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lab-email">E-mail</Label>
                <Input id="lab-email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
                {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lab-contact">Nome do contato</Label>
                <Input id="lab-contact" value={form.contactName} onChange={(e) => handleChange("contactName", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lab-terms">Condições comerciais</Label>
              <Textarea id="lab-terms" rows={2} value={form.terms} onChange={(e) => handleChange("terms", e.target.value)} placeholder="Prazos, condições de pagamento…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lab-notes">Observações</Label>
              <Textarea id="lab-notes" rows={2} value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover laboratório?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" deixará de aparecer para novos pedidos. Os pedidos já registrados são mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
