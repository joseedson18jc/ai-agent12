import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import productService from "@/services/product.service";
import api from "@/services/api";
import { formatCurrency } from "@/utils/formatters";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft, Loader2, Upload, X, Calculator, AlertTriangle, Package,
  ChevronDown, ChevronRight, Sparkles, Info, Building2, CreditCard,
  Receipt, Users, Percent, Truck, Scale,
} from "lucide-react";

// ── AI-estimated defaults for a small Brazilian optical shop (Simples Nacional) ──
const AI_DEFAULTS = {
  taxPercent: 10.0,        // Simples Nacional average ~6-15.5%
  cardFeePercent: 3.5,     // Credit/debit card processing fee
  commissionPercent: 5.0,  // Sales commission
  operationalPercent: 20.0,// Rent, utilities, salaries, insurance (~15-30%)
  otherPercent: 2.0,       // Packaging, losses, shrinkage
};
const AI_TOTAL = Object.values(AI_DEFAULTS).reduce((a, b) => a + b, 0); // ~40.5%

// Categories loaded from API (database UUIDs)

const productSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  category: z.string().min(1, "Selecione uma categoria"),
  brand: z.string().optional(),
  supplier: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  costPrice: z.coerce.number().min(0, "Valor deve ser positivo"),
  taxFreight: z.coerce.number().min(0, "Valor deve ser positivo").default(0),
  desiredMarkup: z.coerce.number().min(0, "Valor deve ser positivo").default(100),
  sellingPrice: z.coerce.number().min(0, "Valor deve ser positivo"),
  minimumPrice: z.coerce.number().min(0, "Valor deve ser positivo").default(0),
  currentStock: z.coerce.number().int().min(0, "Valor deve ser positivo").default(0),
  minStock: z.coerce.number().int().min(0, "Valor deve ser positivo").default(0),
  location: z.string().optional(),
  active: z.boolean().default(true),
  notes: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [autoSKU, setAutoSKU] = useState(false);
  const [costsOpen, setCostsOpen] = useState(false);

  // Business cost breakdown — null means "use AI estimate"
  const [taxPercent, setTaxPercent] = useState<number | null>(null);
  const [cardFeePercent, setCardFeePercent] = useState<number | null>(null);
  const [commissionPercent, setCommissionPercent] = useState<number | null>(null);
  const [operationalPercent, setOperationalPercent] = useState<number | null>(null);
  const [otherPercent, setOtherPercent] = useState<number | null>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "",
      brand: "",
      supplier: "",
      sku: "",
      barcode: "",
      description: "",
      costPrice: 0,
      taxFreight: 0,
      desiredMarkup: 100,
      sellingPrice: 0,
      minimumPrice: 0,
      currentStock: 0,
      minStock: 0,
      location: "",
      active: true,
      notes: "",
    },
  });

  const costPrice = useWatch({ control: form.control, name: "costPrice" });
  const taxFreight = useWatch({ control: form.control, name: "taxFreight" });
  const desiredMarkup = useWatch({ control: form.control, name: "desiredMarkup" });
  const sellingPrice = useWatch({ control: form.control, name: "sellingPrice" });
  const minimumPrice = useWatch({ control: form.control, name: "minimumPrice" });

  // ── Cost calculations ──
  const totalCost = useMemo(() => (costPrice || 0) + (taxFreight || 0), [costPrice, taxFreight]);

  // Effective percentages (user value or AI default)
  const eTax = taxPercent ?? AI_DEFAULTS.taxPercent;
  const eCard = cardFeePercent ?? AI_DEFAULTS.cardFeePercent;
  const eComm = commissionPercent ?? AI_DEFAULTS.commissionPercent;
  const eOps = operationalPercent ?? AI_DEFAULTS.operationalPercent;
  const eOther = otherPercent ?? AI_DEFAULTS.otherPercent;
  const totalOverheadPercent = eTax + eCard + eComm + eOps + eOther;
  const usingAnyEstimate = taxPercent === null || cardFeePercent === null || commissionPercent === null || operationalPercent === null || otherPercent === null;

  // The TRUE minimum price = cost / (1 - overhead%)
  // This is the breakeven price where selling = all costs combined
  const trueMinimumPrice = useMemo(() => {
    if (totalCost <= 0) return 0;
    const divisor = 1 - totalOverheadPercent / 100;
    if (divisor <= 0) return totalCost * 10; // absurd overhead, cap it
    return totalCost / divisor;
  }, [totalCost, totalOverheadPercent]);

  // Overhead cost in R$ at selling price
  const overheadAtSellingPrice = useMemo(() => {
    return (sellingPrice || 0) * totalOverheadPercent / 100;
  }, [sellingPrice, totalOverheadPercent]);

  const suggestedPrice = useMemo(() => {
    if (totalCost <= 0 || !desiredMarkup) return 0;
    return totalCost * (1 + desiredMarkup / 100);
  }, [totalCost, desiredMarkup]);

  // Real margin = (selling - cost - overhead%) / selling
  const realProfitAmount = useMemo(() => {
    return (sellingPrice || 0) - totalCost - overheadAtSellingPrice;
  }, [sellingPrice, totalCost, overheadAtSellingPrice]);

  const realMarginPercent = useMemo(() => {
    if (!sellingPrice || sellingPrice <= 0) return 0;
    return (realProfitAmount / sellingPrice) * 100;
  }, [realProfitAmount, sellingPrice]);

  // Simple margin (without overhead) for backward compat
  const marginPercent = useMemo(() => {
    if (!sellingPrice || sellingPrice <= 0) return 0;
    return ((sellingPrice - totalCost) / sellingPrice) * 100;
  }, [sellingPrice, totalCost]);

  const profitAmount = useMemo(() => (sellingPrice || 0) - totalCost, [sellingPrice, totalCost]);

  // effectiveMinimum = trueMinimumPrice (includes overhead)
  const effectiveMinimum = useMemo(() => {
    if (minimumPrice && minimumPrice > trueMinimumPrice) return minimumPrice;
    return Math.round(trueMinimumPrice * 100) / 100;
  }, [minimumPrice, trueMinimumPrice]);

  // Max discount from selling price to minimum
  const maxDiscountToMinimum = useMemo(() => {
    if (!sellingPrice || sellingPrice <= 0 || effectiveMinimum <= 0) return 0;
    if (sellingPrice <= effectiveMinimum) return 0;
    return ((sellingPrice - effectiveMinimum) / sellingPrice) * 100;
  }, [sellingPrice, effectiveMinimum]);

  const maxDiscountAmount = useMemo(() => {
    if (!sellingPrice || sellingPrice <= 0) return 0;
    return Math.max(0, sellingPrice - effectiveMinimum);
  }, [sellingPrice, effectiveMinimum]);

  // Max discount to pure cost (zero margin, zero overhead coverage)
  const maxDiscountPercent = useMemo(() => {
    if (!sellingPrice || sellingPrice <= 0 || totalCost <= 0) return 0;
    if (sellingPrice <= totalCost) return 0;
    return ((sellingPrice - totalCost) / sellingPrice) * 100;
  }, [sellingPrice, totalCost]);

  const marginColor = useMemo(() => {
    if (realMarginPercent > 25) return "text-green-600";
    if (realMarginPercent >= 10) return "text-yellow-600";
    return "text-red-600";
  }, [realMarginPercent]);

  const marginBg = useMemo(() => {
    if (realMarginPercent > 25) return "bg-green-50 border-green-200";
    if (realMarginPercent >= 10) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  }, [realMarginPercent]);

  const isBelowMinimum = sellingPrice > 0 && effectiveMinimum > 0 && sellingPrice < effectiveMinimum;
  const isBelowCost = sellingPrice > 0 && totalCost > 0 && sellingPrice < totalCost;

  // Auto-set minimum price when cost/overhead changes
  useEffect(() => {
    if (trueMinimumPrice > 0) {
      form.setValue("minimumPrice", Math.round(trueMinimumPrice * 100) / 100);
    }
  }, [trueMinimumPrice]);

  useEffect(() => {
    loadCategories();
    loadSuppliers();
    if (isEditing) loadProduct();
  }, [id]);

  const loadCategories = async () => {
    try {
      const result = await api.get<any>("/categories");
      setCategories(result.data || []);
    } catch {
      // fallback if API fails
      setCategories([]);
    }
  };

  const loadSuppliers = async () => {
    try {
      const result = await api.get<any>("/suppliers?limit=100");
      setSuppliers(result.data || []);
    } catch {
      // suppliers optional
    }
  };

  const loadProduct = async () => {
    setInitialLoading(true);
    try {
      const response = await productService.getById(id!);
      const product = response.data;
      form.reset({
        name: product.name || "",
        category: product.categoryId || "",
        brand: product.brand || "",
        supplier: product.supplierId || "",
        sku: product.barcode || "",
        barcode: product.barcode || "",
        description: "",
        costPrice: product.costPrice || 0,
        taxFreight: product.taxFreight || 0,
        desiredMarkup: product.desiredMarkup || 100,
        sellingPrice: product.sellingPrice || 0,
        minimumPrice: product.minimumPrice || 0,
        currentStock: product.stock || 0,
        minStock: product.minStock || 0,
        location: "",
        active: !product.isDeleted,
        notes: "",
      });
      if (product.photo) {
        setPhotoPreview(product.photo);
      }
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do produto.",
        variant: "destructive",
      });
      navigate("/produtos");
    } finally {
      setInitialLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const applySuggestedPrice = () => {
    form.setValue("sellingPrice", Math.round(suggestedPrice * 100) / 100);
  };

  const generateSKU = () => {
    const cat = form.getValues("category")?.substring(0, 3).toUpperCase() || "PRD";
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    form.setValue("sku", `${cat}-${rand}`);
  };

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    try {
      const payload: any = {
        name: data.name,
        categoryId: data.category, // UUID from categories API
        brand: data.brand || undefined,
        supplierId: data.supplier && data.supplier.length > 0 ? data.supplier : undefined,
        barcode: data.barcode || data.sku || undefined,
        costPrice: data.costPrice,
        taxFreight: data.taxFreight,
        desiredMarkup: data.desiredMarkup,
        sellingPrice: data.sellingPrice,
        minimumPrice: data.minimumPrice,
        stock: data.currentStock,
        minStock: data.minStock,
      };

      if (isEditing) {
        await productService.update(id!, payload);
        toast({ title: "Sucesso", description: "Produto atualizado com sucesso!" });
      } else {
        await productService.create(payload);
        toast({ title: "Sucesso", description: "Produto cadastrado com sucesso!" });
      }
      navigate("/produtos");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Não foi possível salvar o produto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardContent className="p-6 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/produtos")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? "Editar Produto" : "Novo Produto"}
          </h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Photo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Foto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                      <Package className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer">
                      <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        {photoPreview ? "Alterar foto" : "Enviar foto"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG. Máx 5MB.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Nome do Produto *</FormLabel>
                        <FormControl>
                          <Input placeholder="Armação Ray-Ban RB5228" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <FormControl>
                          <Input placeholder="Ray-Ban" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fornecedor</FormLabel>
                        {suppliers.length > 0 ? (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suppliers.map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl>
                            <Input placeholder="Nome do fornecedor" {...field} />
                          </FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input placeholder="FRM-ABC123" {...field} />
                            </FormControl>
                            <Button type="button" variant="outline" size="sm" onClick={generateSKU} className="whitespace-nowrap">
                              Gerar
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Barras</FormLabel>
                        <FormControl>
                          <Input placeholder="7891234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descrição detalhada do produto..." rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing — Step 1: Product cost */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Precificação
                </CardTitle>
                <CardDescription>
                  Informe os custos e o sistema calcula automaticamente preço mínimo e desconto máximo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Row 1: Cost inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quanto pagou pelo produto? (R$) *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">Preço de custo/compra</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="taxFreight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frete da compra (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">Frete/transporte pago na compra</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col justify-center rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Custo do Produto</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
                  </div>
                </div>

                {/* Business Costs Breakdown */}
                <Collapsible open={costsOpen} onOpenChange={setCostsOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-between w-full rounded-xl border border-indigo-200 bg-indigo-50 p-4 hover:bg-indigo-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-indigo-800">Custos do Negócio</p>
                          <p className="text-xs text-indigo-500">
                            {usingAnyEstimate
                              ? `Usando estimativas inteligentes para ${[taxPercent === null && "impostos", cardFeePercent === null && "cartão", commissionPercent === null && "comissão", operationalPercent === null && "operacional", otherPercent === null && "outros"].filter(Boolean).join(", ")}`
                              : `Todos os custos informados manualmente — Total: ${totalOverheadPercent.toFixed(1)}%`
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-200 text-indigo-800 border-0 text-xs">{totalOverheadPercent.toFixed(1)}%</Badge>
                        {costsOpen ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-indigo-600" />}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3">
                    {usingAnyEstimate && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                        <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                        <div>
                          <p className="font-medium">Estimativas inteligentes ativadas</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            Valores estimados para uma ótica de pequeno/médio porte no Simples Nacional.
                            Preencha os campos para usar seus valores reais.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Tax */}
                      <CostField
                        icon={<Receipt className="w-4 h-4" />}
                        label="Impostos sobre venda"
                        hint="ICMS, Simples Nacional, ISS..."
                        value={taxPercent}
                        aiDefault={AI_DEFAULTS.taxPercent}
                        onChange={setTaxPercent}
                      />
                      {/* Card fees */}
                      <CostField
                        icon={<CreditCard className="w-4 h-4" />}
                        label="Taxa do cartão"
                        hint="Crédito/débito/Pix via maquininha"
                        value={cardFeePercent}
                        aiDefault={AI_DEFAULTS.cardFeePercent}
                        onChange={setCardFeePercent}
                      />
                      {/* Commission */}
                      <CostField
                        icon={<Users className="w-4 h-4" />}
                        label="Comissão do vendedor"
                        hint="% pago por venda ao funcionário"
                        value={commissionPercent}
                        aiDefault={AI_DEFAULTS.commissionPercent}
                        onChange={setCommissionPercent}
                      />
                      {/* Operational */}
                      <CostField
                        icon={<Building2 className="w-4 h-4" />}
                        label="Custo operacional"
                        hint="Aluguel, luz, água, salários, seguro"
                        value={operationalPercent}
                        aiDefault={AI_DEFAULTS.operationalPercent}
                        onChange={setOperationalPercent}
                      />
                      {/* Other */}
                      <CostField
                        icon={<Package className="w-4 h-4" />}
                        label="Outros custos"
                        hint="Embalagem, perdas, marketing"
                        value={otherPercent}
                        aiDefault={AI_DEFAULTS.otherPercent}
                        onChange={setOtherPercent}
                      />
                      {/* Total summary */}
                      <div className="flex flex-col justify-center rounded-xl bg-indigo-100 border border-indigo-300 p-3">
                        <p className="text-xs text-indigo-600 font-medium">Total de custos (%)</p>
                        <p className="text-2xl font-bold text-indigo-800">{totalOverheadPercent.toFixed(1)}%</p>
                        {sellingPrice > 0 && (
                          <p className="text-xs text-indigo-500 mt-1">= {formatCurrency(overheadAtSellingPrice)} por venda</p>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Row 2: Markup + Suggested */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="desiredMarkup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Markup desejado (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="1" min="0" placeholder="100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col justify-center rounded-xl bg-blue-50 border border-blue-200 p-3">
                    <p className="text-xs text-blue-600">Preço Sugerido (com markup)</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xl font-bold text-blue-700">{formatCurrency(suggestedPrice)}</p>
                      {suggestedPrice > 0 && (
                        <Button type="button" variant="outline" size="sm" onClick={applySuggestedPrice} className="text-xs h-7 border-blue-300 text-blue-700">
                          Aplicar
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center rounded-xl bg-red-50 border border-red-200 p-3">
                    <div className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-red-600" />
                      <p className="text-xs text-red-600 font-medium">Preço Mínimo (ponto de equilíbrio)</p>
                    </div>
                    <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(effectiveMinimum)}</p>
                    <p className="text-[10px] text-red-500">Abaixo disso = PREJUÍZO</p>
                  </div>
                </div>

                {/* Row 3: Selling price + minimum */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço de Venda Final (R$) *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0,00" className="text-lg font-semibold h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minimumPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Mínimo (R$) — calculado automaticamente</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="Automático" className="h-12" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">Inclui custo do produto + todos os custos do negócio</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Result panels */}
                {sellingPrice > 0 && totalCost > 0 && (
                  <div className="space-y-3">
                    {/* Profit summary */}
                    <div className={`rounded-xl border p-4 ${marginBg}`}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Lucro Real por Venda</p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div>
                          <p className="text-[10px] text-gray-500">Preço de Venda</p>
                          <p className="text-base font-bold text-gray-800">{formatCurrency(sellingPrice)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Custo Produto</p>
                          <p className="text-base font-bold text-gray-800">-{formatCurrency(totalCost)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Custos Negócio ({totalOverheadPercent.toFixed(0)}%)</p>
                          <p className="text-base font-bold text-gray-800">-{formatCurrency(overheadAtSellingPrice)}</p>
                        </div>
                        <div className="border-l-2 border-gray-300 pl-3">
                          <p className="text-[10px] text-gray-500">Lucro Líquido</p>
                          <p className={`text-lg font-bold ${marginColor}`}>{formatCurrency(realProfitAmount)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Margem Real</p>
                          <p className={`text-lg font-bold ${marginColor}`}>{realMarginPercent.toFixed(1)}%</p>
                          <Badge className={`mt-0.5 ${
                            realMarginPercent > 25 ? "bg-green-100 text-green-700 border-green-300" :
                            realMarginPercent >= 10 ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                            "bg-red-100 text-red-700 border-red-300"
                          } border text-[10px]`}>
                            {realMarginPercent > 25 ? "Boa" : realMarginPercent >= 10 ? "Moderada" : "Baixa"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Discount limits */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5" />
                        Limites de Desconto
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-blue-600">Desconto Máximo (R$)</p>
                          <p className="text-xl font-bold text-blue-800">{formatCurrency(maxDiscountAmount)}</p>
                          <p className="text-[10px] text-blue-500">Quanto pode abaixar do preço</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600">Desconto Máximo (%)</p>
                          <p className="text-xl font-bold text-blue-800">{maxDiscountToMinimum.toFixed(1)}%</p>
                          <p className="text-[10px] text-blue-500">Sem ficar no prejuízo</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600">Se der {maxDiscountToMinimum > 0 ? Math.floor(maxDiscountToMinimum) : 0}% de desconto</p>
                          <p className="text-xl font-bold text-blue-800">{formatCurrency(effectiveMinimum)}</p>
                          <p className="text-[10px] text-blue-500">Preço final para o cliente</p>
                        </div>
                      </div>

                      {/* Visual bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] text-blue-500 mb-1">
                          <span>Custo ({formatCurrency(totalCost)})</span>
                          <span>Mínimo ({formatCurrency(effectiveMinimum)})</span>
                          <span>Venda ({formatCurrency(sellingPrice)})</span>
                        </div>
                        <div className="w-full h-4 bg-red-200 rounded-full overflow-hidden flex">
                          <div className="h-full bg-red-400" style={{ width: `${Math.min(100, (totalCost / sellingPrice) * 100)}%` }} />
                          <div className="h-full bg-amber-400" style={{ width: `${Math.max(0, ((effectiveMinimum - totalCost) / sellingPrice) * 100)}%` }} />
                          <div className="h-full bg-green-400" style={{ width: `${Math.max(0, ((sellingPrice - effectiveMinimum) / sellingPrice) * 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] mt-1 font-medium">
                          <span className="text-red-600">Custo produto</span>
                          <span className="text-amber-600">Custos negócio</span>
                          <span className="text-green-600">Lucro (margem p/ desconto)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isBelowCost && (
                  <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-300 rounded-xl text-sm text-red-800 font-medium">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>
                      PREJUÍZO: o preço de venda ({formatCurrency(sellingPrice)}) está abaixo do custo total ({formatCurrency(totalCost)}). Você vai perder {formatCurrency(totalCost - sellingPrice)} por unidade!
                    </span>
                  </div>
                )}

                {isBelowMinimum && !isBelowCost && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-300 rounded-xl text-sm text-yellow-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Atenção: o preço de venda ({formatCurrency(sellingPrice)}) está abaixo do mínimo ({formatCurrency(effectiveMinimum)}). Considerando todos os custos do negócio, você terá prejuízo de {formatCurrency(effectiveMinimum - sellingPrice)} por venda.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estoque</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="currentStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque Atual</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="1" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque Mínimo</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="1" placeholder="0" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Alerta quando estoque atingir este valor
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Localização</FormLabel>
                        <FormControl>
                          <Input placeholder="Prateleira A3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status & Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status e Observações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-sm font-medium">Produto Ativo</FormLabel>
                        <FormDescription className="text-xs">
                          Produtos inativos não aparecem nas vendas
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Anotações sobre o produto..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/produtos")}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : isEditing ? (
                  "Atualizar Produto"
                ) : (
                  "Cadastrar Produto"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
}

// ── Reusable cost field component ──
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
  const display = value ?? aiDefault;

  return (
    <div className={`rounded-xl border p-3 ${isAI ? "bg-amber-50/50 border-amber-200" : "bg-white border-gray-200"}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className={isAI ? "text-amber-600" : "text-gray-600"}>{icon}</span>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        {isAI && <Sparkles className="w-3 h-3 text-amber-500 ml-auto" title="Estimativa IA" />}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={isAI ? "" : display}
          placeholder={`~${aiDefault}% (estimado)`}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "" || val === undefined) { onChange(null); return; }
            onChange(parseFloat(val));
          }}
          className="h-8 text-sm"
        />
        <span className="text-xs text-gray-500 flex-shrink-0">%</span>
      </div>
      <p className="text-[10px] text-gray-400 mt-1">{hint}</p>
      {!isAI && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[10px] text-amber-600 hover:text-amber-700 mt-1 underline"
        >
          Usar estimativa ({aiDefault}%)
        </button>
      )}
    </div>
  );
}
