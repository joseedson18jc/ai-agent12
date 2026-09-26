import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  PageHeader, Panel, StatCard, StatusPill, EmptyState, InsightCard, rise,
} from "@/components/imperio";
import {
  Plus, Check, AlertTriangle, Wallet, ArrowDownCircle, ArrowUpCircle, Landmark, Search,
  Sparkles, CalendarClock, CircleDollarSign, TrendingDown, TrendingUp, MessageCircle, Trash2,
  Repeat, RefreshCw, Lock, Unlock, ArrowDownRight, ArrowUpRight, MinusCircle, PlusCircle, Receipt,
  CheckCircle2, Clock, Tag, X,
} from "lucide-react";
import financialService, {
  type BillItem, type BillCategoryItem, type ReceivableItem, type CashRegisterItem,
  type CashMovementItem, type PaymentMethodCode, type BillFrequencyCode, type CashMovementTypeCode,
} from "@/services/financial.service";
import supplierService, { type SupplierItem } from "@/services/supplier.service";
import settingsService from "@/services/settings.service";

/* ── constants ─────────────────────────────────────────────── */

type TabKey = "pagar" | "receber" | "caixa";
const TAB_PATH: Record<TabKey, string> = {
  pagar: "/financeiro/contas-pagar",
  receber: "/financeiro/contas-receber",
  caixa: "/financeiro/caixa",
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethodCode, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  STORE_CREDIT: "Crediário",
  INSURANCE: "Convênio",
  EXCHANGE: "Troca",
};
const PAY_METHODS: PaymentMethodCode[] = ["PIX", "CASH", "DEBIT_CARD", "CREDIT_CARD"];

const FREQUENCY_LABEL: Record<BillFrequencyCode, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

const MOVEMENT_META: Record<CashMovementTypeCode, { label: string; sign: 1 | -1; tone: "success" | "danger" | "info" | "warning" | "navy" }> = {
  OPENING: { label: "Abertura", sign: 1, tone: "navy" },
  INFLOW: { label: "Entrada", sign: 1, tone: "success" },
  SUPPLEMENT: { label: "Suprimento", sign: 1, tone: "info" },
  OUTFLOW: { label: "Saída", sign: -1, tone: "danger" },
  WITHDRAWAL: { label: "Sangria", sign: -1, tone: "warning" },
};

/* ── date / money helpers ──────────────────────────────────── */

const DAY = 86_400_000;
function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
/** Calendar days from today to the given date (negative = past). */
function daysUntil(date: string) {
  return Math.round((startOfLocalDay(new Date(date)).getTime() - startOfLocalDay(new Date()).getTime()) / DAY);
}
function relativeDue(date: string) {
  const d = daysUntil(date);
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  if (d > 1) return `em ${d} dias`;
  if (d === -1) return "venceu ontem";
  return `há ${-d} dias`;
}
function isThisMonth(date?: string | null) {
  if (!date) return false;
  const d = new Date(date);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}
/** yyyy-mm-dd (from <input type=date>) → ISO at the end of that local day, so it is only overdue after the day ends. */
function dueInputToIso(value: string) {
  return new Date(`${value}T23:59:00`).toISOString();
}
function parseMoney(v: string) {
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
/** Accept both "1234.5" and "1.234,50" */
function parseMoneyInput(v: string) {
  if (!v) return NaN;
  if (v.includes(",")) return parseMoney(v);
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}
function sum<T>(arr: T[], fn: (x: T) => number) {
  return arr.reduce((s, x) => s + (fn(x) || 0), 0);
}
function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
function whatsappLink(phone: string, text: string) {
  const clean = phone.replace(/\D/g, "");
  const number = clean.startsWith("55") ? clean : `55${clean}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
function errMsg(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}

/* ── status derivations ────────────────────────────────────── */

const billOpen = (b: BillItem) => b.status === "PENDING" || b.status === "OVERDUE";
const billOverdue = (b: BillItem) => b.status === "OVERDUE" || (b.status === "PENDING" && daysUntil(b.dueDate) < 0);
const instOpen = (i: ReceivableItem) => i.status === "PENDING" || i.status === "OVERDUE";
const instOverdue = (i: ReceivableItem) => i.status === "OVERDUE" || (i.status === "PENDING" && daysUntil(i.dueDate) < 0);

function billStatus(b: BillItem): { label: string; tone: "success" | "danger" | "warning" | "neutral" | "info" } {
  if (b.status === "PAID") return { label: "Paga", tone: "success" };
  if (b.status === "CANCELLED") return { label: "Cancelada", tone: "neutral" };
  if (billOverdue(b)) return { label: "Vencida", tone: "danger" };
  if (daysUntil(b.dueDate) <= 3) return { label: "Vence em breve", tone: "warning" };
  return { label: "Pendente", tone: "info" };
}
function instStatus(i: ReceivableItem): { label: string; tone: "success" | "danger" | "warning" | "neutral" | "info" } {
  if (i.status === "PAID") return { label: "Recebida", tone: "success" };
  if (i.status === "RENEGOTIATED") return { label: "Renegociada", tone: "neutral" };
  if (instOverdue(i)) return { label: "Em atraso", tone: "danger" };
  if (daysUntil(i.dueDate) <= 3) return { label: "Vence em breve", tone: "warning" };
  return { label: "Pendente", tone: "info" };
}

const customerOf = (i: ReceivableItem) => i.payment?.salesOrder?.customer ?? null;

type BillFilter = "todas" | "pendentes" | "vencidas" | "proximas" | "pagas";
type RecFilter = "todas" | "pendentes" | "atrasadas" | "pagas";

/* ── page ──────────────────────────────────────────────────── */

export default function Financial() {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const tab: TabKey = location.pathname.includes("contas-receber")
    ? "receber"
    : location.pathname.includes("caixa")
      ? "caixa"
      : "pagar";
  const goTab = (t: string) => navigate(TAB_PATH[t as TabKey] ?? TAB_PATH.pagar);

  /* settings (alert window) */
  const [alertDays, setAlertDays] = useState(7);

  /* bills */
  const [bills, setBills] = useState<BillItem[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [billsError, setBillsError] = useState(false);
  const [billFilter, setBillFilter] = useState<BillFilter>("todas");
  const [billSearch, setBillSearch] = useState("");

  /* receivables */
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  const [recLoading, setRecLoading] = useState(true);
  const [recError, setRecError] = useState(false);
  const [recFilter, setRecFilter] = useState<RecFilter>("todas");
  const [recSearch, setRecSearch] = useState("");

  /* cash */
  const [cash, setCash] = useState<CashRegisterItem | null>(null);
  const [cashHistory, setCashHistory] = useState<CashRegisterItem[]>([]);
  const [cashLoading, setCashLoading] = useState(true);
  const [cashError, setCashError] = useState(false);

  /* dialogs */
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [payBill, setPayBill] = useState<BillItem | null>(null);
  const [deleteBill, setDeleteBill] = useState<BillItem | null>(null);
  const [receiveInst, setReceiveInst] = useState<ReceivableItem | null>(null);
  const [openCashDialog, setOpenCashDialog] = useState(false);
  const [closeCashDialog, setCloseCashDialog] = useState(false);
  const [movementType, setMovementType] = useState<Exclude<CashMovementTypeCode, "OPENING"> | null>(null);

  const fetchBills = useCallback(async () => {
    setBillsLoading(true);
    setBillsError(false);
    try {
      const res = await financialService.getAllBills({ limit: 500 });
      setBills(res.data || []);
    } catch (e) {
      setBillsError(true);
      toast({ title: "Erro ao carregar contas a pagar", description: errMsg(e, "Tente novamente."), variant: "destructive" });
    } finally {
      setBillsLoading(false);
    }
  }, [toast]);

  const fetchReceivables = useCallback(async () => {
    setRecLoading(true);
    setRecError(false);
    try {
      const res = await financialService.getReceivables({ limit: 500 });
      setReceivables(res.data || []);
    } catch (e) {
      setRecError(true);
      toast({ title: "Erro ao carregar contas a receber", description: errMsg(e, "Tente novamente."), variant: "destructive" });
    } finally {
      setRecLoading(false);
    }
  }, [toast]);

  const fetchCash = useCallback(async () => {
    setCashLoading(true);
    setCashError(false);
    try {
      const [cur, hist] = await Promise.all([
        financialService.getCurrentCash(),
        financialService.getCashHistory(1, 6),
      ]);
      setCash(cur.data ?? null);
      setCashHistory((hist.data || []).filter((r) => r.isClosed));
    } catch (e) {
      setCashError(true);
      toast({ title: "Erro ao carregar o caixa", description: errMsg(e, "Tente novamente."), variant: "destructive" });
    } finally {
      setCashLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBills();
    fetchReceivables();
    fetchCash();
    settingsService
      .get()
      .then((r) => {
        if (r.data?.billAlertDays) setAlertDays(r.data.billAlertDays);
      })
      .catch(() => { /* keep default window */ });
  }, [fetchBills, fetchReceivables, fetchCash]);

  /* ── derived: bills ── */
  const billStats = useMemo(() => {
    const open = bills.filter(billOpen);
    const monthOpen = open.filter((b) => isThisMonth(b.dueDate));
    const overdue = open.filter(billOverdue);
    const upcoming = open.filter((b) => !billOverdue(b) && daysUntil(b.dueDate) <= alertDays);
    const paidMonth = bills.filter((b) => b.status === "PAID" && isThisMonth(b.paidDate));
    return {
      monthOpenTotal: sum(monthOpen, (b) => b.amount),
      monthOpenCount: monthOpen.length,
      overdueTotal: sum(overdue, (b) => b.amount),
      overdueCount: overdue.length,
      upcomingTotal: sum(upcoming, (b) => b.amount),
      upcomingCount: upcoming.length,
      paidMonthTotal: sum(paidMonth, (b) => b.amount),
      paidMonthCount: paidMonth.length,
      pendingCount: open.length,
      paidCount: bills.filter((b) => b.status === "PAID").length,
    };
  }, [bills, alertDays]);

  const filteredBills = useMemo(() => {
    const q = billSearch.trim().toLowerCase();
    return bills
      .filter((b) => {
        switch (billFilter) {
          case "pendentes": return billOpen(b);
          case "vencidas": return billOpen(b) && billOverdue(b);
          case "proximas": return billOpen(b) && !billOverdue(b) && daysUntil(b.dueDate) <= alertDays;
          case "pagas": return b.status === "PAID";
          default: return b.status !== "CANCELLED";
        }
      })
      .filter((b) =>
        !q ||
        b.description.toLowerCase().includes(q) ||
        b.category?.name.toLowerCase().includes(q) ||
        b.supplier?.name.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        if (billFilter === "pagas") return new Date(b.paidDate || 0).getTime() - new Date(a.paidDate || 0).getTime();
        // open bills first, by due date
        const ao = billOpen(a) ? 0 : 1;
        const bo = billOpen(b) ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [bills, billFilter, billSearch, alertDays]);

  /* ── derived: receivables ── */
  const recStats = useMemo(() => {
    const open = receivables.filter(instOpen);
    const overdue = open.filter(instOverdue);
    const week = open.filter((i) => !instOverdue(i) && daysUntil(i.dueDate) <= 7);
    const paidMonth = receivables.filter((i) => i.status === "PAID" && isThisMonth(i.paidDate));
    return {
      openTotal: sum(open, (i) => i.amount),
      openCount: open.length,
      overdueTotal: sum(overdue, (i) => i.amount),
      overdueCount: overdue.length,
      weekTotal: sum(week, (i) => i.amount),
      weekCount: week.length,
      paidMonthTotal: sum(paidMonth, (i) => i.paidAmount ?? i.amount),
      paidMonthCount: paidMonth.length,
      paidCount: receivables.filter((i) => i.status === "PAID").length,
    };
  }, [receivables]);

  const filteredRec = useMemo(() => {
    const q = recSearch.trim().toLowerCase();
    return receivables
      .filter((i) => {
        switch (recFilter) {
          case "pendentes": return instOpen(i) && !instOverdue(i);
          case "atrasadas": return instOpen(i) && instOverdue(i);
          case "pagas": return i.status === "PAID";
          default: return true;
        }
      })
      .filter((i) => {
        if (!q) return true;
        const c = customerOf(i);
        return (
          c?.name.toLowerCase().includes(q) ||
          String(i.payment?.salesOrder?.orderNumber ?? "").includes(q)
        );
      })
      .sort((a, b) => {
        if (recFilter === "pagas") return new Date(b.paidDate || 0).getTime() - new Date(a.paidDate || 0).getTime();
        const ao = instOpen(a) ? 0 : 1;
        const bo = instOpen(b) ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [receivables, recFilter, recSearch]);

  /* ── derived: cash ── */
  const cashCalc = useMemo(() => {
    const movs = [...(cash?.movements || [])].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const hasOpening = movs.some((m) => m.type === "OPENING");
    let running = hasOpening ? 0 : cash?.openingBalance || 0;
    const rows = movs.map((m) => {
      running += MOVEMENT_META[m.type].sign * m.amount;
      return { ...m, balance: running };
    });
    const inflow = sum(movs.filter((m) => m.type === "INFLOW" || m.type === "SUPPLEMENT"), (m) => m.amount);
    const outflow = sum(movs.filter((m) => m.type === "OUTFLOW" || m.type === "WITHDRAWAL"), (m) => m.amount);
    return { rows, inflow, outflow, balance: running };
  }, [cash]);

  /* ── Assistente Império ── */
  const insights = useMemo(() => {
    type Ins = { key: string; tone: "success" | "warning" | "info" | "danger" | "gold"; icon: typeof Sparkles; title: string; body: string; action?: { label: string; onClick: () => void } };
    const out: Ins[] = [];
    if (billsLoading || recLoading) return out;

    const openBills = bills.filter(billOpen);
    const openInst = receivables.filter(instOpen);

    // Overdue bills
    const ob = openBills.filter(billOverdue);
    if (ob.length) {
      out.push({
        key: "ob",
        tone: "danger",
        icon: AlertTriangle,
        title: `${plural(ob.length, "conta vencida", "contas vencidas")} somando ${formatCurrency(sum(ob, (b) => b.amount))}`,
        body: `A mais antiga é "${[...ob].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0].description}". Quite para evitar juros e multa.`,
        action: { label: "Ver vencidas", onClick: () => { setBillFilter("vencidas"); goTab("pagar"); } },
      });
    }

    // Due today
    const today = openBills.filter((b) => daysUntil(b.dueDate) === 0);
    if (today.length) {
      out.push({
        key: "today",
        tone: "warning",
        icon: CalendarClock,
        title: `${plural(today.length, "conta vence", "contas vencem")} hoje (${formatCurrency(sum(today, (b) => b.amount))})`,
        body: today.slice(0, 3).map((b) => b.description).join(", ") + (today.length > 3 ? "…" : "."),
        action: { label: "Pagar agora", onClick: () => { setBillFilter("proximas"); goTab("pagar"); } },
      });
    }

    // Cash-flow windows
    for (const days of [7, 30]) {
      const out7 = sum(openBills.filter((b) => daysUntil(b.dueDate) <= days), (b) => b.amount);
      const in7 = sum(openInst.filter((i) => !instOverdue(i) && daysUntil(i.dueDate) <= days), (i) => i.amount);
      if (out7 === 0 && in7 === 0) continue;
      const cashNow = cash ? cashCalc.balance : 0;
      const gap = in7 + cashNow - out7;
      if (gap < 0) {
        out.push({
          key: `cf${days}`,
          tone: days === 7 ? "danger" : "warning",
          icon: TrendingDown,
          title: `Próximos ${days} dias: faltam ${formatCurrency(-gap)} para cobrir as contas`,
          body: `Saem ${formatCurrency(out7)} em contas (incluindo vencidas) e entram ${formatCurrency(in7)} em parcelas previstas${cash ? `, com ${formatCurrency(cashNow)} no caixa` : ""}. Antecipe cobranças ou renegocie vencimentos.`,
          action: { label: "Ver recebíveis", onClick: () => { setRecFilter("pendentes"); goTab("receber"); } },
        });
      } else if (days === 7 && out7 > 0) {
        out.push({
          key: `cf${days}`,
          tone: "success",
          icon: TrendingUp,
          title: `Semana coberta: ${formatCurrency(in7)} previstos contra ${formatCurrency(out7)} em contas`,
          body: `Sobra estimada de ${formatCurrency(gap)} nos próximos 7 dias${cash ? " considerando o saldo do caixa" : ""}.`,
        });
      }
    }

    // Overdue receivables — who to call first
    const oi = openInst.filter(instOverdue);
    if (oi.length) {
      const byCustomer = new Map<string, { name: string; phone?: string | null; id?: string; total: number; count: number; oldest: string }>();
      for (const i of oi) {
        const c = customerOf(i);
        const key = c?.id || "?";
        const cur = byCustomer.get(key) || { name: c?.name || "Cliente", phone: c?.phone, id: c?.id, total: 0, count: 0, oldest: i.dueDate };
        cur.total += i.amount;
        cur.count += 1;
        if (new Date(i.dueDate) < new Date(cur.oldest)) cur.oldest = i.dueDate;
        byCustomer.set(key, cur);
      }
      const ranked = [...byCustomer.values()].sort((a, b) => b.total - a.total);
      const top = ranked[0];
      out.push({
        key: "oi",
        tone: "warning",
        icon: MessageCircle,
        title: `${plural(oi.length, "parcela em atraso", "parcelas em atraso")} (${formatCurrency(sum(oi, (i) => i.amount))}) de ${plural(ranked.length, "cliente", "clientes")}`,
        body: `Comece por ${top.name}: ${formatCurrency(top.total)} em ${plural(top.count, "parcela", "parcelas")}, atrasado ${relativeDue(top.oldest)}.`,
        action: top.phone
          ? {
              label: `Cobrar ${top.name.split(" ")[0]} no WhatsApp`,
              onClick: () =>
                window.open(
                  whatsappLink(
                    top.phone!,
                    `Olá, ${top.name.split(" ")[0]}! Tudo bem? Aqui é da Óticas Império. Identificamos ${plural(top.count, "parcela em aberto", "parcelas em aberto")} no valor total de ${formatCurrency(top.total)}. Podemos te ajudar a regularizar? Aceitamos Pix, cartão ou dinheiro.`,
                  ),
                  "_blank",
                ),
            }
          : { label: "Ver atrasadas", onClick: () => { setRecFilter("atrasadas"); goTab("receber"); } },
      });
    }

    // Cash register hygiene
    if (cash && daysUntil(cash.date) < 0) {
      out.push({
        key: "cashold",
        tone: "warning",
        icon: Lock,
        title: `O caixa está aberto desde ${formatDate(cash.date)}`,
        body: "Feche o caixa do dia anterior para conferir o saldo antes de abrir um novo.",
        action: { label: "Ir para o caixa", onClick: () => goTab("caixa") },
      });
    }
    const diffs = cashHistory.filter((r) => r.difference && Math.abs(r.difference) >= 0.01);
    if (diffs.length >= 2) {
      out.push({
        key: "cashdiff",
        tone: "info",
        icon: Wallet,
        title: `${diffs.length} dos últimos ${cashHistory.length} fechamentos tiveram diferença`,
        body: `Total acumulado: ${formatCurrency(sum(diffs, (r) => r.difference || 0))}. Vale revisar troco e registro de sangrias.`,
      });
    }
    return out.slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bills, receivables, cash, cashCalc.balance, cashHistory, billsLoading, recLoading]);

  /* ── header actions per tab ── */
  const headerActions =
    tab === "pagar" ? (
      <Button onClick={() => setBillDialogOpen(true)}>
        <Plus /> Nova conta
      </Button>
    ) : tab === "caixa" && !cashLoading ? (
      cash ? (
        <Button variant="outline" onClick={() => setCloseCashDialog(true)}>
          <Lock /> Fechar caixa
        </Button>
      ) : (
        <Button variant="gold" onClick={() => setOpenCashDialog(true)}>
          <Unlock /> Abrir caixa
        </Button>
      )
    ) : null;

  const titles: Record<TabKey, { title: string; description: string }> = {
    pagar: { title: "Contas a pagar", description: "Despesas da loja, fornecedores e contas recorrentes." },
    receber: { title: "Contas a receber", description: "Parcelas do crediário e cobranças de clientes." },
    caixa: { title: "Caixa", description: "Abertura, movimentações e fechamento do dia." },
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Financeiro"
          title={titles[tab].title}
          description={titles[tab].description}
          icon={Landmark}
          actions={headerActions}
        />

        <Tabs value={tab} onValueChange={goTab}>
          <TabsList className="grid h-auto w-full grid-cols-3 sm:inline-grid sm:w-auto">
            <TabsTrigger value="pagar" className="gap-1.5 py-2">
              <ArrowUpCircle className="h-4 w-4" /> <span className="hidden sm:inline">A pagar</span>
              <span className="sm:hidden">Pagar</span>
            </TabsTrigger>
            <TabsTrigger value="receber" className="gap-1.5 py-2">
              <ArrowDownCircle className="h-4 w-4" /> <span className="hidden sm:inline">A receber</span>
              <span className="sm:hidden">Receber</span>
            </TabsTrigger>
            <TabsTrigger value="caixa" className="gap-1.5 py-2">
              <Wallet className="h-4 w-4" /> Caixa
            </TabsTrigger>
          </TabsList>

          {/* ═════════ CONTAS A PAGAR ═════════ */}
          <TabsContent value="pagar" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {billsLoading ? (
                [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[112px] rounded-2xl" />)
              ) : (
                <>
                  <StatCard {...rise(1)} featured label="A pagar no mês" icon={CircleDollarSign}
                    value={formatCurrency(billStats.monthOpenTotal)}
                    hint={plural(billStats.monthOpenCount, "conta em aberto", "contas em aberto")} />
                  <StatCard {...rise(2)} tone="danger" label="Vencidas" icon={AlertTriangle}
                    value={formatCurrency(billStats.overdueTotal)}
                    hint={plural(billStats.overdueCount, "conta", "contas")}
                    onClick={() => setBillFilter("vencidas")} />
                  <StatCard {...rise(3)} tone="warning" label={`Próximos ${alertDays} dias`} icon={CalendarClock}
                    value={formatCurrency(billStats.upcomingTotal)}
                    hint={plural(billStats.upcomingCount, "conta", "contas")}
                    onClick={() => setBillFilter("proximas")} />
                  <StatCard {...rise(4)} tone="success" label="Pagas no mês" icon={CheckCircle2}
                    value={formatCurrency(billStats.paidMonthTotal)}
                    hint={plural(billStats.paidMonthCount, "pagamento", "pagamentos")}
                    onClick={() => setBillFilter("pagas")} />
                </>
              )}
            </div>

            <Panel
              {...rise(5)}
              title="Lançamentos"
              icon={Receipt}
              bodyClassName="p-0"
              actions={
                <Button variant="ghost" size="icon" onClick={fetchBills} aria-label="Atualizar">
                  <RefreshCw className={cn(billsLoading && "animate-spin")} />
                </Button>
              }
            >
              <div className="space-y-3 px-5 pb-4">
                <FilterChips
                  value={billFilter}
                  onChange={(v) => setBillFilter(v as BillFilter)}
                  options={[
                    { value: "todas", label: "Todas" },
                    { value: "pendentes", label: "Pendentes", count: billStats.pendingCount },
                    { value: "vencidas", label: "Vencidas", count: billStats.overdueCount, danger: true },
                    { value: "proximas", label: "Próximas", count: billStats.upcomingCount },
                    { value: "pagas", label: "Pagas", count: billStats.paidCount },
                  ]}
                />
                <SearchBox value={billSearch} onChange={setBillSearch} placeholder="Buscar por descrição, categoria ou fornecedor" />
              </div>

              {billsLoading ? (
                <ListSkeleton />
              ) : billsError ? (
                <ErrorRetry onRetry={fetchBills} />
              ) : filteredBills.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title={bills.length === 0 ? "Nenhuma conta cadastrada" : "Nada por aqui"}
                  description={bills.length === 0 ? "Cadastre aluguel, energia, fornecedores e outras despesas para acompanhar os vencimentos." : "Nenhuma conta corresponde ao filtro selecionado."}
                  action={bills.length === 0 ? <Button onClick={() => setBillDialogOpen(true)}><Plus /> Nova conta</Button> : undefined}
                />
              ) : (
                <>
                  {/* mobile */}
                  <div className="divide-y divide-border border-t border-border md:hidden">
                    {filteredBills.map((b) => {
                      const st = billStatus(b);
                      const overdue = billOpen(b) && billOverdue(b);
                      return (
                        <div key={b.id} className={cn("space-y-2 px-5 py-4", overdue && "bg-danger-soft/40")}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{b.description}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {b.category?.name}{b.supplier ? ` · ${b.supplier.name}` : ""}
                              </p>
                            </div>
                            <p className="num shrink-0 font-display font-semibold">{formatCurrency(b.amount)}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <StatusPill tone={st.tone}>{st.label}</StatusPill>
                            <span className="num text-muted-foreground">
                              {b.status === "PAID" && b.paidDate ? `Paga em ${formatDate(b.paidDate)}` : `${formatDate(b.dueDate)} · ${relativeDue(b.dueDate)}`}
                            </span>
                            {b.isRecurring && <Badge variant="gold" className="gap-1"><Repeat className="h-3 w-3" />{b.frequency ? FREQUENCY_LABEL[b.frequency] : "Recorrente"}</Badge>}
                          </div>
                          <div className="flex justify-end gap-2">
                            {billOpen(b) && (
                              <Button size="sm" onClick={() => setPayBill(b)}><Check /> Pagar</Button>
                            )}
                            {b.status !== "PAID" && (
                              <Button size="sm" variant="ghost" onClick={() => setDeleteBill(b)} aria-label="Excluir">
                                <Trash2 className="text-danger" />
                              </Button>
                            )}
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
                          <TableHead className="pl-5">Descrição</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="pr-5 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBills.map((b) => {
                          const st = billStatus(b);
                          const overdue = billOpen(b) && billOverdue(b);
                          return (
                            <TableRow key={b.id} className={cn(overdue && "bg-danger-soft/40 hover:bg-danger-soft/60")}>
                              <TableCell className="pl-5">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{b.description}</span>
                                  {b.isRecurring && (
                                    <Badge variant="gold" className="gap-1">
                                      <Repeat className="h-3 w-3" />{b.frequency ? FREQUENCY_LABEL[b.frequency] : "Recorrente"}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {b.category?.name}{b.supplier ? ` · ${b.supplier.name}` : ""}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="num">{formatDate(b.dueDate)}</p>
                                <p className={cn("text-xs", overdue ? "text-danger" : "text-muted-foreground")}>
                                  {b.status === "PAID" && b.paidDate
                                    ? `Paga em ${formatDate(b.paidDate)}${b.paymentMethod ? ` · ${PAYMENT_METHOD_LABEL[b.paymentMethod]}` : ""}`
                                    : relativeDue(b.dueDate)}
                                </p>
                              </TableCell>
                              <TableCell className="num text-right font-display font-semibold">{formatCurrency(b.amount)}</TableCell>
                              <TableCell><StatusPill tone={st.tone}>{st.label}</StatusPill></TableCell>
                              <TableCell className="pr-5 text-right">
                                <div className="flex justify-end gap-1">
                                  {billOpen(b) && (
                                    <Button size="sm" variant="outline" onClick={() => setPayBill(b)}><Check /> Pagar</Button>
                                  )}
                                  {b.status !== "PAID" && (
                                    <Button size="sm" variant="ghost" onClick={() => setDeleteBill(b)} aria-label="Excluir">
                                      <Trash2 className="text-danger" />
                                    </Button>
                                  )}
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
          </TabsContent>

          {/* ═════════ CONTAS A RECEBER ═════════ */}
          <TabsContent value="receber" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {recLoading ? (
                [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[112px] rounded-2xl" />)
              ) : (
                <>
                  <StatCard {...rise(1)} featured label="A receber" icon={CircleDollarSign}
                    value={formatCurrency(recStats.openTotal)}
                    hint={plural(recStats.openCount, "parcela em aberto", "parcelas em aberto")} />
                  <StatCard {...rise(2)} tone="danger" label="Em atraso" icon={AlertTriangle}
                    value={formatCurrency(recStats.overdueTotal)}
                    hint={plural(recStats.overdueCount, "parcela", "parcelas")}
                    onClick={() => setRecFilter("atrasadas")} />
                  <StatCard {...rise(3)} tone="warning" label="Vence em 7 dias" icon={Clock}
                    value={formatCurrency(recStats.weekTotal)}
                    hint={plural(recStats.weekCount, "parcela", "parcelas")}
                    onClick={() => setRecFilter("pendentes")} />
                  <StatCard {...rise(4)} tone="success" label="Recebido no mês" icon={CheckCircle2}
                    value={formatCurrency(recStats.paidMonthTotal)}
                    hint={plural(recStats.paidMonthCount, "recebimento", "recebimentos")}
                    onClick={() => setRecFilter("pagas")} />
                </>
              )}
            </div>

            <Panel
              {...rise(5)}
              title="Parcelas do crediário"
              icon={ArrowDownCircle}
              bodyClassName="p-0"
              actions={
                <Button variant="ghost" size="icon" onClick={fetchReceivables} aria-label="Atualizar">
                  <RefreshCw className={cn(recLoading && "animate-spin")} />
                </Button>
              }
            >
              <div className="space-y-3 px-5 pb-4">
                <FilterChips
                  value={recFilter}
                  onChange={(v) => setRecFilter(v as RecFilter)}
                  options={[
                    { value: "todas", label: "Todas" },
                    { value: "pendentes", label: "A vencer", count: recStats.openCount - recStats.overdueCount },
                    { value: "atrasadas", label: "Atrasadas", count: recStats.overdueCount, danger: true },
                    { value: "pagas", label: "Recebidas", count: recStats.paidCount },
                  ]}
                />
                <SearchBox value={recSearch} onChange={setRecSearch} placeholder="Buscar por cliente ou nº da venda" />
              </div>

              {recLoading ? (
                <ListSkeleton />
              ) : recError ? (
                <ErrorRetry onRetry={fetchReceivables} />
              ) : filteredRec.length === 0 ? (
                <EmptyState
                  icon={ArrowDownCircle}
                  title={receivables.length === 0 ? "Nenhuma parcela a receber" : "Nada por aqui"}
                  description={receivables.length === 0 ? "As parcelas aparecem aqui quando uma venda é feita no crediário." : "Nenhuma parcela corresponde ao filtro selecionado."}
                  action={receivables.length === 0 ? <Button variant="outline" onClick={() => navigate("/vendas/nova")}><Plus /> Nova venda</Button> : undefined}
                />
              ) : (
                <>
                  {/* mobile */}
                  <div className="divide-y divide-border border-t border-border md:hidden">
                    {filteredRec.map((i) => {
                      const st = instStatus(i);
                      const c = customerOf(i);
                      const overdue = instOpen(i) && instOverdue(i);
                      return (
                        <div key={i.id} className={cn("space-y-2 px-5 py-4", overdue && "bg-danger-soft/40")}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              {c ? (
                                <Link to={`/clientes/${c.id}`} className="block truncate font-medium hover:text-primary hover:underline">{c.name}</Link>
                              ) : (
                                <p className="font-medium">Cliente</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Parcela {i.number}ª{i.payment?.salesOrder ? ` · Venda #${i.payment.salesOrder.orderNumber}` : ""}
                              </p>
                            </div>
                            <p className="num shrink-0 font-display font-semibold">{formatCurrency(i.amount)}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <StatusPill tone={st.tone}>{st.label}</StatusPill>
                            <span className="num text-muted-foreground">
                              {i.status === "PAID" && i.paidDate ? `Recebida em ${formatDate(i.paidDate)}` : `${formatDate(i.dueDate)} · ${relativeDue(i.dueDate)}`}
                            </span>
                          </div>
                          {instOpen(i) && (
                            <div className="flex justify-end gap-2">
                              {c?.phone && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={whatsappLink(c.phone, chargeMessage(i))} target="_blank" rel="noreferrer">
                                    <MessageCircle className="text-success" /> Cobrar
                                  </a>
                                </Button>
                              )}
                              <Button size="sm" onClick={() => setReceiveInst(i)}><Check /> Receber</Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-5">Cliente</TableHead>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="pr-5 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRec.map((i) => {
                          const st = instStatus(i);
                          const c = customerOf(i);
                          const so = i.payment?.salesOrder;
                          const overdue = instOpen(i) && instOverdue(i);
                          return (
                            <TableRow key={i.id} className={cn(overdue && "bg-danger-soft/40 hover:bg-danger-soft/60")}>
                              <TableCell className="pl-5">
                                {c ? (
                                  <Link to={`/clientes/${c.id}`} className="font-medium hover:text-primary hover:underline">{c.name}</Link>
                                ) : (
                                  <span className="font-medium">—</span>
                                )}
                                {so && (
                                  <Link to={`/vendas/${so.id}`} className="num block text-xs text-muted-foreground hover:text-primary">
                                    Venda #{so.orderNumber}
                                  </Link>
                                )}
                              </TableCell>
                              <TableCell className="num">{i.number}ª</TableCell>
                              <TableCell>
                                <p className="num">{formatDate(i.dueDate)}</p>
                                <p className={cn("text-xs", overdue ? "text-danger" : "text-muted-foreground")}>
                                  {i.status === "PAID" && i.paidDate
                                    ? `Recebida em ${formatDate(i.paidDate)}${i.paymentMethod ? ` · ${PAYMENT_METHOD_LABEL[i.paymentMethod]}` : ""}`
                                    : relativeDue(i.dueDate)}
                                </p>
                              </TableCell>
                              <TableCell className="text-right">
                                <p className="num font-display font-semibold">{formatCurrency(i.amount)}</p>
                                {i.status === "PAID" && i.paidAmount != null && Math.abs(i.paidAmount - i.amount) >= 0.01 && (
                                  <p className="num text-xs text-muted-foreground">pago {formatCurrency(i.paidAmount)}</p>
                                )}
                              </TableCell>
                              <TableCell><StatusPill tone={st.tone}>{st.label}</StatusPill></TableCell>
                              <TableCell className="pr-5 text-right">
                                {instOpen(i) && (
                                  <div className="flex justify-end gap-1">
                                    {c?.phone && (
                                      <Button size="sm" variant="ghost" asChild>
                                        <a href={whatsappLink(c.phone, chargeMessage(i))} target="_blank" rel="noreferrer" aria-label="Cobrar no WhatsApp" title="Cobrar no WhatsApp">
                                          <MessageCircle className="text-success" />
                                        </a>
                                      </Button>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => setReceiveInst(i)}><Check /> Receber</Button>
                                  </div>
                                )}
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
          </TabsContent>

          {/* ═════════ CAIXA ═════════ */}
          <TabsContent value="caixa" className="mt-6 space-y-6">
            {cashLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[112px] rounded-2xl" />)}
                </div>
                <Skeleton className="h-64 rounded-2xl" />
              </div>
            ) : cashError ? (
              <Panel><ErrorRetry onRetry={fetchCash} /></Panel>
            ) : cash ? (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard {...rise(1)} featured label="Saldo atual" icon={Wallet}
                    value={formatCurrency(cashCalc.balance)}
                    hint={`Aberto ${daysUntil(cash.date) < 0 ? `em ${formatDate(cash.date)}` : "hoje"} às ${new Date(cash.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}${cash.user ? ` por ${cash.user.name.split(" ")[0]}` : ""}`} />
                  <StatCard {...rise(2)} tone="navy" label="Abertura" icon={Unlock} value={formatCurrency(cash.openingBalance)} />
                  <StatCard {...rise(3)} tone="success" label="Entradas" icon={ArrowDownRight} value={formatCurrency(cashCalc.inflow)} hint="Entradas + suprimentos" />
                  <StatCard {...rise(4)} tone="danger" label="Saídas" icon={ArrowUpRight} value={formatCurrency(cashCalc.outflow)} hint="Saídas + sangrias" />
                </div>

                <Panel
                  {...rise(5)}
                  title="Movimentações"
                  description="Saldo corrente após cada lançamento"
                  icon={Receipt}
                  bodyClassName="p-0"
                  actions={
                    <Button variant="ghost" size="icon" onClick={fetchCash} aria-label="Atualizar">
                      <RefreshCw />
                    </Button>
                  }
                >
                  <div className="grid grid-cols-2 gap-2 px-5 pb-4 sm:grid-cols-4">
                    <Button variant="outline" onClick={() => setMovementType("INFLOW")}><PlusCircle className="text-success" /> Entrada</Button>
                    <Button variant="outline" onClick={() => setMovementType("OUTFLOW")}><MinusCircle className="text-danger" /> Saída</Button>
                    <Button variant="outline" onClick={() => setMovementType("WITHDRAWAL")}><ArrowUpRight className="text-warning" /> Sangria</Button>
                    <Button variant="outline" onClick={() => setMovementType("SUPPLEMENT")}><ArrowDownRight className="text-info" /> Suprimento</Button>
                  </div>
                  <div className="divide-y divide-border border-t border-border">
                    {[...cashCalc.rows].reverse().map((m) => {
                      const meta = MOVEMENT_META[m.type];
                      return (
                        <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="w-14 shrink-0 text-xs text-muted-foreground num">
                            {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                              <span className="truncate text-sm">{m.description || "—"}</span>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={cn("num text-sm font-semibold", meta.sign > 0 ? "text-success" : "text-danger")}>
                              {meta.sign > 0 ? "+" : "−"} {formatCurrency(m.amount)}
                            </p>
                            <p className="num text-xs text-muted-foreground">saldo {formatCurrency(m.balance)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-3 border-t border-border bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Saldo esperado no fechamento: <span className="num font-display text-base font-semibold text-foreground">{formatCurrency(cashCalc.balance)}</span>
                    </p>
                    <Button onClick={() => setCloseCashDialog(true)}><Lock /> Fechar caixa</Button>
                  </div>
                </Panel>
              </>
            ) : (
              <Panel {...rise(1)}>
                <EmptyState
                  icon={Wallet}
                  title="Caixa fechado"
                  description="Abra o caixa informando o valor em dinheiro na gaveta para começar a registrar as movimentações do dia."
                  action={<Button variant="gold" onClick={() => setOpenCashDialog(true)}><Unlock /> Abrir caixa</Button>}
                />
              </Panel>
            )}

            {!cashLoading && cashHistory.length > 0 && (
              <Panel {...rise(6)} title="Últimos fechamentos" icon={Lock} bodyClassName="p-0">
                <div className="divide-y divide-border border-t border-border">
                  {cashHistory.map((r) => {
                    const diff = r.difference ?? 0;
                    return (
                      <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                        <div>
                          <p className="num text-sm font-medium">{formatDate(r.date)}</p>
                          <p className="text-xs text-muted-foreground">{r.user?.name ?? ""}</p>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-xs text-muted-foreground">Sistema / contado</p>
                            <p className="num text-sm">{formatCurrency(r.closingBalance ?? 0)} / {formatCurrency(r.reportedBalance ?? 0)}</p>
                          </div>
                          <StatusPill tone={Math.abs(diff) < 0.01 ? "success" : diff > 0 ? "info" : "danger"}>
                            {Math.abs(diff) < 0.01 ? "Conferido" : `${diff > 0 ? "Sobra" : "Falta"} ${formatCurrency(Math.abs(diff))}`}
                          </StatusPill>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}
          </TabsContent>
        </Tabs>

        {insights.length > 0 && (
          <Panel {...rise(7)} title="Assistente Império" description="Leituras automáticas do seu fluxo de caixa" icon={Sparkles}>
            <div className="grid gap-3 md:grid-cols-2">
              {insights.map((ins) => (
                <InsightCard
                  key={ins.key}
                  icon={ins.icon}
                  tone={ins.tone}
                  title={ins.title}
                  action={
                    ins.action ? (
                      <Button size="sm" variant="link" className="h-auto p-0" onClick={ins.action.onClick}>
                        {ins.action.label} →
                      </Button>
                    ) : undefined
                  }
                >
                  {ins.body}
                </InsightCard>
              ))}
            </div>
          </Panel>
        )}
      </div>

      <NewBillDialog
        open={billDialogOpen}
        onOpenChange={setBillDialogOpen}
        onCreated={fetchBills}
      />

      <PayBillDialog
        bill={payBill}
        cash={cash}
        onClose={() => setPayBill(null)}
        onDone={() => { fetchBills(); fetchCash(); }}
      />

      <ReceiveDialog
        inst={receiveInst}
        cash={cash}
        onClose={() => setReceiveInst(null)}
        onDone={() => { fetchReceivables(); fetchCash(); }}
      />

      <OpenCashDialog open={openCashDialog} onOpenChange={setOpenCashDialog} lastClosing={cashHistory[0]} onDone={fetchCash} />

      {cash && (
        <CloseCashDialog open={closeCashDialog} onOpenChange={setCloseCashDialog} register={cash} expected={cashCalc.balance} onDone={fetchCash} />
      )}

      {cash && (
        <MovementDialog type={movementType} onClose={() => setMovementType(null)} registerId={cash.id} balance={cashCalc.balance} onDone={fetchCash} />
      )}

      <AlertDialog open={!!deleteBill} onOpenChange={(o) => !o && setDeleteBill(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteBill?.description}" ({deleteBill ? formatCurrency(deleteBill.amount) : ""}) será removida da lista de contas a pagar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteBill) return;
                try {
                  await financialService.deleteBill(deleteBill.id);
                  toast({ title: "Conta excluída" });
                  fetchBills();
                } catch (e) {
                  toast({ title: "Não foi possível excluir", description: errMsg(e, ""), variant: "destructive" });
                }
                setDeleteBill(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

function chargeMessage(i: ReceivableItem) {
  const c = customerOf(i);
  const first = c?.name.split(" ")[0] ?? "";
  const overdue = instOverdue(i);
  return `Olá, ${first}! Tudo bem? Aqui é da Óticas Império. ${
    overdue ? "Consta em aberto" : "Passando para lembrar"
  } a ${i.number}ª parcela${i.payment?.salesOrder ? ` da compra #${i.payment.salesOrder.orderNumber}` : ""}, no valor de ${formatCurrency(i.amount)}, com vencimento em ${formatDate(i.dueDate)}. Aceitamos Pix, cartão ou dinheiro. Qualquer dúvida, estamos à disposição!`;
}

/* ── small building blocks ─────────────────────────────────── */

function FilterChips({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; count?: number; danger?: boolean }[];
}) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-gold/50 hover:text-foreground",
            )}
          >
            {o.label}
            {o.count !== undefined && o.count > 0 && (
              <span
                className={cn(
                  "num rounded-full px-1.5 text-[10px]",
                  active ? "bg-white/20" : o.danger ? "bg-danger-soft text-danger" : "bg-muted",
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9 pr-9" />
      {value && (
        <button type="button" onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar busca">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3 border-t border-border px-5 py-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

function ErrorRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Não foi possível carregar"
      description="Verifique sua conexão e tente novamente."
      action={<Button variant="outline" onClick={onRetry}><RefreshCw /> Tentar novamente</Button>}
    />
  );
}

const dialogClass = "w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg";

/* ── New bill ──────────────────────────────────────────────── */

const emptyBill = {
  description: "",
  categoryId: "",
  supplierId: "",
  amount: "",
  dueDate: "",
  isRecurring: false,
  frequency: "MONTHLY" as BillFrequencyCode,
  notes: "",
};

function NewBillDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyBill);
  const [categories, setCategories] = useState<BillCategoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [savingCat, setSavingCat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyBill);
    setErrors({});
    setNewCat(null);
    financialService.getBillCategories().then((r) => setCategories(r.data || [])).catch(() => {
      toast({ title: "Erro ao carregar categorias", variant: "destructive" });
    });
    supplierService.list({ limit: 200 }).then((r) => setSuppliers(r.data || [])).catch(() => { /* optional */ });
  }, [open, toast]);

  const set = <K extends keyof typeof emptyBill>(k: K, v: (typeof emptyBill)[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const createCategory = async () => {
    const name = (newCat || "").trim();
    if (name.length < 2) {
      toast({ title: "Nome da categoria muito curto", variant: "destructive" });
      return;
    }
    setSavingCat(true);
    try {
      const r = await financialService.createBillCategory(name);
      setCategories((p) => [...p, r.data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      set("categoryId", r.data.id);
      setNewCat(null);
      toast({ title: `Categoria "${r.data.name}" criada` });
    } catch (e) {
      toast({ title: "Não foi possível criar a categoria", description: errMsg(e, ""), variant: "destructive" });
    } finally {
      setSavingCat(false);
    }
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    const amount = parseMoneyInput(form.amount);
    if (form.description.trim().length < 2) errs.description = "Informe uma descrição (mín. 2 caracteres)";
    if (!Number.isFinite(amount) || amount <= 0) errs.amount = "Informe um valor maior que zero";
    if (!form.dueDate) errs.dueDate = "Informe o vencimento";
    if (!form.categoryId) errs.categoryId = "Escolha uma categoria";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await financialService.createBill({
        description: form.description.trim(),
        categoryId: form.categoryId,
        supplierId: form.supplierId || undefined,
        amount: Math.round(amount * 100) / 100,
        dueDate: dueInputToIso(form.dueDate),
        isRecurring: form.isRecurring,
        frequency: form.isRecurring ? form.frequency : undefined,
        notes: form.notes.trim() || undefined,
      });
      toast({ title: "Conta cadastrada", description: `${form.description} · ${formatCurrency(amount)}` });
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast({ title: "Erro ao cadastrar conta", description: errMsg(e, ""), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <DialogTitle className="font-display">Nova conta a pagar</DialogTitle>
          <DialogDescription>Registre uma despesa para acompanhar o vencimento.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bill-desc">Descrição *</Label>
            <Input id="bill-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Ex.: Aluguel da loja" />
            {errors.description && <p className="text-xs text-danger">{errors.description}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bill-amount">Valor (R$) *</Label>
              <Input id="bill-amount" inputMode="decimal" className="num" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0,00" />
              {errors.amount && <p className="text-xs text-danger">{errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-due">Vencimento *</Label>
              <Input id="bill-due" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
              {errors.dueDate && <p className="text-xs text-danger">{errors.dueDate}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Categoria *</Label>
              {newCat === null && (
                <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setNewCat("")}>
                  + Nova categoria
                </button>
              )}
            </div>
            {newCat !== null ? (
              <div className="flex gap-2">
                <Input autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Ex.: Marketing"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createCategory(); } }} />
                <Button type="button" onClick={createCategory} disabled={savingCat}><Tag /> {savingCat ? "…" : "Criar"}</Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => setNewCat(null)} aria-label="Cancelar"><X /></Button>
              </div>
            ) : (
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger><SelectValue placeholder={categories.length ? "Selecione" : "Nenhuma categoria — crie uma"} /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {errors.categoryId && <p className="text-xs text-danger">{errors.categoryId}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Fornecedor (opcional)</Label>
            <Select value={form.supplierId || "none"} onValueChange={(v) => set("supplierId", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Conta recorrente</p>
                <p className="text-xs text-muted-foreground">Gerada automaticamente a cada período.</p>
              </div>
              <Switch checked={form.isRecurring} onCheckedChange={(v) => set("isRecurring", v)} />
            </div>
            {form.isRecurring && (
              <div className="mt-3">
                <Select value={form.frequency} onValueChange={(v) => set("frequency", v as BillFrequencyCode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FREQUENCY_LABEL) as BillFrequencyCode[]).map((f) => (
                      <SelectItem key={f} value={f}>{FREQUENCY_LABEL[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bill-notes">Observações</Label>
            <Textarea id="bill-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Salvando…" : "Salvar conta"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Pay bill ──────────────────────────────────────────────── */

function PayBillDialog({ bill, cash, onClose, onDone }: { bill: BillItem | null; cash: CashRegisterItem | null; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [method, setMethod] = useState<PaymentMethodCode>("PIX");
  const [toCash, setToCash] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bill) { setMethod("PIX"); setToCash(true); }
  }, [bill]);

  const submit = async () => {
    if (!bill) return;
    setSaving(true);
    try {
      await financialService.payBill(bill.id, { paymentMethod: method });
      if (method === "CASH" && cash && toCash) {
        try {
          await financialService.addMovement({
            cashRegisterId: cash.id,
            type: "OUTFLOW",
            amount: bill.amount,
            description: `Pagamento: ${bill.description}`,
            billToPayId: bill.id,
          });
        } catch (e) {
          toast({ title: "Conta paga, mas a saída no caixa falhou", description: errMsg(e, ""), variant: "destructive" });
        }
      }
      toast({ title: "Conta paga", description: `${bill.description} · ${formatCurrency(bill.amount)}` });
      onClose();
      onDone();
    } catch (e) {
      toast({ title: "Erro ao registrar pagamento", description: errMsg(e, ""), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!bill} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <DialogTitle className="font-display">Pagar conta</DialogTitle>
          <DialogDescription>{bill?.description}</DialogDescription>
        </DialogHeader>
        {bill && (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="eyebrow">Valor</p>
              <p className="num font-display text-3xl font-semibold">{formatCurrency(bill.amount)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Vencimento {formatDate(bill.dueDate)} · {relativeDue(bill.dueDate)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAY_METHODS.map((m) => (
                  <Button key={m} type="button" variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </Button>
                ))}
              </div>
            </div>
            {method === "CASH" && cash && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={toCash} onCheckedChange={(v) => setToCash(v === true)} />
                Lançar saída de {formatCurrency(bill.amount)} no caixa aberto
              </label>
            )}
            <p className="text-xs text-muted-foreground">A data de pagamento registrada será a de hoje.</p>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}><Check /> {saving ? "Registrando…" : "Confirmar pagamento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Receive installment ───────────────────────────────────── */

function ReceiveDialog({ inst, cash, onClose, onDone }: { inst: ReceivableItem | null; cash: CashRegisterItem | null; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodCode>("PIX");
  const [notes, setNotes] = useState("");
  const [toCash, setToCash] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (inst) {
      setAmount(inst.amount.toFixed(2).replace(".", ","));
      setMethod("PIX");
      setNotes("");
      setToCash(true);
    }
  }, [inst]);

  const submit = async () => {
    if (!inst) return;
    const paid = parseMoneyInput(amount);
    if (!Number.isFinite(paid) || paid <= 0) {
      toast({ title: "Informe o valor recebido", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const value = Math.round(paid * 100) / 100;
      await financialService.payInstallment(inst.id, {
        paidAmount: value,
        paymentMethod: method,
        notes: notes.trim() || undefined,
      });
      if (method === "CASH" && cash && toCash) {
        try {
          await financialService.addMovement({
            cashRegisterId: cash.id,
            type: "INFLOW",
            amount: value,
            description: `Parcela ${inst.number}ª · ${customerOf(inst)?.name ?? "cliente"}`,
            salesOrderId: inst.payment?.salesOrder?.id,
          });
        } catch (e) {
          toast({ title: "Parcela recebida, mas a entrada no caixa falhou", description: errMsg(e, ""), variant: "destructive" });
        }
      }
      toast({ title: "Parcela recebida", description: `${customerOf(inst)?.name ?? ""} · ${formatCurrency(value)}` });
      onClose();
      onDone();
    } catch (e) {
      toast({ title: "Erro ao registrar recebimento", description: errMsg(e, ""), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const paidNum = parseMoneyInput(amount);
  const diff = inst && Number.isFinite(paidNum) ? paidNum - inst.amount : 0;

  return (
    <Dialog open={!!inst} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <DialogTitle className="font-display">Receber parcela</DialogTitle>
          <DialogDescription>
            {inst ? customerOf(inst)?.name ?? "Cliente" : ""} · {inst?.number}ª parcela
            {inst?.payment?.salesOrder ? ` · Venda #${inst.payment.salesOrder.orderNumber}` : ""}
          </DialogDescription>
        </DialogHeader>
        {inst && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4">
              <div>
                <p className="eyebrow">Valor da parcela</p>
                <p className="num font-display text-xl font-semibold">{formatCurrency(inst.amount)}</p>
              </div>
              <div>
                <p className="eyebrow">Vencimento</p>
                <p className="num text-sm font-medium">{formatDate(inst.dueDate)}</p>
                <p className={cn("text-xs", instOverdue(inst) ? "text-danger" : "text-muted-foreground")}>{relativeDue(inst.dueDate)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-amount">Valor recebido (R$)</Label>
              <Input id="rec-amount" inputMode="decimal" className="num" value={amount} onChange={(e) => setAmount(e.target.value)} />
              {Math.abs(diff) >= 0.01 && (
                <p className={cn("text-xs", diff > 0 ? "text-info" : "text-warning")}>
                  {diff > 0 ? `${formatCurrency(diff)} acima do valor (juros/multa)` : `${formatCurrency(-diff)} abaixo do valor da parcela`}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAY_METHODS.map((m) => (
                  <Button key={m} type="button" variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </Button>
                ))}
              </div>
            </div>
            {method === "CASH" && cash && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={toCash} onCheckedChange={(v) => setToCash(v === true)} />
                Lançar entrada no caixa aberto
              </label>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="rec-notes">Observações</Label>
              <Textarea id="rec-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}><Check /> {saving ? "Registrando…" : "Confirmar recebimento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Cash dialogs ──────────────────────────────────────────── */

function OpenCashDialog({ open, onOpenChange, lastClosing, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; lastClosing?: CashRegisterItem; onDone: () => void }) {
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setValue(""); setNotes(""); }
  }, [open]);

  const submit = async () => {
    const n = parseMoneyInput(value);
    if (!Number.isFinite(n) || n < 0) {
      toast({ title: "Informe o valor de abertura", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await financialService.openCashRegister({ openingBalance: Math.round(n * 100) / 100, notes: notes.trim() || undefined });
      toast({ title: "Caixa aberto", description: `Saldo inicial ${formatCurrency(n)}` });
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast({ title: "Erro ao abrir o caixa", description: errMsg(e, ""), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const suggested = lastClosing?.reportedBalance ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <DialogTitle className="font-display">Abrir caixa</DialogTitle>
          <DialogDescription>Conte o dinheiro da gaveta e informe o valor inicial.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="open-bal">Valor de abertura (R$)</Label>
            <Input id="open-bal" inputMode="decimal" className="num" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" autoFocus />
            {suggested != null && (
              <button type="button" className="text-xs font-semibold text-primary hover:underline"
                onClick={() => setValue(suggested.toFixed(2).replace(".", ","))}>
                Usar valor contado no último fechamento ({formatCurrency(suggested)})
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="open-notes">Observações</Label>
            <Textarea id="open-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="gold" onClick={submit} disabled={saving}><Unlock /> {saving ? "Abrindo…" : "Abrir caixa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseCashDialog({ open, onOpenChange, register, expected, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; register: CashRegisterItem; expected: number; onDone: () => void }) {
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setValue(""); setNotes(""); }
  }, [open]);

  const counted = parseMoneyInput(value);
  const diff = Number.isFinite(counted) ? counted - expected : null;

  const submit = async () => {
    if (!Number.isFinite(counted) || counted < 0) {
      toast({ title: "Informe o valor contado no caixa", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const r = await financialService.closeCashRegister(
        { reportedBalance: Math.round(counted * 100) / 100, notes: notes.trim() || undefined },
        register.id,
      );
      const d = r.data?.difference ?? 0;
      toast({
        title: "Caixa fechado",
        description: Math.abs(d) < 0.01 ? "Valores conferidos, sem diferença." : `${d > 0 ? "Sobra" : "Falta"} de ${formatCurrency(Math.abs(d))}.`,
      });
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast({ title: "Erro ao fechar o caixa", description: errMsg(e, ""), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <DialogTitle className="font-display">Fechar caixa</DialogTitle>
          <DialogDescription>Conte o dinheiro da gaveta e compare com o saldo do sistema.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4">
            <div>
              <p className="eyebrow">Esperado</p>
              <p className="num font-display text-xl font-semibold">{formatCurrency(expected)}</p>
            </div>
            <div>
              <p className="eyebrow">Diferença</p>
              <p className={cn(
                "num font-display text-xl font-semibold",
                diff === null ? "text-muted-foreground" : Math.abs(diff) < 0.01 ? "text-success" : diff > 0 ? "text-info" : "text-danger",
              )}>
                {diff === null ? "—" : `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${formatCurrency(Math.abs(diff))}`}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="close-bal">Valor contado (R$)</Label>
            <Input id="close-bal" inputMode="decimal" className="num" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" autoFocus />
          </div>
          {diff !== null && Math.abs(diff) >= 0.01 && (
            <p className="text-xs text-muted-foreground">
              {diff > 0 ? "Sobra no caixa" : "Falta no caixa"} — registre o motivo nas observações.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="close-notes">Observações</Label>
            <Textarea id="close-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}><Lock /> {saving ? "Fechando…" : "Fechar caixa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({
  type, onClose, registerId, balance, onDone,
}: {
  type: Exclude<CashMovementTypeCode, "OPENING"> | null;
  onClose: () => void;
  registerId: string;
  balance: number;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (type) { setValue(""); setDescription(""); }
  }, [type]);

  const help: Record<Exclude<CashMovementTypeCode, "OPENING">, string> = {
    INFLOW: "Dinheiro que entrou no caixa (venda avulsa, recebimento).",
    OUTFLOW: "Despesa paga com dinheiro do caixa.",
    WITHDRAWAL: "Retirada de dinheiro da gaveta (ex.: depósito no banco).",
    SUPPLEMENT: "Reforço de troco colocado na gaveta.",
  };

  const submit = async () => {
    if (!type) return;
    const n = parseMoneyInput(value);
    if (!Number.isFinite(n) || n <= 0) {
      toast({ title: "Informe um valor maior que zero", variant: "destructive" });
      return;
    }
    const outflow = MOVEMENT_META[type].sign < 0;
    if (outflow && n > balance + 0.001) {
      toast({ title: "Valor maior que o saldo do caixa", description: `Saldo atual: ${formatCurrency(balance)}`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await financialService.addMovement({
        cashRegisterId: registerId,
        type,
        amount: Math.round(n * 100) / 100,
        description: description.trim() || undefined,
      });
      toast({ title: "Movimentação registrada", description: `${MOVEMENT_META[type].label} de ${formatCurrency(n)}` });
      onClose();
      onDone();
    } catch (e) {
      toast({ title: "Erro ao registrar movimentação", description: errMsg(e, ""), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!type} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <DialogTitle className="font-display">{type ? MOVEMENT_META[type].label : ""}</DialogTitle>
          <DialogDescription>{type ? help[type] : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mov-val">Valor (R$)</Label>
            <Input id="mov-val" inputMode="decimal" className="num" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" autoFocus />
            <p className="num text-xs text-muted-foreground">Saldo atual: {formatCurrency(balance)}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mov-desc">Descrição</Label>
            <Input id="mov-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Troco, café, depósito" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Registrando…" : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
