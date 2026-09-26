import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Banknote, Check, Clock, CreditCard, FileText, FlaskConical, Glasses,
  Mail, MapPin, MessageCircle, MoreHorizontal, Package, PackageCheck, Phone, Plus, Printer, Receipt, RefreshCw,
  Sparkles, UserRound, XCircle,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EmptyState, InitialsAvatar, InsightCard, PageHeader, Panel, StatusPill, rise,
} from "@/components/imperio";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, formatPhone } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import salesService, {
  PAYMENT_METHOD_LABELS, SALE_FLOW, SALE_STATUS, formatOrderNumber, nextSaleStatus, whatsappLink,
  type LensOrderStatusCode, type PaymentMethodCode, type Sale, type SaleInstallment, type SaleLensOrder,
  type SalePrescription, type SaleStatus,
} from "@/services/sales.service";

/* ── Labels ─────────────────────────────────────────────── */
const LENS_STATUS: Record<LensOrderStatusCode, { label: string; tone: "info" | "warning" | "success" | "neutral" | "danger" | "gold" }> = {
  ORDERED: { label: "Pedido enviado", tone: "info" },
  IN_PRODUCTION: { label: "Em produção", tone: "warning" },
  READY: { label: "Pronta no laboratório", tone: "gold" },
  RECEIVED: { label: "Recebida na loja", tone: "success" },
  CANCELLED: { label: "Cancelada", tone: "danger" },
};
const LENS_FLOW: LensOrderStatusCode[] = ["ORDERED", "IN_PRODUCTION", "READY", "RECEIVED"];

const LENS_TYPE: Record<string, string> = {
  SINGLE_VISION: "Visão simples",
  BIFOCAL: "Bifocal",
  MULTIFOCAL: "Multifocal / progressiva",
};
const TREATMENT: Record<string, string> = {
  ANTIREFLECTIVE: "Antirreflexo",
  PHOTOCHROMIC: "Fotossensível",
  BLUE_LIGHT: "Filtro de luz azul",
  TRANSITIONS: "Transitions",
};

const STEP_ICON = [Glasses, FlaskConical, PackageCheck, Check];

const fmtDiopter = (v?: number | null) =>
  v === null || v === undefined ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}`;
const fmtNum = (v?: number | null, suffix = "") =>
  v === null || v === undefined ? "—" : `${String(v).replace(".", ",")}${suffix}`;

const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const isOverdue = (i: SaleInstallment) => i.status === "OVERDUE" || (i.status === "PENDING" && new Date(i.dueDate) < todayStart());

function prescriptionSnapshot(p?: SalePrescription | null) {
  if (!p) return undefined;
  const { id, date, doctor, doctorCrm, validity, odSpherical, odCylindrical, odAxis, odDnp, odHeight, odAddition,
    oeSphrical, oeCylindrical, oeAxis, oeDnp, oeHeight, oeAddition, lensType, treatments, notes } = p;
  return { id, date, doctor, doctorCrm, validity, odSpherical, odCylindrical, odAxis, odDnp, odHeight, odAddition,
    oeSphrical, oeCylindrical, oeAxis, oeDnp, oeHeight, oeAddition, lensType, treatments, notes };
}

/* Print: hide the app chrome (sidebar, top bar, bottom nav) and let the page flow across sheets. */
const PRINT_CSS = `
@media print {
  @page { margin: 12mm; }
  html, body { background: #fff !important; }
  aside, nav { display: none !important; }
  div.h-\\[100dvh\\] { height: auto !important; display: block !important; }
  div.h-\\[100dvh\\] > div { overflow: visible !important; display: block !important; }
  div.h-\\[100dvh\\] > div > :not(main) { display: none !important; }
  main { overflow: visible !important; }
  main > div { max-width: none !important; padding: 0 !important; }
  .animate-rise { animation: none !important; opacity: 1 !important; transform: none !important; }
  .surface, section { box-shadow: none !important; break-inside: avoid; }
}`;

export default function SalesDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [payTarget, setPayTarget] = useState<SaleInstallment | null>(null);
  const [payForm, setPayForm] = useState<{ amount: string; method: PaymentMethodCode; notes: string }>({ amount: "", method: "PIX", notes: "" });
  const [lensOpen, setLensOpen] = useState(false);
  const [lensForm, setLensForm] = useState({ laboratoryId: "", lensType: "", treatments: "", expectedDelivery: "", cost: "", notes: "" });

  const orderQuery = useQuery({
    queryKey: ["sales", "detail", id],
    queryFn: () => salesService.get(id),
    enabled: !!id,
    retry: (count, err) => (err as { status?: number })?.status !== 404 && count < 2,
  });
  const order = orderQuery.data?.data;

  const labsQuery = useQuery({
    queryKey: ["laboratories", "all"],
    queryFn: () => salesService.listLaboratories(),
    enabled: lensOpen,
  });

  // ?imprimir=1 (from the sales list) prints as soon as the OS is loaded
  useEffect(() => {
    if (order && params.get("imprimir")) {
      const t = setTimeout(() => {
        window.print();
        params.delete("imprimir");
        setParams(params, { replace: true });
      }, 400);
      return () => clearTimeout(t);
    }
  }, [order, params, setParams]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sales"] });

  /* ── Mutations ── */
  const statusMutation = useMutation({
    mutationFn: (status: SaleStatus) => salesService.updateStatus(id, status),
    onSuccess: (_, status) => { toast.success(`OS marcada como “${SALE_STATUS[status].label}”.`); refresh(); },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar o status."),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => salesService.cancel(id, reason),
    onSuccess: () => { toast.success("Venda cancelada e estoque restaurado."); setCancelOpen(false); setCancelReason(""); refresh(); },
    onError: (e: Error) => toast.error(e.message || "Não foi possível cancelar a venda."),
  });

  const payMutation = useMutation({
    mutationFn: (v: { id: string; paidAmount: number; paymentMethod: PaymentMethodCode; notes?: string }) =>
      salesService.payInstallment(v.id, { paidAmount: v.paidAmount, paymentMethod: v.paymentMethod, notes: v.notes }),
    onSuccess: () => { toast.success("Parcela baixada com sucesso."); setPayTarget(null); refresh(); },
    onError: (e: Error) => toast.error(e.message || "Não foi possível registrar o pagamento."),
  });

  const lensMutation = useMutation({
    mutationFn: () => salesService.createLensOrder({
      salesOrderId: id,
      laboratoryId: lensForm.laboratoryId,
      prescriptionData: prescriptionSnapshot(order?.prescription),
      lensType: lensForm.lensType.trim() || undefined,
      treatments: lensForm.treatments.trim() || undefined,
      expectedDelivery: lensForm.expectedDelivery ? `${lensForm.expectedDelivery}T12:00:00` : undefined,
      cost: lensForm.cost ? parseFloat(lensForm.cost.replace(",", ".")) || 0 : undefined,
      notes: lensForm.notes.trim() || undefined,
    }),
    onSuccess: () => { toast.success("Pedido enviado ao laboratório registrado."); setLensOpen(false); refresh(); },
    onError: (e: Error) => toast.error(e.message || "Não foi possível registrar o pedido de lente."),
  });

  const lensStatusMutation = useMutation({
    mutationFn: (v: { id: string; status: LensOrderStatusCode }) => salesService.updateLensOrderStatus(v.id, { status: v.status }),
    onSuccess: (_, v) => { toast.success(`Pedido de lente: ${LENS_STATUS[v.status].label}.`); refresh(); },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar o pedido de lente."),
  });

  /* ── Derived ── */
  const phone = order?.customer?.whatsapp || order?.customer?.phone;
  const firstName = order?.customer?.name?.split(" ")[0] ?? "";
  const waMessage = order
    ? order.status === "READY_FOR_PICKUP"
      ? `Olá, ${firstName}! Aqui é da Óticas Império. Sua ${formatOrderNumber(order.orderNumber)} está pronta! Pode vir retirar seus óculos quando quiser. Estamos te esperando.`
      : `Olá, ${firstName}! Aqui é da Óticas Império. Sua ${formatOrderNumber(order.orderNumber)} está com status: ${SALE_STATUS[order.status].label.toLowerCase()}. Qualquer dúvida, estamos à disposição.`
    : "";
  const waLink = whatsappLink(phone, waMessage);

  const installments = useMemo(
    () => (order?.payments ?? []).flatMap((p) => (p.installments ?? []).map((i) => ({ ...i, method: p.method }))),
    [order],
  );
  const overdue = installments.filter(isOverdue);
  const openInstallments = installments.filter((i) => i.status !== "PAID");
  const lensOrders: SaleLensOrder[] = order?.lensOrders ?? [];
  const activeLens = lensOrders.filter((l) => l.status !== "CANCELLED");
  const lateLens = activeLens.filter((l) => l.status !== "RECEIVED" && l.expectedDelivery && new Date(l.expectedDelivery) < todayStart());
  const allLensReceived = activeLens.length > 0 && activeLens.every((l) => l.status === "RECEIVED");
  const isOpen = order ? order.status !== "DELIVERED" && order.status !== "CANCELLED" : false;
  const next = order ? nextSaleStatus(order.status) : null;
  const rxExpired = order?.prescription ? new Date(order.prescription.validity) < new Date() : false;
  const totalCost = (order?.items ?? []).reduce((s, i) => s + i.costPrice * i.quantity, 0);

  const insights = useMemo(() => {
    if (!order) return [];
    const list: { key: string; tone: "success" | "warning" | "info" | "danger" | "gold"; icon: typeof Sparkles; title: string; body: string; action?: { label: string; onClick: () => void } }[] = [];
    if (order.status === "READY_FOR_PICKUP") {
      const days = differenceInCalendarDays(new Date(), new Date(order.updatedAt));
      list.push({
        key: "ready", tone: days >= 5 ? "warning" : "success", icon: PackageCheck,
        title: days >= 1 ? `Pronta há ${days} dia${days > 1 ? "s" : ""}` : "OS pronta para retirada",
        body: "Envie a mensagem de “sua OS está pronta” para o cliente.",
        action: waLink ? { label: "Enviar no WhatsApp", onClick: () => window.open(waLink, "_blank", "noopener") } : undefined,
      });
    }
    if (isOpen && allLensReceived && (order.status === "AWAITING_LENS" || order.status === "IN_PRODUCTION")) {
      list.push({
        key: "received", tone: "success", icon: Check, title: "Todas as lentes já chegaram",
        body: "Se a montagem estiver concluída, marque a OS como pronta para retirada.",
        action: { label: "Marcar como pronta", onClick: () => statusMutation.mutate("READY_FOR_PICKUP") },
      });
    }
    if (lateLens.length) {
      const l = lateLens[0];
      const labLink = whatsappLink(l.laboratory?.whatsapp || l.laboratory?.phone, `Olá! Gostaria de saber a previsão da lente da ${formatOrderNumber(order.orderNumber)} (cliente ${order.customer?.name}), prevista para ${formatDate(l.expectedDelivery!)}.`);
      list.push({
        key: "late", tone: "danger", icon: Clock, title: `Lente atrasada — ${l.laboratory?.name ?? "laboratório"}`,
        body: `Prevista para ${formatDate(l.expectedDelivery!)}. Cobre o laboratório e avise o cliente sobre o novo prazo.`,
        action: labLink ? { label: "Cobrar laboratório", onClick: () => window.open(labLink, "_blank", "noopener") } : undefined,
      });
    }
    if (order.status === "AWAITING_LENS" && order.prescription && activeLens.length === 0) {
      list.push({
        key: "nolens", tone: "info", icon: FlaskConical, title: "Nenhum pedido ao laboratório",
        body: "A OS tem receita vinculada, mas as lentes ainda não foram pedidas.",
        action: { label: "Registrar pedido", onClick: () => openLensDialog() },
      });
    }
    if (overdue.length) {
      list.push({
        key: "overdue", tone: "danger", icon: Banknote,
        title: `${overdue.length} parcela${overdue.length > 1 ? "s" : ""} em atraso`,
        body: `${formatCurrency(overdue.reduce((s, i) => s + i.amount, 0))} vencido. Aproveite o contato para negociar.`,
      });
    }
    if (rxExpired && isOpen) {
      list.push({ key: "rx", tone: "warning", icon: FileText, title: "Receita vinculada está vencida", body: `Validade encerrada em ${formatDate(order.prescription!.validity)}.` });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, waLink, allLensReceived, lateLens.length, overdue.length, rxExpired, isOpen, activeLens.length]);

  function openLensDialog() {
    const rx = order?.prescription;
    setLensForm({
      laboratoryId: "",
      lensType: rx?.lensType ? LENS_TYPE[rx.lensType] ?? rx.lensType : "",
      treatments: (rx?.treatments ?? []).map((t) => TREATMENT[t] ?? t).join(", "),
      expectedDelivery: "",
      cost: "",
      notes: "",
    });
    setLensOpen(true);
  }

  const openPay = (i: SaleInstallment) => {
    setPayForm({ amount: String(i.amount).replace(".", ","), method: "PIX", notes: "" });
    setPayTarget(i);
  };

  /* ── Loading / error ── */
  if (orderQuery.isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-9 w-64" /></div>
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>
            <div className="space-y-6"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    const notFound = (orderQuery.error as { status?: number })?.status === 404;
    return (
      <MainLayout>
        <Panel>
          <EmptyState
            icon={notFound ? Receipt : AlertTriangle}
            title={notFound ? "OS não encontrada" : "Não foi possível carregar a OS"}
            description={notFound ? "Ela pode ter sido removida ou o link está incorreto." : (orderQuery.error as Error)?.message}
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/vendas")}><ArrowLeft className="h-4 w-4" /> Vendas</Button>
                {!notFound && <Button onClick={() => orderQuery.refetch()}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button>}
              </div>
            }
          />
        </Panel>
      </MainLayout>
    );
  }

  const st = SALE_STATUS[order.status];
  const stepIndex = SALE_FLOW.indexOf(order.status);
  const rx = order.prescription;

  return (
    <MainLayout>
      <style>{PRINT_CSS}</style>
      <div className="space-y-6">
        {/* Print-only letterhead */}
        <div className="hidden items-end justify-between border-b border-border pb-3 print:flex">
          <div>
            <p className="font-display text-xl font-semibold">Óticas Império</p>
            <p className="text-xs text-muted-foreground">Ordem de serviço</p>
          </div>
          <p className="num text-xs text-muted-foreground">Impresso em {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
        </div>

        <PageHeader
          eyebrow="Ordem de serviço"
          icon={Receipt}
          title={
            <span className="flex flex-wrap items-center gap-3">
              <span className="num">{formatOrderNumber(order.orderNumber)}</span>
              <StatusPill tone={st.tone}>{st.label}</StatusPill>
            </span>
          }
          description={
            <span className="num">
              {format(new Date(order.date), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
              {order.seller?.name && ` · Vendedor: ${order.seller.name}`}
            </span>
          }
          actions={
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="ghost" size="sm" onClick={() => navigate("/vendas")}><ArrowLeft className="h-4 w-4" /> Vendas</Button>
              {waLink && (
                <Button variant="outline" size="sm" asChild>
                  <a href={waLink} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 text-success" /> {order.status === "READY_FOR_PICKUP" ? "Avisar: OS pronta" : "WhatsApp"}</a>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir</Button>
              {isOpen && next && (
                <Button size="sm" variant="gold" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate(next)}>
                  {SALE_STATUS[next].label} <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {isOpen && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Mais ações"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Alterar status</DropdownMenuLabel>
                    {SALE_FLOW.filter((s) => s !== order.status).map((s) => (
                      <DropdownMenuItem key={s} onClick={() => statusMutation.mutate(s)}>
                        <RefreshCw className="mr-2 h-4 w-4" /> {SALE_STATUS[s].label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-danger focus:text-danger" onClick={() => setCancelOpen(true)}>
                      <XCircle className="mr-2 h-4 w-4" /> Cancelar venda
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          }
        />

        {/* Status stepper */}
        {order.status === "CANCELLED" ? (
          <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4" {...rise(1)}>
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div>
              <p className="font-semibold text-danger">Venda cancelada</p>
              <p className="text-sm text-foreground/80">{order.cancelReason || "Motivo não informado."}</p>
            </div>
          </div>
        ) : (
          <Panel bodyClassName="p-4 sm:p-5" {...rise(1)}>
            <ol className="grid grid-cols-4 gap-1 sm:gap-2">
              {SALE_FLOW.map((s, i) => {
                const Icon = STEP_ICON[i];
                const done = i < stepIndex || order.status === "DELIVERED";
                const current = i === stepIndex && order.status !== "DELIVERED";
                return (
                  <li key={s} className="relative flex flex-col items-center text-center">
                    {i > 0 && (
                      <span className={cn("absolute right-1/2 top-[18px] h-0.5 w-full -translate-y-1/2", i <= stepIndex ? "bg-gold" : "bg-border")} aria-hidden />
                    )}
                    <button
                      type="button"
                      disabled={!isOpen || s === order.status || statusMutation.isPending}
                      onClick={() => statusMutation.mutate(s)}
                      title={isOpen && s !== order.status ? `Marcar como ${SALE_STATUS[s].label.toLowerCase()}` : undefined}
                      className={cn(
                        "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                        done && "border-gold bg-gold text-gold-foreground",
                        current && "border-primary bg-primary text-gold ring-4 ring-primary/15",
                        !done && !current && "border-border bg-card text-muted-foreground",
                        isOpen && s !== order.status && "hover:scale-105 hover:border-gold",
                      )}
                    >
                      {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </button>
                    <span className={cn("mt-2 text-[11px] leading-tight sm:text-xs", current ? "font-semibold text-foreground" : "text-muted-foreground")}>
                      {SALE_STATUS[s].label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Panel>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="min-w-0 space-y-6 lg:col-span-2">
            {/* Items */}
            <Panel title="Itens da OS" icon={Package} bodyClassName="p-0 pt-3" {...rise(2)}>
              {/* Mobile */}
              <ul className="divide-y divide-border md:hidden">
                {(order.items ?? []).map((it) => (
                  <li key={it.id} className="px-5 py-3">
                    <div className="flex justify-between gap-3">
                      <p className="min-w-0 font-medium">{it.product?.name || it.description || "Item"}</p>
                      <p className="num shrink-0 font-display font-semibold">{formatCurrency(it.subtotal)}</p>
                    </div>
                    <p className="num text-xs text-muted-foreground">
                      {it.quantity} × {formatCurrency(it.unitPrice)}
                      {it.discountAmount > 0 && ` · desconto ${formatCurrency(it.discountAmount)}`}
                      {!it.productId && " · serviço"}
                    </p>
                  </li>
                ))}
              </ul>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="pl-5">Produto / serviço</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Unitário</TableHead>
                      <TableHead className="text-right">Desconto</TableHead>
                      {isAdmin && <TableHead className="text-right print:hidden">Custo</TableHead>}
                      <TableHead className="pr-5 text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(order.items ?? []).map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="pl-5">
                          <p className="font-medium">{it.product?.name || it.description || "Item"}</p>
                          <p className="text-xs text-muted-foreground">
                            {it.product ? [it.product.brand, it.product.model, it.product.color].filter(Boolean).join(" · ") : "Serviço"}
                          </p>
                        </TableCell>
                        <TableCell className="num text-right">{it.quantity}</TableCell>
                        <TableCell className="num text-right">{formatCurrency(it.unitPrice)}</TableCell>
                        <TableCell className="num text-right text-danger">{it.discountAmount > 0 ? `− ${formatCurrency(it.discountAmount)}` : <span className="text-muted-foreground">—</span>}</TableCell>
                        {isAdmin && <TableCell className="num text-right text-muted-foreground print:hidden">{formatCurrency(it.costPrice * it.quantity)}</TableCell>}
                        <TableCell className="num pr-5 text-right font-semibold">{formatCurrency(it.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-1.5 border-t border-border px-5 py-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="num">{formatCurrency(order.subtotal)}</span></div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desconto geral{order.discountPercent ? ` (${order.discountPercent}%)` : ""}</span>
                    <span className="num text-danger">− {formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-end justify-between pt-1">
                  <span className="font-semibold">Total</span>
                  <span className="num font-display text-2xl font-semibold">{formatCurrency(order.total)}</span>
                </div>
                {isAdmin && (
                  <div className="flex justify-between text-xs text-success print:hidden">
                    <span>Lucro estimado{order.total > 0 ? ` · margem ${((order.estimatedProfit / order.total) * 100).toFixed(0)}%` : ""}</span>
                    <span className="num font-semibold">{formatCurrency(order.estimatedProfit)} <span className="text-muted-foreground">(custo {formatCurrency(totalCost)})</span></span>
                  </div>
                )}
              </div>
            </Panel>

            {/* Payments */}
            <Panel title="Pagamentos" icon={CreditCard} description={openInstallments.length ? `${openInstallments.length} parcela(s) em aberto` : undefined} {...rise(3)}>
              {(order.payments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
              ) : (
                <div className="space-y-3">
                  {(order.payments ?? []).map((p) => (
                    <div key={p.id} className="rounded-xl border border-border">
                      <div className="flex items-start justify-between gap-3 p-3.5">
                        <div className="min-w-0">
                          <p className="font-medium">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</p>
                          <p className="text-xs text-muted-foreground">
                            {[
                              p.cardBrand,
                              p.method === "CREDIT_CARD" && p.cardInstallments ? (p.cardInstallments > 1 ? `${p.cardInstallments}x de ${formatCurrency(p.amount / p.cardInstallments)}` : "à vista") : null,
                              p.method === "STORE_CREDIT" && p.installments?.length ? `${p.installments.length} parcela(s)` : null,
                              p.interestRate ? `juros ${fmtNum(p.interestRate)}% a.m.` : null,
                              p.justification,
                            ].filter(Boolean).join(" · ") || format(new Date(p.createdAt), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <p className="num shrink-0 font-display text-lg font-semibold">{formatCurrency(p.amount)}</p>
                      </div>
                      {(p.installments ?? []).length > 0 && (
                        <ul className="divide-y divide-border border-t border-border">
                          {[...(p.installments ?? [])].sort((a, b) => a.number - b.number).map((i) => {
                            const late = isOverdue(i);
                            return (
                              <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5 text-sm">
                                <span className="num w-8 text-xs font-semibold text-muted-foreground">{i.number}ª</span>
                                <span className="num flex-1">{formatDate(i.dueDate)}</span>
                                <span className="num font-medium">{formatCurrency(i.paidAmount ?? i.amount)}</span>
                                {i.status === "PAID" ? (
                                  <StatusPill tone="success">Paga {i.paidDate ? formatDate(i.paidDate) : ""}</StatusPill>
                                ) : i.status === "RENEGOTIATED" ? (
                                  <StatusPill tone="neutral">Renegociada</StatusPill>
                                ) : (
                                  <>
                                    <StatusPill tone={late ? "danger" : "warning"}>{late ? "Atrasada" : "Pendente"}</StatusPill>
                                    {order.status !== "CANCELLED" && (
                                      <Button size="sm" variant="outline" className="h-8 print:hidden" onClick={() => openPay(i)}>Receber</Button>
                                    )}
                                  </>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Lens orders */}
            <Panel
              title="Pedidos ao laboratório"
              icon={FlaskConical}
              description="Acompanhe as lentes encomendadas para esta OS."
              actions={isOpen && (
                <Button size="sm" variant="outline" className="print:hidden" onClick={openLensDialog}><Plus className="h-4 w-4" /> Novo pedido</Button>
              )}
              {...rise(4)}
            >
              {lensOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum pedido de lente registrado{isOpen && rx ? " — registre o pedido para acompanhar o prazo." : "."}
                </p>
              ) : (
                <ul className="space-y-3">
                  {lensOrders.map((l) => {
                    const lst = LENS_STATUS[l.status];
                    const late = l.status !== "RECEIVED" && l.status !== "CANCELLED" && l.expectedDelivery && new Date(l.expectedDelivery) < todayStart();
                    const nextLens = LENS_FLOW[LENS_FLOW.indexOf(l.status) + 1];
                    return (
                      <li key={l.id} className={cn("rounded-xl border p-3.5", late ? "border-danger/40 bg-danger-soft/30" : "border-border")}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">{l.laboratory?.name ?? "Laboratório"}</p>
                            <p className="num text-xs text-muted-foreground">
                              Pedido em {formatDate(l.orderDate)}
                              {l.expectedDelivery && ` · previsão ${formatDate(l.expectedDelivery)}`}
                              {l.receivedDate && ` · recebida ${formatDate(l.receivedDate)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {late && <StatusPill tone="danger">Atrasada</StatusPill>}
                            <StatusPill tone={lst.tone}>{lst.label}</StatusPill>
                          </div>
                        </div>
                        {(l.lensType || l.treatments || l.notes || (isAdmin && l.cost > 0)) && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {[l.lensType, l.treatments, l.notes, isAdmin && l.cost > 0 ? `custo ${formatCurrency(l.cost)}` : null].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {l.status !== "RECEIVED" && l.status !== "CANCELLED" && (
                          <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                            {nextLens && (
                              <Button size="sm" variant={nextLens === "RECEIVED" ? "default" : "outline"} className="h-8"
                                disabled={lensStatusMutation.isPending}
                                onClick={() => lensStatusMutation.mutate({ id: l.id, status: nextLens })}>
                                {nextLens === "RECEIVED" ? "Marcar como recebida" : LENS_STATUS[nextLens].label} <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-danger"
                              disabled={lensStatusMutation.isPending}
                              onClick={() => lensStatusMutation.mutate({ id: l.id, status: "CANCELLED" })}>
                              Cancelar pedido
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            {order.notes && (
              <Panel title="Observações" icon={FileText} {...rise(5)}>
                <p className="whitespace-pre-line text-sm text-foreground/85">{order.notes}</p>
              </Panel>
            )}
          </div>

          {/* Side column */}
          <div className="space-y-6">
            {/* Customer */}
            <Panel title="Cliente" icon={UserRound} {...rise(2)}
              actions={order.customer && (
                <Button variant="ghost" size="sm" asChild className="print:hidden">
                  <Link to={`/clientes/${order.customer.id}`}>Ver ficha</Link>
                </Button>
              )}
            >
              <div className="flex items-center gap-3">
                <InitialsAvatar name={order.customer?.name} size="lg" />
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold leading-tight">{order.customer?.name}</p>
                  {order.customer?.cpf && <p className="num text-xs text-muted-foreground">CPF {order.customer.cpf}</p>}
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {order.customer?.phone && (
                  <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="num">{formatPhone(order.customer.phone)}</span></li>
                )}
                {order.customer?.whatsapp && order.customer.whatsapp !== order.customer.phone && (
                  <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-muted-foreground" /><span className="num">{formatPhone(order.customer.whatsapp)}</span></li>
                )}
                {order.customer?.email && (
                  <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="truncate">{order.customer.email}</span></li>
                )}
                {order.customer?.city && (
                  <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{order.customer.city}{order.customer.state ? ` / ${order.customer.state}` : ""}</li>
                )}
              </ul>
              {waLink && (
                <Button variant="outline" className="mt-4 w-full print:hidden" asChild>
                  <a href={waLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 text-success" />
                    {order.status === "READY_FOR_PICKUP" ? "Enviar “sua OS está pronta”" : "Conversar no WhatsApp"}
                  </a>
                </Button>
              )}
            </Panel>

            {/* Prescription */}
            <Panel title="Receita" icon={Glasses} {...rise(3)}
              description={rx ? `${rx.doctor ? `Dr(a). ${rx.doctor}` : "Médico não informado"}${rx.doctorCrm ? ` · CRM ${rx.doctorCrm}` : ""}` : undefined}
            >
              {!rx ? (
                <p className="text-sm text-muted-foreground">Nenhuma receita vinculada a esta OS.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="num w-full text-center text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="py-1.5 text-left font-medium" />
                          <th className="py-1.5 font-medium">Esf.</th>
                          <th className="py-1.5 font-medium">Cil.</th>
                          <th className="py-1.5 font-medium">Eixo</th>
                          <th className="py-1.5 font-medium">DNP</th>
                          <th className="py-1.5 font-medium">Alt.</th>
                          <th className="py-1.5 font-medium">Ad.</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        <tr className="border-t border-border">
                          <td className="py-2 text-left font-semibold text-primary">OD</td>
                          <td>{fmtDiopter(rx.odSpherical)}</td><td>{fmtDiopter(rx.odCylindrical)}</td>
                          <td>{fmtNum(rx.odAxis, "°")}</td><td>{fmtNum(rx.odDnp)}</td><td>{fmtNum(rx.odHeight)}</td><td>{fmtDiopter(rx.odAddition)}</td>
                        </tr>
                        <tr className="border-t border-border">
                          <td className="py-2 text-left font-semibold text-primary">OE</td>
                          <td>{fmtDiopter(rx.oeSphrical)}</td><td>{fmtDiopter(rx.oeCylindrical)}</td>
                          <td>{fmtNum(rx.oeAxis, "°")}</td><td>{fmtNum(rx.oeDnp)}</td><td>{fmtNum(rx.oeHeight)}</td><td>{fmtDiopter(rx.oeAddition)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {rx.lensType && <StatusPill tone="navy">{LENS_TYPE[rx.lensType] ?? rx.lensType}</StatusPill>}
                    {(rx.treatments ?? []).map((t) => <StatusPill key={t} tone="gold">{TREATMENT[t] ?? t}</StatusPill>)}
                  </div>
                  <p className={cn("num mt-3 text-xs", rxExpired ? "text-danger" : "text-muted-foreground")}>
                    Receita de {formatDate(rx.date)} · {rxExpired ? "vencida em" : "válida até"} {formatDate(rx.validity)}
                  </p>
                  {rx.notes && <p className="mt-1 text-xs text-muted-foreground">{rx.notes}</p>}
                </>
              )}
            </Panel>

            {/* Assistant */}
            {insights.length > 0 && (
              <Panel title="Assistente Império" icon={Sparkles} className="print:hidden" {...rise(4)}>
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
              </Panel>
            )}

            {/* Signature (print) */}
            <div className="hidden pt-10 print:block">
              <div className="border-t border-foreground/60 pt-1 text-center text-xs">Assinatura do cliente</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Cancelar {formatOrderNumber(order.orderNumber)}</DialogTitle>
            <DialogDescription>O estoque dos produtos será restaurado automaticamente. Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo do cancelamento *</Label>
            <Textarea id="cancel-reason" rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ex.: cliente desistiu da compra" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
            <Button variant="destructive" disabled={!cancelReason.trim() || cancelMutation.isPending} onClick={() => cancelMutation.mutate(cancelReason.trim())}>
              {cancelMutation.isPending ? "Cancelando…" : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay installment dialog */}
      <Dialog open={!!payTarget} onOpenChange={(o) => !o && setPayTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Receber {payTarget?.number}ª parcela</DialogTitle>
            <DialogDescription>
              Vencimento {payTarget ? formatDate(payTarget.dueDate) : ""} · valor {formatCurrency(payTarget?.amount ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Valor recebido (R$)</Label>
              <Input id="pay-amount" inputMode="decimal" className="num" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Forma</Label>
              <Select value={payForm.method} onValueChange={(v) => setPayForm((f) => ({ ...f, method: v as PaymentMethodCode }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["PIX", "CASH", "DEBIT_CARD", "CREDIT_CARD"] as PaymentMethodCode[]).map((m) => <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pay-notes">Observação</Label>
              <Input id="pay-notes" value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPayTarget(null)}>Voltar</Button>
            <Button
              disabled={payMutation.isPending || !(parseFloat(payForm.amount.replace(/\./g, "").replace(",", ".")) > 0)}
              onClick={() => payTarget && payMutation.mutate({
                id: payTarget.id,
                paidAmount: parseFloat(payForm.amount.replace(/\./g, "").replace(",", ".")) || 0,
                paymentMethod: payForm.method,
                notes: payForm.notes.trim() || undefined,
              })}
            >
              {payMutation.isPending ? "Registrando…" : "Confirmar recebimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New lens order dialog */}
      <Dialog open={lensOpen} onOpenChange={setLensOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Novo pedido ao laboratório</DialogTitle>
            <DialogDescription>
              {rx ? "Os dados da receita vinculada seguem junto com o pedido." : "Esta OS não tem receita vinculada."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Laboratório *</Label>
              <Select value={lensForm.laboratoryId} onValueChange={(v) => setLensForm((f) => ({ ...f, laboratoryId: v }))}>
                <SelectTrigger><SelectValue placeholder={labsQuery.isLoading ? "Carregando…" : "Selecione"} /></SelectTrigger>
                <SelectContent>
                  {(labsQuery.data?.data ?? []).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {labsQuery.isSuccess && !(labsQuery.data?.data ?? []).length && (
                <p className="text-xs text-muted-foreground">Nenhum laboratório cadastrado. <Link to="/laboratorios" className="font-semibold text-primary hover:underline">Cadastrar</Link></p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lens-type">Tipo de lente</Label>
              <Input id="lens-type" value={lensForm.lensType} onChange={(e) => setLensForm((f) => ({ ...f, lensType: e.target.value }))} placeholder="Ex.: Multifocal" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lens-treat">Tratamentos</Label>
              <Input id="lens-treat" value={lensForm.treatments} onChange={(e) => setLensForm((f) => ({ ...f, treatments: e.target.value }))} placeholder="Ex.: Antirreflexo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lens-date">Previsão de entrega</Label>
              <Input id="lens-date" type="date" value={lensForm.expectedDelivery} onChange={(e) => setLensForm((f) => ({ ...f, expectedDelivery: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lens-cost">Custo (R$)</Label>
              <Input id="lens-cost" inputMode="decimal" className="num" value={lensForm.cost} onChange={(e) => setLensForm((f) => ({ ...f, cost: e.target.value }))} placeholder="0,00" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="lens-notes">Observações</Label>
              <Textarea id="lens-notes" rows={2} value={lensForm.notes} onChange={(e) => setLensForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLensOpen(false)}>Voltar</Button>
            <Button disabled={!lensForm.laboratoryId || lensMutation.isPending} onClick={() => lensMutation.mutate()}>
              {lensMutation.isPending ? "Registrando…" : "Registrar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
