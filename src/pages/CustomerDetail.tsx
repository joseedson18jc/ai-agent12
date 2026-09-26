import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle, ArrowLeft, Cake, CalendarClock, CreditCard, FileText, Loader2, Mail, MapPin,
  MessageCircle, NotebookPen, Package, Pencil, Phone, Plus, Receipt, RefreshCw, ShoppingBag, Sparkles,
  Trash2, UserRound, Wallet,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState, InitialsAvatar, InsightCard, PageHeader, Panel, StatCard, StatusPill, rise,
} from "@/components/imperio";
import {
  LensSummary, PrescriptionFormDialog, PrescriptionGrid, ValidityPill, formatDay,
} from "@/components/prescriptions/PrescriptionParts";
import customerService, { whatsAppLink } from "@/services/customer.service";
import prescriptionService, { getValidity } from "@/services/prescription.service";
import { formatCPF, formatCurrency, formatDate, formatPhone } from "@/utils/formatters";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  CustomerStatus, InstallmentStatus, PaymentMethod, SalesOrderStatus, UserRole,
  type Customer, type Prescription, type SalesOrder,
} from "@/types";

/* Formas retornadas pelo backend (GET /customers/:id) */
interface DetailInstallment {
  id: string;
  number: number;
  amount: number;
  dueDate: string;
  paidDate?: string | null;
  paidAmount?: number | null;
  status: InstallmentStatus;
}
interface DetailPayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  cardInstallments?: number | null;
  installments?: DetailInstallment[];
}
type DetailOrder = Omit<SalesOrder, "payments"> & { payments?: DetailPayment[] };
type DetailCustomer = Omit<Customer, "salesOrders" | "prescriptions"> & {
  salesOrders?: DetailOrder[];
  prescriptions?: Prescription[];
};

const ORDER_STATUS: Record<SalesOrderStatus, { label: string; tone: "info" | "warning" | "gold" | "success" | "danger" }> = {
  [SalesOrderStatus.AWAITING_LENS]: { label: "Aguardando lente", tone: "warning" },
  [SalesOrderStatus.IN_PRODUCTION]: { label: "Em produção", tone: "info" },
  [SalesOrderStatus.READY_FOR_PICKUP]: { label: "Pronta p/ retirada", tone: "gold" },
  [SalesOrderStatus.DELIVERED]: { label: "Entregue", tone: "success" },
  [SalesOrderStatus.CANCELLED]: { label: "Cancelada", tone: "danger" },
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Dinheiro",
  [PaymentMethod.PIX]: "PIX",
  [PaymentMethod.CREDIT_CARD]: "Cartão de crédito",
  [PaymentMethod.DEBIT_CARD]: "Cartão de débito",
  [PaymentMethod.STORE_CREDIT]: "Crediário",
  [PaymentMethod.INSURANCE]: "Convênio",
  [PaymentMethod.EXCHANGE]: "Troca / cortesia",
};

const DAY = 86400000;

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
}

function ageFrom(iso?: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age >= 0 && age < 130 ? age : null;
}

function daysToBirthday(iso?: string | null): number | null {
  if (!iso) return null;
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!m || !d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / DAY);
}

function isOverdue(i: DetailInstallment) {
  if (i.status === InstallmentStatus.OVERDUE) return true;
  if (i.status !== InstallmentStatus.PENDING) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(i.dueDate).getTime() < today.getTime();
}

function relative(days: number) {
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = user?.role !== UserRole.VIEWER;

  const [customer, setCustomer] = useState<DetailCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("compras");

  const [rxFormOpen, setRxFormOpen] = useState(false);
  const [rxEditing, setRxEditing] = useState<Prescription | null>(null);
  const [rxDeleting, setRxDeleting] = useState<Prescription | null>(null);
  const [rxDeleteBusy, setRxDeleteBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await customerService.getById(id);
      setCustomer(res.data as unknown as DetailCustomer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar o cliente.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Derivados ─────────────────────────────────────── */
  const orders = useMemo(() => customer?.salesOrders ?? [], [customer]);
  const validOrders = useMemo(() => orders.filter((o) => o.status !== SalesOrderStatus.CANCELLED), [orders]);
  const prescriptions = useMemo(() => customer?.prescriptions ?? [], [customer]);
  const totalSpent = validOrders.reduce((s, o) => s + (o.total || 0), 0);
  const avgTicket = validOrders.length ? totalSpent / validOrders.length : 0;
  const lastOrder = validOrders[0];

  const installments = useMemo(() => {
    const list: (DetailInstallment & { orderNumber: number; orderId: string; method: PaymentMethod; count: number })[] = [];
    orders.forEach((o) => {
      if (o.status === SalesOrderStatus.CANCELLED) return;
      o.payments?.forEach((p) =>
        p.installments?.forEach((i) =>
          list.push({ ...i, orderNumber: o.orderNumber, orderId: o.id, method: p.method, count: p.installments!.length }),
        ),
      );
    });
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [orders]);

  const fin = useMemo(() => {
    const open = installments.filter((i) => i.status === InstallmentStatus.PENDING || i.status === InstallmentStatus.OVERDUE);
    const overdue = installments.filter(isOverdue);
    const paid = installments.filter((i) => i.status === InstallmentStatus.PAID);
    const sum = (l: DetailInstallment[], paidField = false) =>
      l.reduce((s, i) => s + (paidField ? i.paidAmount ?? i.amount : i.amount), 0);
    return {
      openTotal: sum(open),
      overdueTotal: sum(overdue),
      overdueCount: overdue.length,
      paidTotal: sum(paid, true),
      next: open.filter((i) => !isOverdue(i))[0],
    };
  }, [installments]);

  const waNumber = customer ? customer.whatsapp || customer.phone : null;
  const firstName = customer?.name.split(" ")[0] ?? "";

  /* ── Assistente Império ────────────────────────────── */
  const insights = useMemo(() => {
    if (!customer) return [];
    const out: { key: string; tone: "warning" | "danger" | "info" | "gold" | "success"; icon: typeof Sparkles; title: string; body: string; link?: string | null; linkLabel?: string; onClick?: () => void; clickLabel?: string }[] = [];
    const wa = (msg: string) => whatsAppLink(waNumber, msg);

    const ready = orders.filter((o) => o.status === SalesOrderStatus.READY_FOR_PICKUP);
    if (ready.length) {
      out.push({
        key: "ready",
        tone: "gold",
        icon: Package,
        title: `Pedido #${ready[0].orderNumber} pronto para retirada`,
        body: "Avise o cliente que os óculos já podem ser retirados na loja.",
        link: wa(`Olá, ${firstName}! Seus óculos (pedido #${ready[0].orderNumber}) estão prontos para retirada na Óticas Império.`),
        linkLabel: "Avisar pelo WhatsApp",
      });
    }

    if (fin.overdueCount > 0) {
      out.push({
        key: "overdue",
        tone: "danger",
        icon: Wallet,
        title: `${fin.overdueCount} parcela(s) em atraso — ${formatCurrency(fin.overdueTotal)}`,
        body: "Faça um contato amigável lembrando do vencimento e ofereça PIX para facilitar.",
        link: wa(`Olá, ${firstName}! Tudo bem? Identificamos parcela(s) em aberto na Óticas Império. Podemos te ajudar com o pagamento por PIX?`),
        linkLabel: "Lembrar pelo WhatsApp",
      });
    }

    const latestRx = prescriptions[0];
    if (latestRx) {
      const v = getValidity(latestRx.validity);
      if (v.state === "expired") {
        out.push({
          key: "rx-expired",
          tone: "warning",
          icon: CalendarClock,
          title: `Receita vencida há ${Math.abs(v.days)} dias`,
          body: "Sugira um novo exame de vista — é a porta de entrada para uma nova compra.",
          link: wa(`Olá, ${firstName}! Sua receita de óculos venceu. Que tal agendar um novo exame? A Óticas Império tem condições especiais para você.`),
          linkLabel: "Sugerir novo exame",
        });
      } else if (v.state === "expiring") {
        out.push({
          key: "rx-expiring",
          tone: "warning",
          icon: CalendarClock,
          title: v.days === 0 ? "Receita vence hoje" : `Receita vence em ${v.days} dias`,
          body: "Entre em contato antes do vencimento para agendar o retorno.",
          link: wa(`Olá, ${firstName}! Sua receita de óculos vence em breve. Quer agendar um novo exame?`),
          linkLabel: "Entrar em contato",
        });
      }
      const rxDate = new Date(latestRx.date).getTime();
      const usedInSale = orders.some((o) => o.prescriptionId === latestRx.id || new Date(o.date).getTime() >= rxDate);
      if (!usedInSale && v.state !== "expired") {
        out.push({
          key: "rx-nosale",
          tone: "info",
          icon: FileText,
          title: "Receita recente sem venda vinculada",
          body: "O cliente tem receita válida e ainda não comprou — ofereça um orçamento de lentes e armação.",
          onClick: () => navigate(`/vendas/nova?customerId=${customer.id}`),
          clickLabel: "Iniciar venda",
        });
      }
    }

    if (lastOrder) {
      const d = daysSince(lastOrder.date);
      if (d >= 365) {
        out.push({
          key: "reactivate",
          tone: "info",
          icon: RefreshCw,
          title: `Sem compras ${relative(d)}`,
          body: "Cliente inativo há mais de um ano. Uma campanha de reativação com lançamentos pode trazê-lo de volta.",
          link: wa(`Olá, ${firstName}! Sentimos sua falta na Óticas Império. Chegaram armações novas — venha conferir!`),
          linkLabel: "Enviar convite",
        });
      } else if (d >= 180) {
        out.push({
          key: "followup",
          tone: "info",
          icon: RefreshCw,
          title: `Última compra ${relative(d)}`,
          body: "Bom momento para oferecer óculos de sol ou um segundo par com desconto.",
          link: wa(`Olá, ${firstName}! Temos condições especiais para o seu segundo par de óculos na Óticas Império.`),
          linkLabel: "Enviar oferta",
        });
      }
    } else if (!latestRx) {
      out.push({
        key: "first",
        tone: "info",
        icon: ShoppingBag,
        title: "Cliente ainda sem compras",
        body: "Registre a receita e faça o primeiro orçamento para converter o cadastro em venda.",
        onClick: canEdit
          ? () => {
              setRxEditing(null);
              setRxFormOpen(true);
            }
          : undefined,
        clickLabel: "Cadastrar receita",
      });
    }

    const bd = daysToBirthday(customer.birthDate);
    if (bd !== null && bd <= 15) {
      out.push({
        key: "birthday",
        tone: "gold",
        icon: Cake,
        title: bd === 0 ? "Aniversário hoje!" : `Aniversário em ${bd} dia${bd > 1 ? "s" : ""}`,
        body: "Envie parabéns com um cupom de desconto — gesto simples que fideliza.",
        link: wa(`Olá, ${firstName}! A Óticas Império deseja um feliz aniversário! Preparamos um presente especial para você na loja.`),
        linkLabel: "Enviar parabéns",
      });
    }

    const missing = [!customer.cpf && "CPF", !customer.birthDate && "data de nascimento", !customer.email && "e-mail"].filter(Boolean);
    if (missing.length >= 2 && canEdit) {
      out.push({
        key: "missing",
        tone: "success",
        icon: UserRound,
        title: "Complete o cadastro",
        body: `Faltam: ${missing.join(", ")}. Dados completos permitem campanhas de aniversário e envio de comprovantes.`,
        onClick: () => navigate(`/clientes/${customer.id}/editar`),
        clickLabel: "Editar cadastro",
      });
    }
    return out.slice(0, 4);
  }, [customer, orders, prescriptions, lastOrder, fin, waNumber, firstName, canEdit, navigate]);

  /* ── Ações ─────────────────────────────────────────── */
  const handleDeleteRx = async () => {
    if (!rxDeleting) return;
    setRxDeleteBusy(true);
    try {
      await prescriptionService.remove(rxDeleting.id);
      toast({ title: "Receita excluída" });
      setRxDeleting(null);
      load();
    } catch (e) {
      toast({ title: "Não foi possível excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setRxDeleteBusy(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    setDeleteBusy(true);
    try {
      await customerService.delete(customer.id);
      toast({ title: "Cliente excluído", description: customer.name });
      navigate("/clientes");
    } catch (e) {
      toast({ title: "Não foi possível excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
      setDeleteBusy(false);
    }
  };

  /* ── Estados ───────────────────────────────────────── */
  if (loading && !customer) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-16 w-80" />
          <div className="surface flex items-center gap-5 p-5">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

  if (error || !customer) {
    return (
      <MainLayout>
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível abrir o cliente"
          description={error ?? "Cliente não encontrado."}
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/clientes")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Clientes
              </Button>
              <Button onClick={load}>
                <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
              </Button>
            </div>
          }
        />
      </MainLayout>
    );
  }

  const address = [
    [customer.street, customer.number].filter(Boolean).join(", "),
    customer.complement,
    customer.neighborhood,
    [customer.city, customer.state].filter(Boolean).join("/"),
    customer.zipCode ? `CEP ${customer.zipCode.replace(/(\d{5})(\d{3})/, "$1-$2")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const age = ageFrom(customer.birthDate);
  const waLink = whatsAppLink(waNumber);
  const bd = daysToBirthday(customer.birthDate);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Perfil do cliente"
          title={customer.name}
          description={`Cliente desde ${formatDate(customer.createdAt)}`}
          icon={UserRound}
          actions={
            <>
              <Button variant="ghost" onClick={() => navigate("/clientes")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Clientes
              </Button>
              {canEdit && (
                <>
                  <Button variant="outline" onClick={() => navigate(`/clientes/${customer.id}/editar`)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                  <Button variant="gold" onClick={() => navigate(`/vendas/nova?customerId=${customer.id}`)}>
                    <Plus className="mr-2 h-4 w-4" /> Nova venda
                  </Button>
                </>
              )}
            </>
          }
        />

        {/* Perfil */}
        <section className="surface overflow-hidden animate-rise">
          <div className="ink-texture h-16 sm:h-20" />
          <div className="-mt-10 flex flex-col gap-5 px-5 pb-5 sm:-mt-12 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-end gap-4">
              {customer.photo ? (
                <img src={customer.photo} alt={customer.name} className="h-20 w-20 rounded-full object-cover ring-4 ring-card sm:h-24 sm:w-24" />
              ) : (
                <InitialsAvatar name={customer.name} size="lg" className="h-20 w-20 text-2xl ring-4 sm:h-24 sm:w-24" />
              )}
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  {customer.status === CustomerStatus.INACTIVE ? (
                    <StatusPill tone="neutral">Inativo</StatusPill>
                  ) : (
                    <StatusPill tone="success">Ativo</StatusPill>
                  )}
                  {bd !== null && bd <= 15 && (
                    <StatusPill tone="gold">{bd === 0 ? "Aniversário hoje" : `Aniversário em ${bd}d`}</StatusPill>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[customer.cpf && `CPF ${formatCPF(customer.cpf)}`, age !== null && `${age} anos`].filter(Boolean).join(" · ") || "Sem CPF informado"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {waLink && (
                <Button asChild variant="outline" className="border-success/40 text-success hover:bg-success-soft hover:text-success">
                  <a href={waLink} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              )}
              <Button asChild variant="outline">
                <a href={`tel:+55${customer.phone.replace(/\D/g, "")}`}>
                  <Phone className="mr-2 h-4 w-4" /> Ligar
                </a>
              </Button>
              {customer.email && (
                <Button asChild variant="outline">
                  <a href={`mailto:${customer.email}`}>
                    <Mail className="mr-2 h-4 w-4" /> E-mail
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div className="gold-rule mx-5" />
          <dl className="grid grid-cols-1 gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="eyebrow">Telefone</dt>
              <dd className="num mt-0.5 font-medium">{formatPhone(customer.phone)}</dd>
              {customer.whatsapp && customer.whatsapp.replace(/\D/g, "") !== customer.phone.replace(/\D/g, "") && (
                <dd className="num text-xs text-muted-foreground">WhatsApp {formatPhone(customer.whatsapp)}</dd>
              )}
            </div>
            <div className="min-w-0">
              <dt className="eyebrow">E-mail</dt>
              <dd className="mt-0.5 truncate font-medium">{customer.email || <span className="text-muted-foreground">—</span>}</dd>
            </div>
            <div>
              <dt className="eyebrow">Nascimento</dt>
              <dd className="num mt-0.5 font-medium">{customer.birthDate ? formatDay(customer.birthDate) : <span className="text-muted-foreground">—</span>}</dd>
            </div>
            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <dt className="eyebrow">Endereço</dt>
              <dd className="mt-0.5 font-medium">
                {address ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.replace(/ · /g, ", "))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-start gap-1 hover:text-primary hover:underline"
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    <span>{address}</span>
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            {customer.notes && (
              <div className="rounded-xl bg-muted/50 p-3 sm:col-span-2 lg:col-span-4">
                <dt className="eyebrow flex items-center gap-1.5">
                  <NotebookPen className="h-3.5 w-3.5" /> Observações
                </dt>
                <dd className="mt-1 whitespace-pre-wrap">{customer.notes}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard {...rise(1)} featured label="Total em compras" value={formatCurrency(totalSpent)} icon={Wallet} hint={`${validOrders.length} pedido${validOrders.length === 1 ? "" : "s"}`} />
          <StatCard {...rise(2)} label="Ticket médio" value={formatCurrency(avgTicket)} icon={Receipt} tone="gold" />
          <StatCard
            {...rise(3)}
            label="Última compra"
            value={lastOrder ? formatDate(lastOrder.date) : "—"}
            hint={lastOrder ? relative(daysSince(lastOrder.date)) : "Nenhuma compra"}
            icon={ShoppingBag}
            tone="info"
          />
          <StatCard
            {...rise(4)}
            label="Saldo em aberto"
            value={formatCurrency(fin.openTotal)}
            hint={fin.overdueCount ? `${fin.overdueCount} em atraso` : fin.next ? `Próx. venc. ${formatDate(fin.next.dueDate)}` : "Nada pendente"}
            icon={CreditCard}
            tone={fin.overdueCount ? "danger" : "success"}
            onClick={installments.length ? () => setTab("financeiro") : undefined}
          />
        </div>

        {insights.length > 0 && (
          <Panel title="Assistente Império" description={`Próximos passos sugeridos para ${firstName}`} icon={Sparkles} {...rise(5)}>
            <div className="grid gap-3 md:grid-cols-2">
              {insights.map((i) => (
                <InsightCard
                  key={i.key}
                  icon={i.icon}
                  tone={i.tone}
                  title={i.title}
                  action={
                    i.link ? (
                      <a href={i.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        <MessageCircle className="h-3.5 w-3.5" /> {i.linkLabel} →
                      </a>
                    ) : i.onClick ? (
                      <button type="button" onClick={i.onClick} className="text-xs font-semibold text-primary hover:underline">
                        {i.clickLabel} →
                      </button>
                    ) : undefined
                  }
                >
                  {i.body}
                </InsightCard>
              ))}
            </div>
          </Panel>
        )}

        {/* Abas */}
        <Tabs value={tab} onValueChange={setTab} className="animate-rise space-y-4" style={rise(6).style}>
          <TabsList className="grid w-full grid-cols-3 sm:inline-grid sm:w-auto">
            <TabsTrigger value="compras" className="gap-1.5">
              <ShoppingBag className="h-4 w-4" /> Compras
              <span className="num text-xs text-muted-foreground">({orders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="receitas" className="gap-1.5">
              <FileText className="h-4 w-4" /> Receitas
              <span className="num text-xs text-muted-foreground">({prescriptions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-1.5">
              <CreditCard className="h-4 w-4" /> <span className="hidden sm:inline">Financeiro</span>
              <span className="sm:hidden">Parcelas</span>
            </TabsTrigger>
          </TabsList>

          {/* Compras */}
          <TabsContent value="compras" className="mt-0">
            <Panel bodyClassName="p-0">
              {orders.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="Nenhuma compra registrada"
                  description="As vendas feitas para este cliente aparecerão aqui."
                  action={
                    canEdit && (
                      <Button onClick={() => navigate(`/vendas/nova?customerId=${customer.id}`)}>
                        <Plus className="mr-2 h-4 w-4" /> Nova venda
                      </Button>
                    )
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {orders.map((o) => {
                    const st = ORDER_STATUS[o.status] ?? { label: o.status, tone: "info" as const };
                    const itemNames = (o.items ?? [])
                      .map((it) => it.product?.name || it.description)
                      .filter(Boolean) as string[];
                    const methods = Array.from(new Set((o.payments ?? []).map((p) => METHOD_LABEL[p.method] ?? p.method)));
                    return (
                      <li key={o.id}>
                        <Link to={`/vendas/${o.id}`} className="flex flex-col gap-2 p-4 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-display font-semibold">Pedido #{o.orderNumber}</span>
                              <StatusPill tone={st.tone}>{st.label}</StatusPill>
                            </div>
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">
                              {itemNames.length ? itemNames.slice(0, 3).join(", ") + (itemNames.length > 3 ? ` +${itemNames.length - 3}` : "") : `${o.items?.length ?? 0} item(ns)`}
                            </p>
                            {o.status === SalesOrderStatus.CANCELLED && o.cancelReason && (
                              <p className="text-xs text-danger">Motivo: {o.cancelReason}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-0.5">
                            <span className={`num font-display text-lg font-semibold ${o.status === SalesOrderStatus.CANCELLED ? "text-muted-foreground line-through" : ""}`}>
                              {formatCurrency(o.total)}
                            </span>
                            <span className="num text-xs text-muted-foreground">
                              {formatDate(o.date)}
                              {methods.length ? ` · ${methods.join(", ")}` : ""}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </TabsContent>

          {/* Receitas */}
          <TabsContent value="receitas" className="mt-0">
            <Panel
              title="Receitas"
              description="Grau por olho, validade e tratamentos indicados"
              icon={FileText}
              actions={
                canEdit && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setRxEditing(null);
                      setRxFormOpen(true);
                    }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Nova receita
                  </Button>
                )
              }
            >
              {prescriptions.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Nenhuma receita cadastrada"
                  description="Cadastre a receita para acompanhar a validade e agilizar o pedido ao laboratório."
                  className="py-8"
                />
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((rx, idx) => (
                    <article key={rx.id} className="rounded-2xl border border-border p-4">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display font-semibold">Receita de {formatDay(rx.date)}</p>
                            {idx === 0 && <StatusPill tone="navy">Mais recente</StatusPill>}
                            <ValidityPill validity={rx.validity} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {rx.doctor ? `Dr(a). ${rx.doctor}` : "Médico não informado"}
                            {rx.doctorCrm ? ` · CRM ${rx.doctorCrm}` : ""} · válida até {formatDay(rx.validity)}
                          </p>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRxEditing(rx);
                                setRxFormOpen(true);
                              }}
                            >
                              <Pencil className="mr-1.5 h-4 w-4" /> Editar
                            </Button>
                            <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setRxDeleting(rx)} title="Excluir receita">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <PrescriptionGrid rx={rx} compact />
                      <div className="mt-3">
                        <LensSummary rx={rx} />
                      </div>
                      {rx.notes && <p className="mt-2 text-xs text-muted-foreground">Obs.: {rx.notes}</p>}
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </TabsContent>

          {/* Financeiro */}
          <TabsContent value="financeiro" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Em aberto" value={formatCurrency(fin.openTotal)} tone="warning" icon={CalendarClock} />
              <StatCard label="Em atraso" value={formatCurrency(fin.overdueTotal)} tone="danger" icon={AlertTriangle} hint={fin.overdueCount ? `${fin.overdueCount} parcela(s)` : undefined} />
              <StatCard label="Pago" value={formatCurrency(fin.paidTotal)} tone="success" icon={Wallet} />
            </div>
            <Panel title="Parcelas" description="Crediário e parcelamentos das compras" icon={CreditCard} bodyClassName="p-0">
              {installments.length === 0 ? (
                <EmptyState icon={CreditCard} title="Nenhuma parcela" description="Este cliente não possui compras parceladas no crediário." className="py-8" />
              ) : (
                <>
                  <ul className="divide-y divide-border md:hidden">
                    {installments.map((i) => {
                      const late = isOverdue(i);
                      return (
                        <li key={i.id} className="flex items-center justify-between gap-3 p-4">
                          <div>
                            <p className="font-medium">
                              Parcela {i.number}/{i.count} · <Link className="text-primary hover:underline" to={`/vendas/${i.orderId}`}>#{i.orderNumber}</Link>
                            </p>
                            <p className="num text-xs text-muted-foreground">Vence {formatDate(i.dueDate)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="num font-semibold">{formatCurrency(i.amount)}</span>
                            <InstallmentPill status={i.status} late={late} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-2.5 font-semibold">Pedido</th>
                          <th className="px-4 py-2.5 font-semibold">Parcela</th>
                          <th className="px-4 py-2.5 font-semibold">Forma</th>
                          <th className="px-4 py-2.5 font-semibold">Vencimento</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
                          <th className="px-4 py-2.5 font-semibold">Pagamento</th>
                          <th className="px-4 py-2.5 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {installments.map((i) => {
                          const late = isOverdue(i);
                          return (
                            <tr key={i.id} className={late ? "bg-danger-soft/40" : undefined}>
                              <td className="px-4 py-3">
                                <Link className="font-medium text-primary hover:underline" to={`/vendas/${i.orderId}`}>
                                  #{i.orderNumber}
                                </Link>
                              </td>
                              <td className="num px-4 py-3">
                                {i.number}/{i.count}
                              </td>
                              <td className="px-4 py-3">{METHOD_LABEL[i.method] ?? i.method}</td>
                              <td className="num px-4 py-3">{formatDate(i.dueDate)}</td>
                              <td className="num px-4 py-3 text-right font-semibold">{formatCurrency(i.amount)}</td>
                              <td className="num px-4 py-3 text-muted-foreground">
                                {i.paidDate ? `${formatDate(i.paidDate)}${i.paidAmount != null ? ` · ${formatCurrency(i.paidAmount)}` : ""}` : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <InstallmentPill status={i.status} late={late} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Panel>
          </TabsContent>
        </Tabs>

        {canEdit && (
          <div className="flex justify-end">
            <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir cliente
            </Button>
          </div>
        )}
      </div>

      <PrescriptionFormDialog
        open={rxFormOpen}
        onOpenChange={setRxFormOpen}
        prescription={rxEditing}
        customer={{ id: customer.id, name: customer.name }}
        onSaved={() => {
          setTab("receitas");
          load();
        }}
      />

      <Dialog open={!!rxDeleting} onOpenChange={(o) => !o && !rxDeleteBusy && setRxDeleting(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir receita?</DialogTitle>
            <DialogDescription>A receita de {formatDay(rxDeleting?.date)} será removida do perfil.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRxDeleting(null)} disabled={rxDeleteBusy}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteRx} disabled={rxDeleteBusy}>
              {rxDeleteBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(o) => !deleteBusy && setDeleteOpen(o)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir cliente?</DialogTitle>
            <DialogDescription>
              <strong>{customer.name}</strong> deixará de aparecer nas listas. Vendas e receitas já registradas são preservadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCustomer} disabled={deleteBusy}>
              {deleteBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function InstallmentPill({ status, late }: { status: InstallmentStatus; late: boolean }) {
  if (status === InstallmentStatus.PAID) return <StatusPill tone="success">Paga</StatusPill>;
  if (status === InstallmentStatus.RENEGOTIATED) return <StatusPill tone="info">Renegociada</StatusPill>;
  if (late) return <StatusPill tone="danger">Em atraso</StatusPill>;
  return <StatusPill tone="warning">Pendente</StatusPill>;
}
