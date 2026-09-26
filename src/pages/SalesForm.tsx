import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowLeft, Banknote, Check, ChevronsUpDown, CircleDollarSign, ClipboardList, Eye,
  FileText, Glasses, Loader2, Package, Percent, Plus, Receipt, Search, ShieldAlert, ShoppingCart, Sparkles,
  Trash2, UserPlus, UserRound, Wrench, X,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, InitialsAvatar, InsightCard, PageHeader, Panel, rise } from "@/components/imperio";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import api from "@/services/api";
import customerService from "@/services/customer.service";
import productService from "@/services/product.service";
import salesService, {
  PAYMENT_METHOD_LABELS, type ApiList, type CreateSalePayload, type PaymentMethodCode, type SaleCustomer,
  type SalePrescription,
} from "@/services/sales.service";

/* ── Local types ─────────────────────────────────────────── */
/** Response of POST /products/validate-price (backend productService.validatePrice). */
interface PriceValidation {
  valid: boolean;
  minimumPrice: number;
  sellingPrice: number;
  requestedPrice: number;
  difference: number;
}

interface ApiProduct {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  barcode?: string | null;
  stock: number;
  sellingPrice: number;
  minimumPrice: number;
  totalCost: number;
  category?: { id: string; name: string; type: string } | null;
}

type DiscountMode = "BRL" | "PCT";

interface CartItem {
  key: string;
  productId?: string;
  name: string;
  detail?: string;
  unitPrice: number;
  quantity: number;
  discountValue: number;
  discountMode: DiscountMode;
  costPrice: number;
  minimumPrice: number;
  sellingPrice: number;
  stock?: number;
  categoryType?: string;
  isService: boolean;
}

interface PaymentLine {
  key: string;
  method: PaymentMethodCode;
  amount: number;
  auto: boolean;
  cardBrand?: string;
  cardInstallments?: number;
  installmentCount?: number;
  interestRate?: number;
  justification?: string;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const uid = () => Math.random().toString(36).slice(2, 10);
const CARD_BRANDS = ["Visa", "Mastercard", "Elo", "American Express", "Hipercard"];
const METHOD_ORDER: PaymentMethodCode[] = ["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "STORE_CREDIT", "INSURANCE", "EXCHANGE"];

function discountOf(gross: number, value: number, mode: DiscountMode) {
  const raw = mode === "PCT" ? (gross * Math.min(Math.max(value, 0), 100)) / 100 : Math.max(value, 0);
  return r2(Math.min(raw, gross));
}

function lineOf(it: CartItem) {
  const gross = r2(it.unitPrice * it.quantity);
  const discount = discountOf(gross, it.discountValue, it.discountMode);
  const subtotal = r2(gross - discount);
  const effectiveUnit = it.quantity > 0 ? subtotal / it.quantity : 0;
  const belowMin = !it.isService && effectiveUnit < it.minimumPrice - 0.005;
  const overStock = !it.isService && it.stock !== undefined && it.quantity > it.stock;
  return { gross, discount, subtotal, effectiveUnit, belowMin, overStock };
}

const fmtDiopter = (v?: number | null) =>
  v === null || v === undefined ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}`;

/** Numeric input that keeps the user's typing (commas, empty) while exposing a number. */
function NumInput({
  value, onChange, className, min = 0, max, step = "0.01", placeholder, id, disabled, integer,
}: {
  value: number; onChange: (n: number) => void; className?: string; min?: number; max?: number;
  step?: string; placeholder?: string; id?: string; disabled?: boolean; integer?: boolean;
}) {
  const [text, setText] = useState(value ? String(value).replace(".", ",") : "");
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value ? String(value).replace(".", ",") : "");
    }
  }, [value]);
  return (
    <Input
      id={id}
      inputMode={integer ? "numeric" : "decimal"}
      placeholder={placeholder ?? "0"}
      disabled={disabled}
      className={cn("num", className)}
      value={text}
      step={step}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d,.-]/g, "");
        setText(raw);
        let n = parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0;
        if (!raw.includes(",") && raw.split(".").length === 2) n = parseFloat(raw) || 0; // "12.5" typed with a dot
        if (integer) n = Math.trunc(n);
        n = Math.max(min, n);
        if (max !== undefined) n = Math.min(max, n);
        last.current = n;
        onChange(n);
      }}
    />
  );
}

function DiscountToggle({ mode, onChange }: { mode: DiscountMode; onChange: (m: DiscountMode) => void }) {
  return (
    <div className="flex h-10 shrink-0 overflow-hidden rounded-md border border-input text-xs font-semibold">
      {(["BRL", "PCT"] as DiscountMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn("px-2.5 transition-colors", mode === m ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")}
        >
          {m === "BRL" ? "R$" : "%"}
        </button>
      ))}
    </div>
  );
}

function StepTitle({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={cn(
          "num flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          done ? "bg-success text-white" : "bg-primary text-gold",
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      {title}
    </span>
  );
}

export default function SalesForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const { user, isAdmin } = useAuth();

  /* ── 1. Cliente ── */
  const [customer, setCustomer] = useState<SaleCustomer | null>(null);
  const [custOpen, setCustOpen] = useState(false);
  const [custQuery, setCustQuery] = useState("");
  const [custDebounced, setCustDebounced] = useState("");
  const [sellerId, setSellerId] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => setCustDebounced(custQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [custQuery]);

  const customersQuery = useQuery({
    queryKey: ["sales-form", "customers", custDebounced],
    queryFn: () => customerService.getAll(custDebounced || undefined, 1, 8),
    enabled: custOpen,
  });

  // Pre-select a customer from ?customerId=
  const presetCustomerId = params.get("customerId") || params.get("cliente");
  useEffect(() => {
    if (!presetCustomerId) return;
    customerService.getById(presetCustomerId)
      .then((res) => res?.data && setCustomer(res.data as unknown as SaleCustomer))
      .catch(() => toast.error("Cliente informado não foi encontrado."));
  }, [presetCustomerId]);

  useEffect(() => { if (user?.id && !sellerId) setSellerId(user.id); }, [user?.id, sellerId]);

  const sellersQuery = useQuery({
    queryKey: ["sales-form", "sellers"],
    queryFn: () => api.get<ApiList<{ id: string; name: string; role: string; isActive: boolean }>>("/users?limit=100"),
    enabled: isAdmin,
  });
  const sellers = (sellersQuery.data?.data ?? []).filter((u) => u.isActive && u.role !== "VIEWER");

  /* ── 2. Receita ── */
  const [prescriptionId, setPrescriptionId] = useState<string | undefined>();
  const prescriptionsQuery = useQuery({
    queryKey: ["sales-form", "prescriptions", customer?.id],
    queryFn: () => api.get<{ success: boolean; data: SalePrescription[] }>(`/prescriptions/customer/${customer!.id}`),
    enabled: !!customer?.id,
  });
  const prescriptions = prescriptionsQuery.data?.data ?? [];
  useEffect(() => { setPrescriptionId(undefined); }, [customer?.id]);
  // Pre-select the most recent valid prescription
  useEffect(() => {
    if (prescriptionId || !prescriptions.length) return;
    const valid = prescriptions.find((p) => new Date(p.validity) >= new Date());
    if (valid) setPrescriptionId(valid.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescriptionsQuery.data]);
  const selectedPrescription = prescriptions.find((p) => p.id === prescriptionId);

  /* ── 3. Itens ── */
  const [cart, setCart] = useState<CartItem[]>([]);
  const [prodOpen, setProdOpen] = useState(false);
  const [prodQuery, setProdQuery] = useState("");
  const [prodDebounced, setProdDebounced] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [servicePrice, setServicePrice] = useState(0);
  const [validations, setValidations] = useState<Record<string, PriceValidation>>({});

  useEffect(() => {
    const t = setTimeout(() => setProdDebounced(prodQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [prodQuery]);

  const productsQuery = useQuery({
    queryKey: ["sales-form", "products", prodDebounced],
    queryFn: () => api.get<ApiList<ApiProduct>>(`/products?limit=10${prodDebounced ? `&search=${encodeURIComponent(prodDebounced)}` : ""}`),
    enabled: prodOpen,
  });

  const addProduct = (p: ApiProduct) => {
    if (p.stock <= 0) return toast.error(`${p.name} está sem estoque.`);
    const existing = cart.find((c) => c.productId === p.id);
    if (existing) {
      if (existing.quantity + 1 > p.stock) return toast.error(`Estoque disponível de ${p.name}: ${p.stock}.`);
      setCart((c) => c.map((it) => (it.key === existing.key ? { ...it, quantity: it.quantity + 1 } : it)));
      toast.success(`Quantidade de ${p.name} aumentada.`);
    } else {
      setCart((c) => [
        ...c,
        {
          key: uid(),
          productId: p.id,
          name: p.name,
          detail: [p.brand, p.model, p.color].filter(Boolean).join(" · ") || p.category?.name || undefined,
          unitPrice: p.sellingPrice,
          quantity: 1,
          discountValue: 0,
          discountMode: "BRL",
          costPrice: p.totalCost,
          minimumPrice: p.minimumPrice,
          sellingPrice: p.sellingPrice,
          stock: p.stock,
          categoryType: p.category?.type,
          isService: false,
        },
      ]);
    }
    setProdOpen(false);
    setProdQuery("");
  };

  const addService = () => {
    if (!serviceDesc.trim()) return toast.error("Descreva o serviço.");
    setCart((c) => [
      ...c,
      {
        key: uid(), name: serviceDesc.trim(), unitPrice: r2(servicePrice), quantity: 1, discountValue: 0,
        discountMode: "BRL", costPrice: 0, minimumPrice: 0, sellingPrice: servicePrice, isService: true,
      },
    ]);
    setServiceDesc("");
    setServicePrice(0);
  };

  const patchItem = (key: string, patch: Partial<CartItem>) =>
    setCart((c) => c.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const removeItem = (key: string) => setCart((c) => c.filter((it) => it.key !== key));

  // Confirm minimum prices with the backend (/products/validate-price) once the seller stops typing.
  const priceSignature = cart
    .filter((it) => it.productId)
    .map((it) => `${it.productId}:${r2(lineOf(it).effectiveUnit)}`)
    .join("|");
  useEffect(() => {
    const t = setTimeout(() => {
      cart.forEach((it) => {
        if (!it.productId) return;
        const price = r2(lineOf(it).effectiveUnit);
        const vKey = `${it.productId}:${price}`;
        if (validations[vKey] || price >= it.sellingPrice) return;
        productService.validatePrice(it.productId, price)
          .then((res) => res?.data && setValidations((v) => ({ ...v, [vKey]: res.data })))
          .catch(() => undefined);
      });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceSignature]);

  const isBelowMin = (it: CartItem) => {
    if (it.isService || !it.productId) return false;
    const price = r2(lineOf(it).effectiveUnit);
    const v = validations[`${it.productId}:${price}`];
    return v ? !v.valid : lineOf(it).belowMin;
  };

  /* ── Order discount ── */
  const [orderDiscValue, setOrderDiscValue] = useState(0);
  const [orderDiscMode, setOrderDiscMode] = useState<DiscountMode>("BRL");

  /* ── Totals (mirror backend salesService.create) ── */
  const totals = useMemo(() => {
    let gross = 0, itemDiscounts = 0, subtotal = 0, profit = 0;
    for (const it of cart) {
      const l = lineOf(it);
      gross += l.gross;
      itemDiscounts += l.discount;
      subtotal += l.subtotal;
      profit += l.subtotal - it.costPrice * it.quantity;
    }
    subtotal = r2(subtotal);
    const orderDiscount = discountOf(subtotal, orderDiscValue, orderDiscMode);
    const total = r2(subtotal - orderDiscount);
    profit = r2(profit - orderDiscount);
    return { gross: r2(gross), itemDiscounts: r2(itemDiscounts), subtotal, orderDiscount, total, profit, margin: total > 0 ? (profit / total) * 100 : 0 };
  }, [cart, orderDiscValue, orderDiscMode]);

  /* ── 4. Pagamento ── */
  const [payments, setPayments] = useState<PaymentLine[]>([{ key: uid(), method: "PIX", amount: 0, auto: true }]);
  const paid = r2(payments.reduce((s, p) => s + (p.amount || 0), 0));
  const remaining = r2(totals.total - paid);
  const paymentsMatch = Math.abs(paid - totals.total) <= 0.01; // same tolerance as the backend

  // Keep a single untouched payment line in sync with the total.
  useEffect(() => {
    setPayments((ps) => (ps.length === 1 && ps[0].auto && ps[0].amount !== totals.total ? [{ ...ps[0], amount: totals.total }] : ps));
  }, [totals.total]);

  const patchPayment = (key: string, patch: Partial<PaymentLine>) =>
    setPayments((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const addPayment = () =>
    setPayments((ps) => [
      ...ps.map((p) => ({ ...p, auto: false })),
      { key: uid(), method: "CASH", amount: Math.max(0, r2(totals.total - ps.reduce((s, p) => s + p.amount, 0))), auto: false },
    ]);
  const removePayment = (key: string) => setPayments((ps) => (ps.length > 1 ? ps.filter((p) => p.key !== key) : ps));

  /* ── 5. Observações ── */
  const [notes, setNotes] = useState("");

  /* ── Validation ── */
  const belowMinItems = cart.filter(isBelowMin);
  const blockers = useMemo(() => {
    const b: string[] = [];
    if (!customer) b.push("Selecione o cliente.");
    if (!sellerId) b.push("Defina o vendedor.");
    if (!cart.length) b.push("Adicione ao menos um item.");
    cart.forEach((it) => {
      if (it.quantity < 1) b.push(`Quantidade inválida em “${it.name}”.`);
      if (lineOf(it).overStock) b.push(`Estoque insuficiente de “${it.name}” (disponível: ${it.stock}).`);
      if (it.isService && it.unitPrice <= 0) b.push(`Informe o valor do serviço “${it.name}”.`);
    });
    if (!isAdmin && belowMinItems.length) b.push("Há itens abaixo do preço mínimo — apenas administradores podem autorizar.");
    if (cart.length && !paymentsMatch) {
      b.push(remaining > 0 ? `Faltam ${formatCurrency(remaining)} nos pagamentos.` : `Pagamentos excedem o total em ${formatCurrency(-remaining)}.`);
    }
    payments.forEach((p) => {
      if (p.amount <= 0 && totals.total > 0) b.push(`Informe o valor do pagamento em ${PAYMENT_METHOD_LABELS[p.method]}.`);
      if (p.method === "EXCHANGE" && !p.justification?.trim()) b.push("Troca/cortesia exige justificativa.");
      if (p.method === "STORE_CREDIT" && !p.installmentCount) b.push("Defina o número de parcelas do crediário.");
    });
    return Array.from(new Set(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, sellerId, cart, isAdmin, belowMinItems.length, paymentsMatch, remaining, payments, totals.total]);

  /* ── Submit ── */
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const buildPayload = (): CreateSalePayload => ({
    customerId: customer!.id,
    prescriptionId: prescriptionId || undefined,
    sellerId,
    discountAmount: totals.orderDiscount > 0 ? totals.orderDiscount : undefined,
    discountPercent: totals.orderDiscount > 0 && orderDiscMode === "PCT" ? orderDiscValue : undefined,
    notes: notes.trim() || undefined,
    items: cart.map((it) => {
      const l = lineOf(it);
      return {
        productId: it.productId || undefined,
        description: it.isService ? it.name : undefined,
        unitPrice: r2(it.unitPrice),
        quantity: it.quantity,
        discountAmount: l.discount,
        discountPercent: l.discount > 0 && it.discountMode === "PCT" ? it.discountValue : undefined,
      };
    }),
    payments: payments.map((p) => ({
      method: p.method,
      amount: r2(p.amount),
      cardBrand: p.method === "CREDIT_CARD" || p.method === "DEBIT_CARD" ? p.cardBrand || undefined : undefined,
      cardInstallments: p.method === "CREDIT_CARD" ? p.cardInstallments || 1 : undefined,
      installmentCount: p.method === "STORE_CREDIT" ? p.installmentCount : undefined,
      interestRate: p.method === "STORE_CREDIT" && p.interestRate ? p.interestRate : undefined,
      justification: (p.method === "EXCHANGE" || p.method === "INSURANCE") && p.justification?.trim() ? p.justification.trim() : undefined,
    })),
  });

  const submit = async () => {
    if (blockers.length) return toast.error(blockers[0]);
    setSubmitting(true);
    try {
      const res = await salesService.create(buildPayload());
      toast.success(`Venda registrada! OS nº ${res.data.orderNumber}.`);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      navigate(`/vendas/${res.data.id}`);
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível registrar a venda.");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const handleFinish = () => {
    if (blockers.length) return toast.error(blockers[0]);
    if (belowMinItems.length && isAdmin) return setConfirmOpen(true);
    submit();
  };

  /* ── Assistente Império ── */
  const insights = useMemo(() => {
    const list: { key: string; tone: "success" | "warning" | "info" | "danger" | "gold"; icon: typeof Sparkles; title: string; body: string }[] = [];
    if (selectedPrescription && new Date(selectedPrescription.validity) < new Date()) {
      list.push({ key: "rx", tone: "warning", icon: FileText, title: "Receita vencida selecionada", body: `Venceu em ${formatDate(selectedPrescription.validity)}. Sugira um novo exame antes de pedir as lentes.` });
    }
    const types = new Set(cart.map((c) => c.categoryType));
    if (types.has("FRAMES_PRESCRIPTION") && !types.has("OPHTHALMIC_LENSES")) {
      list.push({ key: "lens", tone: "info", icon: Glasses, title: "Armação de grau sem lentes", body: "A venda tem armação de grau, mas nenhuma lente oftálmica. Confirme se o cliente trouxe as lentes." });
    }
    if (types.has("OPHTHALMIC_LENSES") && customer && !prescriptionId) {
      list.push({ key: "norx", tone: "warning", icon: FileText, title: "Lentes sem receita vinculada", body: "Vincule a receita para que o pedido ao laboratório saia com o grau correto." });
    }
    if (belowMinItems.length) {
      list.push({ key: "min", tone: "danger", icon: ShieldAlert, title: `${belowMinItems.length} item(ns) abaixo do preço mínimo`, body: isAdmin ? "Você pode autorizar como administradora; a liberação fica registrada na auditoria." : "Reduza o desconto ou peça autorização a um administrador." });
    }
    if (isAdmin && cart.length && totals.total > 0 && totals.margin < 25) {
      list.push({ key: "margin", tone: "warning", icon: Percent, title: `Margem estimada de ${totals.margin.toFixed(0)}%`, body: "Abaixo de 25%. Revise os descontos concedidos." });
    }
    const credit = payments.find((p) => p.method === "STORE_CREDIT" && (p.installmentCount ?? 0) > 6);
    if (credit) {
      list.push({ key: "credit", tone: "info", icon: Banknote, title: `Crediário em ${credit.installmentCount}x`, body: "Parcelamentos longos aumentam o risco de inadimplência. Considere pedir uma entrada em PIX ou dinheiro." });
    }
    return list;
  }, [selectedPrescription, cart, customer, prescriptionId, belowMinItems.length, isAdmin, totals, payments]);

  /* ── Summary panel (shared) ── */
  const SummaryRows = (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">Itens ({cart.reduce((s, i) => s + i.quantity, 0)})</span><span className="num">{formatCurrency(totals.gross)}</span></div>
      {totals.itemDiscounts > 0 && (
        <div className="flex justify-between"><span className="text-muted-foreground">Descontos nos itens</span><span className="num text-danger">− {formatCurrency(totals.itemDiscounts)}</span></div>
      )}
      {totals.orderDiscount > 0 && (
        <div className="flex justify-between"><span className="text-muted-foreground">Desconto geral</span><span className="num text-danger">− {formatCurrency(totals.orderDiscount)}</span></div>
      )}
      <div className="gold-rule !my-3" />
      <div className="flex items-end justify-between">
        <span className="font-semibold">Total</span>
        <span className="num font-display text-2xl font-semibold">{formatCurrency(totals.total)}</span>
      </div>
      <div className="flex justify-between"><span className="text-muted-foreground">Pago</span><span className="num">{formatCurrency(paid)}</span></div>
      {cart.length > 0 && !paymentsMatch && (
        <div className="flex justify-between font-semibold text-danger">
          <span>{remaining > 0 ? "Falta" : "Excedente"}</span><span className="num">{formatCurrency(Math.abs(remaining))}</span>
        </div>
      )}
      {isAdmin && cart.length > 0 && (
        <div className="mt-2 flex justify-between rounded-lg bg-success-soft px-3 py-2 text-success">
          <span className="text-xs font-semibold">Lucro estimado</span>
          <span className="num text-sm font-semibold">{formatCurrency(totals.profit)} · {totals.margin.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );

  const customerDone = !!customer;
  const itemsDone = cart.length > 0 && cart.every((it) => !lineOf(it).overStock);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Vendas / OS"
          title="Nova venda"
          description="Cliente, receita, itens e pagamento em uma única tela."
          icon={ShoppingCart}
          actions={
            <Button variant="outline" onClick={() => navigate("/vendas")}>
              <ArrowLeft className="h-4 w-4" /> Voltar às vendas
            </Button>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            {/* 1. Cliente */}
            <Panel title={<StepTitle n={1} title="Cliente" done={customerDone} />} {...rise(1)}
              actions={
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/clientes/novo" target="_blank" rel="noopener"><UserPlus className="h-4 w-4" /> Cadastrar cliente</Link>
                </Button>
              }
            >
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  {customer ? (
                    <div className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold-soft/40 p-3">
                      <InitialsAvatar name={customer.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{customer.name}</p>
                        <p className="num truncate text-xs text-muted-foreground">
                          {[customer.phone, customer.cpf && `CPF ${customer.cpf}`].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setCustomer(null); setCustOpen(true); }}>Trocar</Button>
                    </div>
                  ) : (
                    <Popover open={custOpen} onOpenChange={setCustOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={custOpen} className="h-11 w-full justify-between font-normal text-muted-foreground">
                          <span className="flex items-center gap-2"><Search className="h-4 w-4" /> Buscar por nome, CPF ou telefone…</span>
                          <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput value={custQuery} onValueChange={setCustQuery} placeholder="Digite para buscar…" />
                          <CommandList>
                            {customersQuery.isFetching && !customersQuery.data ? (
                              <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                            ) : (
                              <>
                                <CommandEmpty>
                                  <p className="text-sm">Nenhum cliente encontrado.</p>
                                  <Link to="/clientes/novo" target="_blank" rel="noopener" className="mt-1 inline-block text-xs font-semibold text-primary hover:underline">Cadastrar novo cliente</Link>
                                </CommandEmpty>
                                <CommandGroup>
                                  {(customersQuery.data?.data ?? []).map((c) => (
                                    <CommandItem
                                      key={c.id}
                                      value={c.id}
                                      onSelect={() => { setCustomer(c as unknown as SaleCustomer); setCustOpen(false); setCustQuery(""); }}
                                      className="gap-3"
                                    >
                                      <InitialsAvatar name={c.name} size="sm" />
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{c.name}</p>
                                        <p className="num truncate text-xs text-muted-foreground">{[c.phone, c.cpf].filter(Boolean).join(" · ")}</p>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Vendedor *</Label>
                  {isAdmin ? (
                    <Select value={sellerId} onValueChange={setSellerId}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {user && !sellers.some((s) => s.id === user.id) && <SelectItem value={user.id}>{user.name}</SelectItem>}
                        {sellers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex h-11 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm">
                      <UserRound className="h-4 w-4 text-muted-foreground" /> {user?.name}
                    </div>
                  )}
                </div>
              </div>
            </Panel>

            {/* 2. Receita */}
            <Panel title={<StepTitle n={2} title="Receita" done={!!prescriptionId} />} description="Opcional — vincula o grau à OS e ao pedido do laboratório." {...rise(2)}>
              {!customer ? (
                <p className="text-sm text-muted-foreground">Selecione o cliente para ver as receitas cadastradas.</p>
              ) : prescriptionsQuery.isLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
              ) : prescriptionsQuery.isError ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">
                  Erro ao carregar receitas.
                  <Button size="sm" variant="outline" onClick={() => prescriptionsQuery.refetch()}>Tentar novamente</Button>
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted-foreground">Nenhuma receita cadastrada para {customer.name.split(" ")[0]}.</p>
                  <Button size="sm" variant="outline" asChild><Link to="/receitas" target="_blank" rel="noopener"><Plus className="h-4 w-4" /> Cadastrar receita</Link></Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPrescriptionId(undefined)}
                    className={cn("rounded-xl border p-3 text-left text-sm transition-colors", !prescriptionId ? "border-primary bg-accent" : "border-border hover:border-gold/50")}
                  >
                    <p className="font-medium">Sem receita</p>
                    <p className="text-xs text-muted-foreground">Venda de produto pronto ou serviço.</p>
                  </button>
                  {prescriptions.map((p) => {
                    const expired = new Date(p.validity) < new Date();
                    const active = p.id === prescriptionId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPrescriptionId(p.id)}
                        className={cn("rounded-xl border p-3 text-left transition-colors", active ? "border-primary bg-accent ring-1 ring-primary" : "border-border hover:border-gold/50")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{p.doctor ? `Dr(a). ${p.doctor}` : "Médico não informado"}</p>
                            <p className="num text-xs text-muted-foreground">{formatDate(p.date)} · validade {formatDate(p.validity)}</p>
                          </div>
                          <Badge variant={expired ? "danger" : "success"}>{expired ? "Vencida" : "Válida"}</Badge>
                        </div>
                        <div className="num mt-2 grid grid-cols-[auto_1fr_1fr_1fr] gap-x-3 text-xs">
                          <span className="font-semibold text-muted-foreground">OD</span>
                          <span>{fmtDiopter(p.odSpherical)}</span><span>{fmtDiopter(p.odCylindrical)}</span><span>{p.odAxis ?? "—"}°</span>
                          <span className="font-semibold text-muted-foreground">OE</span>
                          <span>{fmtDiopter(p.oeSphrical)}</span><span>{fmtDiopter(p.oeCylindrical)}</span><span>{p.oeAxis ?? "—"}°</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Panel>

            {/* 3. Itens */}
            <Panel title={<StepTitle n={3} title="Itens" done={itemsDone} />} description="Produtos do estoque e serviços avulsos." {...rise(3)}>
              <div className="space-y-4">
                <Popover open={prodOpen} onOpenChange={setProdOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-11 w-full justify-between font-normal text-muted-foreground">
                      <span className="flex items-center gap-2"><Package className="h-4 w-4" /> Adicionar produto — nome, marca ou código</span>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[300px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput value={prodQuery} onValueChange={setProdQuery} placeholder="Buscar produto…" />
                      <CommandList>
                        {productsQuery.isFetching && !productsQuery.data ? (
                          <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                        ) : (
                          <>
                            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                            <CommandGroup>
                              {(productsQuery.data?.data ?? []).map((p) => (
                                <CommandItem key={p.id} value={p.id} onSelect={() => addProduct(p)} disabled={p.stock <= 0} className="gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{p.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {[p.brand, p.model, p.category?.name].filter(Boolean).join(" · ")}
                                    </p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="num text-sm font-semibold">{formatCurrency(p.sellingPrice)}</p>
                                    <p className={cn("num text-[11px]", p.stock <= 0 ? "text-danger" : "text-muted-foreground")}>
                                      {p.stock <= 0 ? "Sem estoque" : `${p.stock} em estoque`}
                                    </p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Service line */}
                <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="svc-desc" className="flex items-center gap-1.5 text-xs"><Wrench className="h-3.5 w-3.5" /> Serviço avulso</Label>
                    <Input id="svc-desc" value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} placeholder="Ex.: ajuste de armação, montagem, conserto…"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())} />
                  </div>
                  <div className="space-y-1.5 sm:w-32">
                    <Label htmlFor="svc-price" className="text-xs">Valor (R$)</Label>
                    <NumInput id="svc-price" value={servicePrice} onChange={setServicePrice} />
                  </div>
                  <Button variant="secondary" onClick={addService} disabled={!serviceDesc.trim()}><Plus className="h-4 w-4" /> Adicionar</Button>
                </div>

                {cart.length === 0 ? (
                  <EmptyState icon={Glasses} title="Nenhum item na venda" description="Busque um produto acima ou adicione um serviço." className="py-8" />
                ) : (
                  <ul className="space-y-3">
                    {cart.map((it) => {
                      const l = lineOf(it);
                      const below = isBelowMin(it);
                      return (
                        <li key={it.key} className={cn("rounded-xl border p-3 sm:p-4", below ? "border-danger/40 bg-danger-soft/30" : "border-border")}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", it.isService ? "bg-gold-soft text-gold-foreground" : "bg-accent text-primary")}>
                                {it.isService ? <Wrench className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{it.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {it.isService ? "Serviço" : [it.detail, `${it.stock} em estoque`].filter(Boolean).join(" · ")}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <p className="num font-display font-semibold">{formatCurrency(l.subtotal)}</p>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-danger" onClick={() => removeItem(it.key)} aria-label="Remover item">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[90px_1fr_1.3fr]">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Qtd.</Label>
                              <NumInput integer min={1} max={it.isService ? undefined : it.stock} value={it.quantity} onChange={(n) => patchItem(it.key, { quantity: Math.max(1, n) })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Preço unit. (R$)</Label>
                              <NumInput value={it.unitPrice} onChange={(n) => patchItem(it.key, { unitPrice: n })} />
                            </div>
                            <div className="col-span-2 space-y-1 sm:col-span-1">
                              <Label className="text-[11px] text-muted-foreground">Desconto</Label>
                              <div className="flex gap-1.5">
                                <NumInput value={it.discountValue} max={it.discountMode === "PCT" ? 100 : undefined} onChange={(n) => patchItem(it.key, { discountValue: n })} />
                                <DiscountToggle mode={it.discountMode} onChange={(m) => patchItem(it.key, { discountMode: m, discountValue: 0 })} />
                              </div>
                            </div>
                          </div>
                          {(below || l.overStock || (isAdmin && !it.isService)) && (
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                              {below && (
                                <span className="flex items-center gap-1 font-medium text-danger">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {formatCurrency(l.effectiveUnit)}/un abaixo do mínimo de {formatCurrency(it.minimumPrice)}
                                  {!isAdmin && " — requer administrador"}
                                </span>
                              )}
                              {l.overStock && <span className="font-medium text-danger">Só há {it.stock} em estoque.</span>}
                              {isAdmin && !it.isService && (
                                <span className="num text-muted-foreground">
                                  Custo {formatCurrency(it.costPrice)} · mín. {formatCurrency(it.minimumPrice)} · margem {l.subtotal > 0 ? (((l.subtotal - it.costPrice * it.quantity) / l.subtotal) * 100).toFixed(0) : 0}%
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {cart.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <Label className="text-sm">Desconto geral na venda</Label>
                    <div className="flex gap-1.5 sm:w-56">
                      <NumInput value={orderDiscValue} max={orderDiscMode === "PCT" ? 100 : undefined} onChange={setOrderDiscValue} />
                      <DiscountToggle mode={orderDiscMode} onChange={(m) => { setOrderDiscMode(m); setOrderDiscValue(0); }} />
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* 4. Pagamento */}
            <Panel title={<StepTitle n={4} title="Pagamento" done={cart.length > 0 && paymentsMatch} />} description="A soma dos pagamentos deve ser igual ao total da venda." {...rise(4)}
              actions={<Button variant="outline" size="sm" onClick={addPayment}><Plus className="h-4 w-4" /> Forma de pagamento</Button>}
            >
              <div className="space-y-3">
                {payments.map((p, idx) => (
                  <div key={p.key} className="rounded-xl border border-border p-3 sm:p-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_170px_auto] sm:items-end">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Forma {payments.length > 1 ? idx + 1 : ""}</Label>
                        <Select value={p.method} onValueChange={(v) => patchPayment(p.key, {
                          method: v as PaymentMethodCode,
                          installmentCount: v === "STORE_CREDIT" ? p.installmentCount ?? 3 : undefined,
                          cardInstallments: v === "CREDIT_CARD" ? p.cardInstallments ?? 1 : undefined,
                        })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {METHOD_ORDER.map((m) => <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Valor (R$)</Label>
                        <NumInput value={p.amount} onChange={(n) => patchPayment(p.key, { amount: n, auto: false })} />
                      </div>
                      <div className="flex gap-1">
                        {!paymentsMatch && remaining > 0 && (
                          <Button variant="ghost" size="sm" className="h-10 text-xs" onClick={() => patchPayment(p.key, { amount: r2(p.amount + remaining), auto: false })}>
                            + restante
                          </Button>
                        )}
                        {payments.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-danger" onClick={() => removePayment(p.key)} aria-label="Remover pagamento">
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {(p.method === "CREDIT_CARD" || p.method === "DEBIT_CARD") && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Bandeira</Label>
                          <Select value={p.cardBrand ?? ""} onValueChange={(v) => patchPayment(p.key, { cardBrand: v })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>{CARD_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {p.method === "CREDIT_CARD" && (
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Parcelas no cartão</Label>
                            <Select value={String(p.cardInstallments ?? 1)} onValueChange={(v) => patchPayment(p.key, { cardInstallments: Number(v) })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                                  <SelectItem key={n} value={String(n)}>
                                    {n === 1 ? "À vista" : `${n}x de ${formatCurrency(r2(p.amount / n))}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {p.method === "STORE_CREDIT" && (
                      <div className="mt-3 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Nº de parcelas *</Label>
                            <Select value={String(p.installmentCount ?? "")} onValueChange={(v) => patchPayment(p.key, { installmentCount: Number(v) })}>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Juros (% a.m., informativo)</Label>
                            <NumInput value={p.interestRate ?? 0} onChange={(n) => patchPayment(p.key, { interestRate: n })} />
                          </div>
                        </div>
                        {p.installmentCount && p.amount > 0 ? (
                          <div className="rounded-lg bg-muted/60 p-3 text-xs">
                            <p className="mb-1.5 font-semibold">Parcelas geradas automaticamente</p>
                            <div className="num grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                              {Array.from({ length: p.installmentCount }, (_, i) => {
                                const due = new Date();
                                due.setMonth(due.getMonth() + i + 1);
                                return (
                                  <span key={i} className="text-muted-foreground">
                                    {i + 1}ª · {formatDate(due)} · <span className="text-foreground">{formatCurrency(r2(p.amount / p.installmentCount!))}</span>
                                  </span>
                                );
                              })}
                            </div>
                            <p className="mt-2 text-muted-foreground">Para registrar uma entrada, adicione outra forma de pagamento (PIX ou dinheiro).</p>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {(p.method === "EXCHANGE" || p.method === "INSURANCE") && (
                      <div className="mt-3 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          {p.method === "EXCHANGE" ? "Justificativa *" : "Convênio / nº de autorização"}
                        </Label>
                        <Input value={p.justification ?? ""} onChange={(e) => patchPayment(p.key, { justification: e.target.value })}
                          placeholder={p.method === "EXCHANGE" ? "Motivo da troca ou cortesia" : "Ex.: Unimed — autorização 12345"} />
                      </div>
                    )}
                  </div>
                ))}

                <div className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3 text-sm",
                  !cart.length ? "bg-muted text-muted-foreground" : paymentsMatch ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
                )}>
                  <span className="flex items-center gap-2 font-medium">
                    <CircleDollarSign className="h-4 w-4" />
                    {!cart.length ? "Adicione itens para calcular o total" : paymentsMatch ? "Pagamentos conferem com o total" : remaining > 0 ? `Faltam ${formatCurrency(remaining)}` : `Excedente de ${formatCurrency(-remaining)}`}
                  </span>
                  <span className="num font-semibold">{formatCurrency(paid)} / {formatCurrency(totals.total)}</span>
                </div>
              </div>
            </Panel>

            {/* 5. Observações */}
            <Panel title={<StepTitle n={5} title="Observações" done={!!notes.trim()} />} {...rise(5)}>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalhes da OS: medidas da armação, prazo combinado, preferências do cliente…" />
            </Panel>
          </div>

          {/* Summary column */}
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start" {...rise(6)}>
            <Panel title="Resumo da venda" icon={Receipt}>
              {customer && (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-muted/60 p-2.5">
                  <InitialsAvatar name={customer.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedPrescription ? `Receita de ${formatDate(selectedPrescription.date)}` : "Sem receita vinculada"}</p>
                  </div>
                </div>
              )}
              {SummaryRows}
              {blockers.length > 0 && (
                <ul className="mt-4 space-y-1.5 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  {blockers.slice(0, 4).map((b) => (
                    <li key={b} className="flex gap-1.5"><ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0" />{b}</li>
                  ))}
                </ul>
              )}
              <Button variant="gold" className="mt-4 hidden h-11 w-full lg:inline-flex" disabled={submitting || blockers.length > 0} onClick={handleFinish}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? "Registrando…" : "Finalizar venda"}
              </Button>
            </Panel>

            {insights.length > 0 && (
              <Panel title="Assistente Império" icon={Sparkles} description="Conferência automática da venda">
                <div className="space-y-2.5">
                  {insights.map((i) => (
                    <InsightCard key={i.key} icon={i.icon} tone={i.tone} title={i.title}>{i.body}</InsightCard>
                  ))}
                </div>
              </Panel>
            )}
          </aside>
        </div>

        {/* Mobile sticky footer */}
        <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 -mx-3 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-8px_24px_-12px_hsl(224_45%_12%/0.25)] backdrop-blur-md sm:-mx-5 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">
                {cart.length ? (paymentsMatch ? "Pagamento conferido" : remaining > 0 ? `Falta ${formatCurrency(remaining)}` : `Excedente ${formatCurrency(-remaining)}`) : "Nenhum item"}
              </p>
              <p className="num font-display text-xl font-semibold leading-tight">{formatCurrency(totals.total)}</p>
            </div>
            <Button variant="gold" className="h-11 shrink-0" disabled={submitting || blockers.length > 0} onClick={handleFinish}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Finalizar
            </Button>
          </div>
        </div>
      </div>

      {/* Admin authorization for prices below minimum */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display"><ShieldAlert className="h-5 w-5 text-danger" /> Autorizar preço abaixo do mínimo</DialogTitle>
            <DialogDescription>Os itens abaixo serão vendidos com preço menor que o mínimo cadastrado. A autorização fica registrada na auditoria.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {belowMinItems.map((it) => (
              <li key={it.key} className="flex justify-between gap-3 rounded-lg bg-danger-soft/50 px-3 py-2">
                <span className="truncate">{it.name}</span>
                <span className="num shrink-0">{formatCurrency(lineOf(it).effectiveUnit)} <span className="text-muted-foreground">/ mín. {formatCurrency(it.minimumPrice)}</span></span>
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}><Eye className="h-4 w-4" /> Revisar</Button>
            <Button variant="destructive" disabled={submitting} onClick={submit}>
              {submitting ? "Registrando…" : "Autorizar e finalizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
