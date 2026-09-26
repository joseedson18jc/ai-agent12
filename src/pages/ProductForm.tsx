import { useState, useEffect, useMemo, useRef, forwardRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import productService, {
  type ProductCategoryOption,
  type ProductPayload,
} from "@/services/product.service";
import api from "@/services/api";
import type { ApiResponse } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import MainLayout from "@/components/layout/MainLayout";
import { PageHeader, Panel, InsightCard, StatusPill } from "@/components/imperio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft, Loader2, X, Calculator, AlertTriangle, Package, ChevronDown,
  Sparkles, Building2, CreditCard, Receipt, Users, Percent, Scale, ImagePlus,
  Save, Wand2, CheckCircle2, Tag, RotateCcw, Boxes, Barcode, Plus, Globe, EyeOff,
} from "lucide-react";

// ── AI-estimated defaults for a small Brazilian optical shop (Simples Nacional) ──
const AI_DEFAULTS = {
  taxPercent: 10.0,        // Simples Nacional average ~6-15.5%
  cardFeePercent: 3.5,     // Credit/debit card processing fee
  commissionPercent: 5.0,  // Sales commission
  operationalPercent: 20.0,// Rent, utilities, salaries, insurance (~15-30%)
  otherPercent: 2.0,       // Packaging, losses, shrinkage
};
type CostKey = keyof typeof AI_DEFAULTS;
type CostOverrides = Record<CostKey, number | null>; // null = use AI estimate

const COSTS_STORAGE_KEY = "imperio.product.businessCosts.v1";
const EMPTY_OVERRIDES: CostOverrides = {
  taxPercent: null, cardFeePercent: null, commissionPercent: null, operationalPercent: null, otherPercent: null,
};

function loadOverrides(): CostOverrides {
  try {
    const raw = localStorage.getItem(COSTS_STORAGE_KEY);
    if (!raw) return EMPTY_OVERRIDES;
    const parsed = JSON.parse(raw) as Partial<CostOverrides>;
    const out = { ...EMPTY_OVERRIDES };
    (Object.keys(out) as CostKey[]).forEach((k) => {
      const v = parsed[k];
      out[k] = typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null;
    });
    return out;
  } catch {
    return EMPTY_OVERRIDES;
  }
}

// ── Brazilian number parsing/formatting ──
/**
 * Parses money/percent typed the Brazilian way: "1.234,56", "600", "600,5", "R$ 1.299,90".
 * Also tolerates "1234.56". Returns NaN for empty/invalid input.
 */
function parseBRNumber(input: unknown): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : NaN;
  if (typeof input !== "string") return NaN;
  let s = input.replace(/R\$|%|\s/g, "").trim();
  if (!s) return NaN;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = s.split(".").length - 1;
    // "1.234" or "1.234.567" → thousands separators; "12.5" → decimal
    if (dots > 1 || (dots === 1 && /\.\d{3}$/.test(s))) s = s.replace(/\./g, "");
  }
  if (!/^-?\d*\.?\d*$/.test(s) || s === "." || s === "-") return NaN;
  return Number(s);
}
const toNum = (v: unknown) => {
  const n = parseBRNumber(v);
  return Number.isFinite(n) ? n : 0;
};
const fmtMoney = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const round2 = (n: number) => Math.round(n * 100) / 100;
/** Charm price: next value ending in ,90 (e.g. 1.263,40 → 1.269,90). */
const charmPrice = (n: number) => (n <= 0 ? 0 : Math.ceil((n + 0.1) / 10) * 10 - 0.1);

const moneyField = (label: string, required = false) =>
  z.string().superRefine((v, ctx) => {
    if (!v.trim()) {
      if (required) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Informe ${label}` });
      return;
    }
    const n = parseBRNumber(v);
    if (!Number.isFinite(n)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor inválido — use o formato 1.234,56" });
    else if (n < 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "O valor não pode ser negativo" });
  });

const intField = z.string().refine((v) => !v.trim() || /^\d+$/.test(v.trim()), "Use apenas números inteiros");

const productSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  brand: z.string(),
  model: z.string(),
  color: z.string(),
  size: z.string(),
  material: z.string(),
  supplierId: z.string(),
  barcode: z.string(),
  costPrice: moneyField("o preço de custo", true),
  taxFreight: moneyField("o frete"),
  desiredMarkup: moneyField("o markup"),
  sellingPrice: moneyField("o preço de venda", true).refine((v) => toNum(v) > 0, "O preço de venda deve ser maior que zero"),
  minimumPrice: moneyField("o preço mínimo"),
  stock: intField,
  minStock: intField,
  showOnline: z.boolean(),
  description: z.string().max(2000, "Use no máximo 2000 caracteres"),
});

type ProductFormData = z.infer<typeof productSchema>;

const DEFAULT_VALUES: ProductFormData = {
  name: "", categoryId: "", brand: "", model: "", color: "", size: "", material: "",
  supplierId: "none", barcode: "",
  costPrice: "", taxFreight: "", desiredMarkup: "100", sellingPrice: "", minimumPrice: "",
  stock: "0", minStock: "2",
  showOnline: true, description: "",
};

/** Resize + re-encode a photo client-side so it fits comfortably in the `photo` column. */
async function compressImage(file: File, maxSize = 800, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Não foi possível ler a imagem"));
      el.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Seu navegador não suporta o processamento de imagens");
    ctx.fillStyle = "#ffffff"; // flatten PNG transparency for JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ── Currency input (R$ prefix, BR format, formats on blur) ──
const CurrencyInput = forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
    value: string;
    onChange: (v: string) => void;
    suffix?: string;
    prefix?: string;
  }
>(({ value, onChange, onBlur, className, suffix, prefix = "R$", ...rest }, ref) => (
  <div className="relative">
    {prefix && (
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
        {prefix}
      </span>
    )}
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
      onBlur={(e) => {
        const n = parseBRNumber(value);
        if (Number.isFinite(n) && value.trim()) onChange(suffix ? fmtPct(n) : fmtMoney(n));
        onBlur?.(e);
      }}
      className={cn("num", prefix && "pl-10", suffix && "pr-8", className)}
      {...rest}
    />
    {suffix && (
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {suffix}
      </span>
    )}
  </div>
));
CurrencyInput.displayName = "CurrencyInput";

interface SupplierOption { id: string; name: string }

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditing = !!id;

  const [saving, setSaving] = useState<false | "save" | "saveNew">(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [costsOpen, setCostsOpen] = useState(false);
  const markupTouched = useRef(isEditing);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Business cost breakdown — null means "use AI estimate". Persisted per browser.
  const [overrides, setOverrides] = useState<CostOverrides>(loadOverrides);
  useEffect(() => {
    try {
      localStorage.setItem(COSTS_STORAGE_KEY, JSON.stringify(overrides));
    } catch {
      /* storage unavailable */
    }
  }, [overrides]);
  const setOverride = (k: CostKey) => (v: number | null) => setOverrides((o) => ({ ...o, [k]: v }));

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const rawCostPrice = useWatch({ control: form.control, name: "costPrice" });
  const rawTaxFreight = useWatch({ control: form.control, name: "taxFreight" });
  const rawDesiredMarkup = useWatch({ control: form.control, name: "desiredMarkup" });
  const rawSellingPrice = useWatch({ control: form.control, name: "sellingPrice" });
  const rawMinimumPrice = useWatch({ control: form.control, name: "minimumPrice" });
  const categoryId = useWatch({ control: form.control, name: "categoryId" });
  const watchedName = useWatch({ control: form.control, name: "name" });
  const watchedShowOnline = useWatch({ control: form.control, name: "showOnline" });
  const rawStock = useWatch({ control: form.control, name: "stock" });
  const rawMinStock = useWatch({ control: form.control, name: "minStock" });

  // Always coerce to real numbers: inputs hold strings, and "600" + "0" = "6000" (R$600 showing as R$6.000).
  const costPrice = toNum(rawCostPrice);
  const taxFreight = toNum(rawTaxFreight);
  const desiredMarkup = toNum(rawDesiredMarkup);
  const sellingPrice = toNum(rawSellingPrice);
  const minimumPrice = toNum(rawMinimumPrice);
  const stockNum = Number(rawStock) || 0;
  const minStockNum = Number(rawMinStock) || 0;

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // ── Cost calculations ──
  const totalCost = costPrice + taxFreight;

  // Effective percentages (user value or AI default)
  const eTax = overrides.taxPercent ?? AI_DEFAULTS.taxPercent;
  const eCard = overrides.cardFeePercent ?? AI_DEFAULTS.cardFeePercent;
  const eComm = overrides.commissionPercent ?? AI_DEFAULTS.commissionPercent;
  const eOps = overrides.operationalPercent ?? AI_DEFAULTS.operationalPercent;
  const eOther = overrides.otherPercent ?? AI_DEFAULTS.otherPercent;
  const totalOverheadPercent = eTax + eCard + eComm + eOps + eOther;
  const estimatedKeys = (Object.keys(overrides) as CostKey[]).filter((k) => overrides[k] === null);
  const usingAnyEstimate = estimatedKeys.length > 0;

  // The TRUE minimum price = cost / (1 - overhead%) — breakeven where selling covers all costs
  const trueMinimumPrice = useMemo(() => {
    if (totalCost <= 0) return 0;
    const divisor = 1 - totalOverheadPercent / 100;
    if (divisor <= 0) return totalCost * 10; // absurd overhead, cap it
    return totalCost / divisor;
  }, [totalCost, totalOverheadPercent]);

  const overheadAtSellingPrice = (sellingPrice * totalOverheadPercent) / 100;
  const suggestedPrice = totalCost > 0 && desiredMarkup > 0 ? totalCost * (1 + desiredMarkup / 100) : 0;
  // Real profit = selling - product cost - overhead% of selling
  const realProfitAmount = sellingPrice - totalCost - overheadAtSellingPrice;
  const realMarginPercent = sellingPrice > 0 ? (realProfitAmount / sellingPrice) * 100 : 0;
  // Simple (gross) margin — what the backend stores as marginPercent
  const grossMarginPercent = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

  // Effective minimum: the higher of a manual minimum and the breakeven price
  const effectiveMinimum = minimumPrice > trueMinimumPrice ? minimumPrice : round2(trueMinimumPrice);
  const maxDiscountAmount = sellingPrice > 0 ? Math.max(0, sellingPrice - effectiveMinimum) : 0;
  const maxDiscountToMinimum =
    sellingPrice > 0 && effectiveMinimum > 0 && sellingPrice > effectiveMinimum
      ? ((sellingPrice - effectiveMinimum) / sellingPrice) * 100
      : 0;

  const isBelowMinimum = sellingPrice > 0 && effectiveMinimum > 0 && sellingPrice < effectiveMinimum;
  const isBelowCost = sellingPrice > 0 && totalCost > 0 && sellingPrice < totalCost;
  const marginTone: "success" | "warning" | "danger" =
    realMarginPercent > 25 ? "success" : realMarginPercent >= 10 ? "warning" : "danger";
  const marginText = marginTone === "success" ? "text-success" : marginTone === "warning" ? "text-warning" : "text-danger";
  const marginLabel = marginTone === "success" ? "Boa" : marginTone === "warning" ? "Moderada" : "Baixa";

  // Price that yields a 20% real margin after all business costs
  const priceFor20 = useMemo(() => {
    const d = 1 - totalOverheadPercent / 100 - 0.2;
    return totalCost > 0 && d > 0 ? totalCost / d : 0;
  }, [totalCost, totalOverheadPercent]);

  // Auto-set minimum price when cost/overhead changes
  useEffect(() => {
    if (trueMinimumPrice > 0) {
      form.setValue("minimumPrice", fmtMoney(round2(trueMinimumPrice)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trueMinimumPrice]);

  // New product: follow the category's default markup until the user edits it
  useEffect(() => {
    if (!markupTouched.current && selectedCategory) {
      form.setValue("desiredMarkup", fmtPct(selectedCategory.defaultMarkup));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory?.id]);

  useEffect(() => {
    productService.getCategories().then(setCategories).catch(() => {
      toast({ title: "Erro", description: "Não foi possível carregar as categorias.", variant: "destructive" });
    });
    api
      .get<ApiResponse<SupplierOption[]>>("/suppliers?limit=200")
      .then((r) => setSuppliers(r.data || []))
      .catch(() => setSuppliers([]));
    if (isEditing) loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProduct = async () => {
    setInitialLoading(true);
    try {
      const { data: product } = await productService.getById(id!);
      form.reset({
        name: product.name || "",
        categoryId: product.categoryId || "",
        brand: product.brand || "",
        model: product.model || "",
        color: product.color || "",
        size: product.size || "",
        material: product.material || "",
        supplierId: product.supplierId || "none",
        barcode: product.barcode || "",
        costPrice: fmtMoney(product.costPrice || 0),
        taxFreight: product.taxFreight ? fmtMoney(product.taxFreight) : "",
        desiredMarkup: fmtPct(product.desiredMarkup ?? 100),
        sellingPrice: product.sellingPrice ? fmtMoney(product.sellingPrice) : "",
        minimumPrice: product.minimumPrice ? fmtMoney(product.minimumPrice) : "",
        stock: String(product.stock ?? 0),
        minStock: String(product.minStock ?? 0),
        showOnline: (product as { showOnline?: boolean }).showOnline ?? true,
        description: (product as { description?: string | null }).description ?? "",
      });
      setPhotoPreview(product.photo || null);
      setPhotoChanged(false);
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar os dados do produto.", variant: "destructive" });
      navigate("/produtos");
    } finally {
      setInitialLoading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Escolha uma imagem (JPG, PNG, WEBP ou HEIC).", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Escolha uma foto de até 20 MB.", variant: "destructive" });
      return;
    }
    setPhotoBusy(true);
    try {
      const dataUrl = await compressImage(file);
      setPhotoPreview(dataUrl);
      setPhotoChanged(true);
    } catch (err) {
      toast({
        title: "Não foi possível usar a foto",
        description: err instanceof Error ? err.message : "Tente outra imagem.",
        variant: "destructive",
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoChanged(true);
  };

  const setPrice = (value: number) =>
    form.setValue("sellingPrice", fmtMoney(round2(value)), { shouldValidate: true, shouldDirty: true });

  const applyCategoryMarkup = () => {
    if (!selectedCategory) return;
    markupTouched.current = true;
    form.setValue("desiredMarkup", fmtPct(selectedCategory.defaultMarkup), { shouldDirty: true });
  };

  const generateSKU = () => {
    const base = (selectedCategory?.name || watchedName || "PRD")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z]/g, "")
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, "X");
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    form.setValue("barcode", `${base}-${rand}`, { shouldDirty: true });
  };

  const submit = (mode: "save" | "saveNew") =>
    form.handleSubmit(async (data) => {
      setSaving(mode);
      const opt = (v: string) => (v.trim() ? v.trim() : isEditing ? "" : undefined);
      const payload: ProductPayload = {
        name: data.name.trim(),
        categoryId: data.categoryId,
        brand: opt(data.brand),
        model: opt(data.model),
        color: opt(data.color),
        size: opt(data.size),
        material: opt(data.material),
        supplierId: data.supplierId && data.supplierId !== "none" ? data.supplierId : isEditing ? null : undefined,
        barcode: data.barcode.trim() || (isEditing ? null : undefined),
        costPrice: round2(toNum(data.costPrice)),
        taxFreight: round2(toNum(data.taxFreight)),
        desiredMarkup: round2(toNum(data.desiredMarkup)),
        sellingPrice: round2(toNum(data.sellingPrice)),
        minimumPrice: round2(effectiveMinimum),
        stock: parseInt(data.stock || "0", 10) || 0,
        minStock: parseInt(data.minStock || "0", 10) || 0,
        showOnline: data.showOnline,
        description: data.description.trim() || (isEditing ? null : undefined),
      };
      if (photoChanged) payload.photo = photoPreview ?? null;

      try {
        const res = isEditing
          ? await productService.update(id!, payload)
          : await productService.create(payload);
        toast({
          title: isEditing ? "Produto atualizado" : "Produto cadastrado",
          description: `"${payload.name}" foi salvo com sucesso.`,
        });
        if (mode === "saveNew" && !isEditing) {
          // Keep category/brand/supplier for faster batch entry
          form.reset({
            ...DEFAULT_VALUES,
            categoryId: data.categoryId,
            brand: data.brand,
            supplierId: data.supplierId,
            desiredMarkup: data.desiredMarkup,
          });
          setPhotoPreview(null);
          setPhotoChanged(false);
          window.scrollTo({ top: 0 });
        } else {
          navigate("/produtos", { state: { savedId: res.data?.id } });
        }
      } catch (err) {
        toast({
          title: "Não foi possível salvar",
          description: err instanceof Error ? err.message : "Verifique os dados e tente novamente.",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    }, () => {
      toast({ title: "Revise o formulário", description: "Há campos obrigatórios ou inválidos destacados em vermelho.", variant: "destructive" });
    });

  // ── Assistente Império: inline pricing hints ──
  const hints = useMemo(() => {
    const list: { key: string; tone: "success" | "warning" | "info" | "danger" | "gold"; icon: typeof Sparkles; title: string; body?: string; action?: { label: string; run: () => void } }[] = [];
    if (totalCost <= 0) {
      list.push({ key: "start", tone: "info", icon: Calculator, title: "Comece pelo preço de custo", body: "Com o custo, calculo o preço mínimo, o sugerido e o desconto máximo." });
      return list;
    }
    if (selectedCategory && Math.abs(selectedCategory.defaultMarkup - desiredMarkup) >= 1) {
      list.push({
        key: "cat", tone: "gold", icon: Tag,
        title: `Markup padrão de ${selectedCategory.name}: ${fmtPct(selectedCategory.defaultMarkup)}%`,
        body: `Com ele, o preço sugerido seria ${formatCurrency(totalCost * (1 + selectedCategory.defaultMarkup / 100))}.`,
        action: { label: `Usar ${fmtPct(selectedCategory.defaultMarkup)}%`, run: applyCategoryMarkup },
      });
    }
    if (sellingPrice <= 0 && suggestedPrice > 0) {
      list.push({
        key: "nosell", tone: "info", icon: Wand2,
        title: `Sugestão: ${formatCurrency(charmPrice(suggestedPrice))}`,
        body: `Markup de ${fmtPct(desiredMarkup)}% arredondado para um preço de vitrine.`,
        action: { label: "Aplicar preço", run: () => setPrice(charmPrice(suggestedPrice)) },
      });
    }
    if (isBelowCost) {
      list.push({
        key: "cost", tone: "danger", icon: AlertTriangle,
        title: "Preço abaixo do custo do produto",
        body: `Você perde ${formatCurrency(totalCost - sellingPrice)} por unidade antes mesmo das despesas.`,
        action: { label: `Subir para o mínimo (${formatCurrency(Math.ceil(effectiveMinimum))})`, run: () => setPrice(Math.ceil(effectiveMinimum)) },
      });
    } else if (isBelowMinimum) {
      list.push({
        key: "min", tone: "danger", icon: Scale,
        title: "Preço abaixo do mínimo",
        body: `Considerando os custos do negócio, cada venda dá prejuízo de ${formatCurrency(effectiveMinimum - sellingPrice)}.`,
        action: { label: `Usar ${formatCurrency(Math.ceil(effectiveMinimum))}`, run: () => setPrice(Math.ceil(effectiveMinimum)) },
      });
    } else if (sellingPrice > 0 && realMarginPercent < 20) {
      list.push({
        key: "low", tone: "warning", icon: Percent,
        title: `Margem real de ${realMarginPercent.toFixed(1)}% — abaixo de 20%`,
        body: priceFor20 > 0 ? `Para 20% de lucro líquido, venda por ${formatCurrency(priceFor20)} ou mais.` : "Os custos do negócio consomem quase todo o preço.",
        action: priceFor20 > 0 ? { label: `Aplicar ${formatCurrency(charmPrice(priceFor20))}`, run: () => setPrice(charmPrice(priceFor20)) } : undefined,
      });
    } else if (sellingPrice > 0) {
      list.push({
        key: "ok", tone: "success", icon: CheckCircle2,
        title: "Precificação saudável",
        body: `Dá para oferecer até ${maxDiscountToMinimum.toFixed(0)}% de desconto sem prejuízo.`,
      });
    }
    if (sellingPrice > 0 && !isBelowMinimum && Math.abs(sellingPrice - charmPrice(sellingPrice)) > 0.009 && sellingPrice >= 20) {
      const c = charmPrice(sellingPrice);
      if (c - sellingPrice <= Math.max(10, sellingPrice * 0.02)) {
        list.push({
          key: "charm", tone: "info", icon: Sparkles,
          title: `Preço de vitrine: ${formatCurrency(c)}`,
          body: "Finais em ,90 costumam converter melhor no balcão.",
          action: { label: "Aplicar", run: () => setPrice(c) },
        });
      }
    }
    if (usingAnyEstimate) {
      list.push({
        key: "est", tone: "info", icon: Building2,
        title: "Custos do negócio estimados",
        body: "Informe seus percentuais reais uma vez — eles ficam salvos para os próximos produtos.",
        action: { label: "Ajustar custos", run: () => setCostsOpen(true) },
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCost, sellingPrice, suggestedPrice, desiredMarkup, selectedCategory, isBelowCost, isBelowMinimum, effectiveMinimum, realMarginPercent, priceFor20, maxDiscountToMinimum, usingAnyEstimate]);

  if (initialLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-16 w-72" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="surface space-y-4 p-5">
                  <Skeleton className="h-5 w-40" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-10 w-full" />)}
                  </div>
                </div>
              ))}
            </div>
            <Skeleton className="hidden h-[420px] rounded-2xl lg:block" />
          </div>
        </div>
      </MainLayout>
    );
  }

  const costBarTotal = Math.max(sellingPrice, effectiveMinimum, totalCost) || 1;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Catálogo · Produtos"
          title={isEditing ? "Editar produto" : "Novo produto"}
          description={isEditing ? "Atualize dados, estoque e preço — os cálculos acompanham em tempo real." : "Cadastre o item e deixe o Assistente Império calcular o preço certo."}
          icon={Package}
          actions={
            <>
              <Button variant="outline" onClick={() => navigate("/produtos")}>
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button className="hidden lg:inline-flex" onClick={submit("save")} disabled={!!saving || photoBusy}>
                {saving === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isEditing ? "Salvar alterações" : "Cadastrar produto"}
              </Button>
            </>
          }
        />

        <Form {...form}>
          <form onSubmit={submit("save")} noValidate>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
              {/* ── Left column ── */}
              <div className="min-w-0 space-y-6">
                {/* Identification */}
                <Panel title="Identificação" description="Como o produto aparece no catálogo e nas vendas" icon={Package}>
                  <div className="flex flex-col gap-5 sm:flex-row">
                    {/* Photo */}
                    <div className="flex shrink-0 flex-row items-center gap-4 sm:w-40 sm:flex-col sm:items-stretch">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "group relative flex aspect-square w-28 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-accent/60 transition-colors hover:border-gold sm:w-full",
                            photoPreview && "border-solid border-border"
                          )}
                          aria-label={photoPreview ? "Alterar foto" : "Adicionar foto"}
                        >
                          {photoBusy ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          ) : photoPreview ? (
                            <img src={photoPreview} alt="Foto do produto" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                              <ImagePlus className="h-7 w-7" />
                              <span className="text-[11px] font-medium">Adicionar foto</span>
                            </div>
                          )}
                        </button>
                        {photoPreview && !photoBusy && (
                          <button
                            type="button"
                            onClick={removePhoto}
                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-primary-foreground shadow ring-2 ring-card"
                            aria-label="Remover foto"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground sm:text-center">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="font-semibold text-primary hover:underline">
                          {photoPreview ? "Trocar foto" : "Enviar foto"}
                        </button>
                        <p className="mt-0.5">Otimizada automaticamente (até 800 px).</p>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
                    </div>

                    {/* Fields */}
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Nome do produto *</FormLabel>
                          <FormControl><Input placeholder="Armação Ray-Ban RB5228" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="categoryId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder={categories.length ? "Selecione" : "Carregando…"} /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedCategory && (
                            <FormDescription className="text-xs">Markup padrão da categoria: <span className="num font-semibold">{fmtPct(selectedCategory.defaultMarkup)}%</span></FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="brand" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl><Input placeholder="Ray-Ban" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="model" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo / referência</FormLabel>
                          <FormControl><Input placeholder="RB5228" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="color" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor</FormLabel>
                          <FormControl><Input placeholder="Preto fosco" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="size" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tamanho / aro</FormLabel>
                          <FormControl><Input placeholder="53-17-140" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="material" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material</FormLabel>
                          <FormControl><Input placeholder="Acetato, metal, TR90…" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="supplierId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fornecedor</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Sem fornecedor</SelectItem>
                              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {suppliers.length === 0 && (
                            <FormDescription className="text-xs">
                              Nenhum fornecedor cadastrado. <Link to="/fornecedores" className="font-semibold text-primary hover:underline">Cadastrar</Link>
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="barcode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código de barras / SKU</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <div className="relative flex-1">
                                <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="7891234567890" className="pl-9" {...field} />
                              </div>
                            </FormControl>
                            <Button type="button" variant="outline" onClick={generateSKU} className="shrink-0" title="Gerar SKU interno">
                              <Wand2 className="h-4 w-4" /> <span className="sm:hidden 2xl:inline">Gerar</span>
                            </Button>
                          </div>
                          <FormDescription className="text-xs">Único por produto.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </Panel>

                {/* Pricing */}
                <Panel title="Precificação" description="Informe os custos — preço mínimo, sugerido e desconto máximo são calculados na hora" icon={Calculator}>
                  <div className="space-y-5">
                    {/* Step 1 — product cost */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FormField control={form.control} name="costPrice" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quanto pagou pelo produto? *</FormLabel>
                          <FormControl><CurrencyInput placeholder="0,00" {...field} /></FormControl>
                          <FormDescription className="text-xs">Preço de custo/compra</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="taxFreight" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frete / impostos da compra</FormLabel>
                          <FormControl><CurrencyInput placeholder="0,00" {...field} /></FormControl>
                          <FormDescription className="text-xs">Rateado por unidade</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="flex flex-col justify-center rounded-xl border border-border bg-muted/50 p-3">
                        <p className="eyebrow">Custo do produto</p>
                        <p className="font-display num mt-1 text-xl font-semibold">{formatCurrency(totalCost)}</p>
                      </div>
                    </div>

                    {/* Step 2 — business costs */}
                    <Collapsible open={costsOpen} onOpenChange={setCostsOpen}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold-soft/60 p-4 text-left transition-colors hover:bg-gold-soft"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-gold">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">Custos do negócio</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {usingAnyEstimate
                                  ? `Estimativa inteligente para ${estimatedKeys.map((k) => COST_LABELS[k].short).join(", ")}`
                                  : "Todos os custos informados por você — salvos neste navegador"}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="num rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                              {totalOverheadPercent.toFixed(1)}%
                            </span>
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", costsOpen && "rotate-180")} />
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 space-y-3">
                        {usingAnyEstimate && (
                          <div className="flex items-start gap-2 rounded-lg border border-border bg-info-soft/60 p-3 text-sm">
                            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">Estimativas inteligentes ativadas.</span>{" "}
                              Valores típicos de uma ótica de pequeno/médio porte no Simples Nacional. Preencha com seus números reais — eles ficam salvos para os próximos cadastros.
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {(Object.keys(AI_DEFAULTS) as CostKey[]).map((k) => (
                            <CostField
                              key={k}
                              icon={COST_LABELS[k].icon}
                              label={COST_LABELS[k].label}
                              hint={COST_LABELS[k].hint}
                              value={overrides[k]}
                              aiDefault={AI_DEFAULTS[k]}
                              onChange={setOverride(k)}
                            />
                          ))}
                          <div className="ink-texture flex flex-col justify-center rounded-xl p-3 text-primary-foreground">
                            <p className="text-xs font-medium opacity-75">Total de custos do negócio</p>
                            <p className="font-display num text-2xl font-semibold text-gold">{totalOverheadPercent.toFixed(1)}%</p>
                            {sellingPrice > 0 && (
                              <p className="num mt-0.5 text-xs opacity-75">= {formatCurrency(overheadAtSellingPrice)} por venda</p>
                            )}
                            {!usingAnyEstimate || estimatedKeys.length < 5 ? (
                              <button type="button" onClick={() => setOverrides(EMPTY_OVERRIDES)} className="mt-1.5 inline-flex items-center gap-1 self-start text-[11px] font-semibold text-gold hover:underline">
                                <RotateCcw className="h-3 w-3" /> Voltar às estimativas
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Step 3 — markup, suggested, minimum */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FormField control={form.control} name="desiredMarkup" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Markup desejado</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              prefix=""
                              suffix="%"
                              placeholder="100"
                              {...field}
                              onChange={(v) => { markupTouched.current = true; field.onChange(v); }}
                            />
                          </FormControl>
                          {selectedCategory && Math.abs(selectedCategory.defaultMarkup - desiredMarkup) >= 1 && (
                            <button type="button" onClick={applyCategoryMarkup} className="text-[11px] font-semibold text-primary hover:underline">
                              Usar padrão da categoria ({fmtPct(selectedCategory.defaultMarkup)}%)
                            </button>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="flex flex-col justify-center rounded-xl border border-info/25 bg-info-soft/60 p-3">
                        <p className="text-xs font-medium text-info">Preço sugerido (markup)</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="font-display num text-xl font-semibold">{formatCurrency(suggestedPrice)}</p>
                          {suggestedPrice > 0 && (
                            <Button type="button" variant="outline" size="sm" onClick={() => setPrice(suggestedPrice)} className="h-7 px-2 text-xs">
                              Aplicar
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col justify-center rounded-xl border border-danger/25 bg-danger-soft/60 p-3">
                        <div className="flex items-center gap-1 text-danger">
                          <Scale className="h-3.5 w-3.5" />
                          <p className="text-xs font-medium">Preço mínimo (equilíbrio)</p>
                        </div>
                        <p className="font-display num mt-1 text-xl font-semibold text-danger">{formatCurrency(effectiveMinimum)}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-danger/80">Abaixo disso = prejuízo</p>
                      </div>
                    </div>

                    {/* Step 4 — selling price + minimum */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço de venda final *</FormLabel>
                          <FormControl>
                            <CurrencyInput placeholder="0,00" className="h-12 text-lg font-semibold" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="minimumPrice" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço mínimo — calculado automaticamente</FormLabel>
                          <FormControl><CurrencyInput placeholder="Automático" className="h-12" {...field} /></FormControl>
                          <FormDescription className="text-xs">Custo do produto + custos do negócio. Pode ser aumentado manualmente.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Results */}
                    {sellingPrice > 0 && totalCost > 0 && (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-border bg-muted/40 p-4">
                          <p className="eyebrow mb-3">Lucro real por venda</p>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                            <Figure label="Preço de venda" value={formatCurrency(sellingPrice)} />
                            <Figure label="Custo produto" value={`−${formatCurrency(totalCost)}`} />
                            <Figure label={`Custos negócio (${totalOverheadPercent.toFixed(0)}%)`} value={`−${formatCurrency(overheadAtSellingPrice)}`} />
                            <div className="border-l-2 border-gold pl-3">
                              <p className="text-[11px] text-muted-foreground">Lucro líquido</p>
                              <p className={cn("font-display num text-lg font-semibold", marginText)}>{formatCurrency(realProfitAmount)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">Margem real</p>
                              <p className={cn("font-display num text-lg font-semibold", marginText)}>{realMarginPercent.toFixed(1)}%</p>
                              <StatusPill tone={marginTone}>{marginLabel}</StatusPill>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-border bg-card p-4">
                          <p className="eyebrow mb-3 flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" /> Limites de desconto</p>
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Desconto máximo (R$)</p>
                              <p className="font-display num text-xl font-semibold">{formatCurrency(maxDiscountAmount)}</p>
                              <p className="text-[11px] text-muted-foreground">Quanto pode abaixar</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Desconto máximo (%)</p>
                              <p className="font-display num text-xl font-semibold">{maxDiscountToMinimum.toFixed(1)}%</p>
                              <p className="text-[11px] text-muted-foreground">Sem ficar no prejuízo</p>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <p className="text-xs text-muted-foreground">Com {maxDiscountToMinimum > 0 ? Math.floor(maxDiscountToMinimum) : 0}% de desconto</p>
                              <p className="font-display num text-xl font-semibold">{formatCurrency(effectiveMinimum)}</p>
                              <p className="text-[11px] text-muted-foreground">Preço final para o cliente</p>
                            </div>
                          </div>
                          <PriceBar totalCost={totalCost} minimum={effectiveMinimum} selling={sellingPrice} scale={costBarTotal} className="mt-4" showLegend />
                        </div>
                      </div>
                    )}

                    {isBelowCost && (
                      <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm font-medium text-danger">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          PREJUÍZO: o preço de venda ({formatCurrency(sellingPrice)}) está abaixo do custo total ({formatCurrency(totalCost)}). Você vai perder {formatCurrency(totalCost - sellingPrice)} por unidade!
                        </span>
                      </div>
                    )}
                    {isBelowMinimum && !isBelowCost && (
                      <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Atenção: o preço de venda ({formatCurrency(sellingPrice)}) está abaixo do mínimo ({formatCurrency(effectiveMinimum)}). Considerando todos os custos do negócio, você terá prejuízo de {formatCurrency(effectiveMinimum - sellingPrice)} por venda.
                        </span>
                      </div>
                    )}
                  </div>
                </Panel>

                {/* Stock */}
                <Panel title="Estoque" description="Quantidades e alerta de reposição" icon={Boxes}>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <FormField control={form.control} name="stock" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque atual</FormLabel>
                        <FormControl><Input inputMode="numeric" className="num" placeholder="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="minStock" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque mínimo</FormLabel>
                        <FormControl><Input inputMode="numeric" className="num" placeholder="2" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="col-span-2 flex flex-col justify-center rounded-xl border border-border bg-muted/40 p-3 sm:col-span-1">
                      <p className="eyebrow">Situação</p>
                      <div className="mt-1.5">
                        {stockNum <= 0 ? (
                          <StatusPill tone="danger">Sem estoque</StatusPill>
                        ) : stockNum <= minStockNum ? (
                          <StatusPill tone="warning">Estoque baixo</StatusPill>
                        ) : (
                          <StatusPill tone="success">Em estoque</StatusPill>
                        )}
                      </div>
                      {stockNum > 0 && totalCost > 0 && (
                        <p className="num mt-1.5 text-xs text-muted-foreground">
                          {formatCurrency(stockNum * totalCost)} investidos · {formatCurrency(stockNum * sellingPrice)} em venda
                        </p>
                      )}
                    </div>
                  </div>
                </Panel>

                {/* Online storefront */}
                <Panel title="Vitrine online" description="Como o produto aparece no site da loja" icon={Globe}>
                  <div className="space-y-4">
                    <FormField control={form.control} name="showOnline" render={({ field }) => (
                      <FormItem className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3.5 space-y-0">
                        <div className="min-w-0">
                          <FormLabel className="text-sm font-semibold">Exibir no site</FormLabel>
                          <FormDescription className="mt-0.5 text-xs">
                            {field.value
                              ? "Clientes podem ver e reservar este produto na vitrine (quando houver preço de venda)."
                              : "Oculto do site — continua disponível normalmente nas vendas da loja."}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Exibir no site" />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Descrição para o site</FormLabel>
                          <span className="num text-[11px] text-muted-foreground">{field.value.length}/2000</span>
                        </div>
                        <FormControl>
                          <Textarea
                            rows={4}
                            maxLength={2000}
                            placeholder="Ex.: Armação leve em acetato, ponte confortável e hastes com ajuste fino. Aceita lentes de grau."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Texto curto e atraente: material, estilo, para quem é indicado. Deixe em branco para não exibir.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {watchedShowOnline && !photoPreview && (
                      <p className="flex items-start gap-2 rounded-lg bg-gold-soft px-3 py-2 text-xs text-gold-foreground">
                        <ImagePlus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Produtos com foto chamam muito mais atenção na vitrine — adicione uma imagem acima.
                      </p>
                    )}
                    {!watchedShowOnline && (
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <EyeOff className="h-3.5 w-3.5" /> Não aparece no site
                      </p>
                    )}
                  </div>
                </Panel>
              </div>

              {/* ── Right column: sticky price summary ── */}
              <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
                <section className="surface overflow-hidden">
                  <div className="ink-texture px-5 pb-5 pt-4 text-primary-foreground">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Resumo de preço</p>
                    <p className="mt-1 text-xs opacity-70">Preço de venda</p>
                    <p className="font-display num text-3xl font-semibold leading-tight">{formatCurrency(sellingPrice)}</p>
                    {sellingPrice > 0 && totalCost > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <StatusPill tone={marginTone}>Margem {marginLabel.toLowerCase()}</StatusPill>
                        <span className="num text-xs opacity-75">bruta {grossMarginPercent.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  <dl className="divide-y divide-border px-5">
                    <SummaryRow label="Custo do produto" value={formatCurrency(totalCost)} />
                    <SummaryRow label="Preço mínimo" value={formatCurrency(effectiveMinimum)} tone={isBelowMinimum ? "danger" : undefined} />
                    <SummaryRow label="Preço sugerido" value={formatCurrency(suggestedPrice)} hint={`markup ${fmtPct(desiredMarkup)}%`} />
                    <SummaryRow label="Lucro real" value={formatCurrency(sellingPrice > 0 ? realProfitAmount : 0)} tone={sellingPrice > 0 ? marginTone : undefined} strong />
                    <SummaryRow label="Margem real" value={`${realMarginPercent.toFixed(1)}%`} tone={sellingPrice > 0 ? marginTone : undefined} />
                    <SummaryRow label="Desconto máximo" value={`${maxDiscountToMinimum.toFixed(1)}%`} hint={formatCurrency(maxDiscountAmount)} />
                  </dl>
                  {sellingPrice > 0 && totalCost > 0 && (
                    <div className="px-5 pb-4 pt-1">
                      <PriceBar totalCost={totalCost} minimum={effectiveMinimum} selling={sellingPrice} scale={costBarTotal} />
                    </div>
                  )}
                  <div className="hidden space-y-2 border-t border-border bg-muted/30 p-4 lg:block">
                    <Button type="submit" className="w-full" disabled={!!saving || photoBusy}>
                      {saving === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isEditing ? "Salvar alterações" : "Cadastrar produto"}
                    </Button>
                    {!isEditing && (
                      <Button type="button" variant="outline" className="w-full" onClick={submit("saveNew")} disabled={!!saving || photoBusy}>
                        {saving === "saveNew" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Salvar e cadastrar outro
                      </Button>
                    )}
                  </div>
                </section>

                {hints.length > 0 && (
                  <Panel title="Assistente Império" icon={Sparkles} bodyClassName="space-y-2.5 pt-4">
                    {hints.map((h) => (
                      <InsightCard
                        key={h.key}
                        icon={h.icon}
                        tone={h.tone}
                        title={h.title}
                        action={h.action && (
                          <button type="button" onClick={h.action.run} className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
                            {h.action.label} →
                          </button>
                        )}
                      >
                        {h.body}
                      </InsightCard>
                    ))}
                  </Panel>
                )}
              </aside>
            </div>

            {/* Mobile sticky save bar (sits above the bottom navigation) */}
            <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-3 mt-6 border-t border-border bg-card/95 px-3 py-2.5 shadow-[0_-8px_24px_-12px_hsl(224_45%_12%/0.25)] backdrop-blur-md sm:-mx-5 sm:px-5 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display num truncate text-lg font-semibold leading-tight">{formatCurrency(sellingPrice)}</p>
                  <p className={cn("num truncate text-[11px] font-medium", sellingPrice > 0 ? marginText : "text-muted-foreground")}>
                    {sellingPrice > 0 ? `Lucro ${formatCurrency(realProfitAmount)} · ${realMarginPercent.toFixed(1)}%` : `Mínimo ${formatCurrency(effectiveMinimum)}`}
                  </p>
                </div>
                <Button type="submit" disabled={!!saving || photoBusy} className="shrink-0">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEditing ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
}

const COST_LABELS: Record<CostKey, { label: string; short: string; hint: string; icon: React.ReactNode }> = {
  taxPercent: { label: "Impostos sobre venda", short: "impostos", hint: "ICMS, Simples Nacional, ISS…", icon: <Receipt className="h-4 w-4" /> },
  cardFeePercent: { label: "Taxa do cartão", short: "cartão", hint: "Crédito/débito/Pix via maquininha", icon: <CreditCard className="h-4 w-4" /> },
  commissionPercent: { label: "Comissão do vendedor", short: "comissão", hint: "% pago por venda ao funcionário", icon: <Users className="h-4 w-4" /> },
  operationalPercent: { label: "Custo operacional", short: "operacional", hint: "Aluguel, luz, água, salários, seguro", icon: <Building2 className="h-4 w-4" /> },
  otherPercent: { label: "Outros custos", short: "outros", hint: "Embalagem, perdas, marketing", icon: <Package className="h-4 w-4" /> },
};

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="num text-base font-semibold">{value}</p>
    </div>
  );
}

function SummaryRow({
  label, value, hint, tone, strong,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "success" | "warning" | "danger";
  strong?: boolean;
}) {
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right">
        <span className={cn("num font-semibold", strong ? "font-display text-lg" : "text-sm", color)}>{value}</span>
        {hint && <span className="num block text-[11px] text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}

function PriceBar({
  totalCost, minimum, selling, scale, className, showLegend,
}: {
  totalCost: number;
  minimum: number;
  selling: number;
  scale: number;
  className?: string;
  showLegend?: boolean;
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / scale) * 100))}%`;
  const overhead = Math.max(0, Math.min(minimum, selling) - totalCost);
  const profit = Math.max(0, selling - minimum);
  return (
    <div className={className}>
      {showLegend && (
        <div className="mb-1 flex justify-between gap-2 text-[10px] text-muted-foreground">
          <span className="num">Custo ({formatCurrency(totalCost)})</span>
          <span className="num">Mínimo ({formatCurrency(minimum)})</span>
          <span className="num">Venda ({formatCurrency(selling)})</span>
        </div>
      )}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-danger/80" style={{ width: pct(Math.min(totalCost, selling || totalCost)) }} />
        <div className="h-full bg-warning/80" style={{ width: pct(overhead) }} />
        <div className="h-full bg-success" style={{ width: pct(profit) }} />
      </div>
      <div className="mt-1 flex justify-between gap-2 text-[10px] font-medium">
        <span className="text-danger">Custo produto</span>
        <span className="text-warning">Custos negócio</span>
        <span className="text-success">Lucro (margem p/ desconto)</span>
      </div>
    </div>
  );
}

// ── Reusable cost field component (accepts "3,5" or "3.5") ──
function CostField({
  icon, label, hint, value, aiDefault, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  value: number | null;
  aiDefault: number;
  onChange: (v: number | null) => void;
}) {
  const isAI = value === null;
  const [draft, setDraft] = useState(isAI ? "" : fmtPct(value));

  // Sync when changed from outside (e.g. "Voltar às estimativas")
  useEffect(() => {
    const parsed = parseBRNumber(draft);
    if (value === null && draft !== "") setDraft("");
    else if (value !== null && parsed !== value) setDraft(fmtPct(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("rounded-xl border p-3", isAI ? "border-gold/40 bg-gold-soft/40" : "border-border bg-card")}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className={isAI ? "text-gold-foreground" : "text-primary"}>{icon}</span>
        <p className="text-xs font-semibold">{label}</p>
        {isAI && (
          <span className="ml-auto" title="Estimativa inteligente">
            <Sparkles className="h-3 w-3 text-gold" />
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          inputMode="decimal"
          value={draft}
          placeholder={`~${fmtPct(aiDefault)}% (estimado)`}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.,]/g, "");
            setDraft(raw);
            if (!raw) { onChange(null); return; }
            const n = parseBRNumber(raw);
            if (Number.isFinite(n)) onChange(Math.min(100, Math.max(0, n)));
          }}
          className="num h-8 text-sm"
        />
        <span className="shrink-0 text-xs text-muted-foreground">%</span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
      {!isAI && (
        <button type="button" onClick={() => onChange(null)} className="mt-1 text-[10px] font-semibold text-gold-foreground underline">
          Usar estimativa ({fmtPct(aiDefault)}%)
        </button>
      )}
    </div>
  );
}
