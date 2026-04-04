import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProductService } from "@/services/product.service";
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
  ArrowLeft, Loader2, Upload, X, Calculator, AlertTriangle, Package,
} from "lucide-react";

const CATEGORIES = [
  { value: "frames", label: "Armações" },
  { value: "lenses", label: "Lentes" },
  { value: "sunglasses", label: "Óculos de Sol" },
  { value: "contact_lenses", label: "Lentes de Contato" },
  { value: "accessories", label: "Acessórios" },
  { value: "cleaning", label: "Limpeza" },
];

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
  const [autoSKU, setAutoSKU] = useState(false);

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

  const totalCost = useMemo(() => (costPrice || 0) + (taxFreight || 0), [costPrice, taxFreight]);

  const suggestedPrice = useMemo(() => {
    if (totalCost <= 0 || !desiredMarkup) return 0;
    return totalCost * (1 + desiredMarkup / 100);
  }, [totalCost, desiredMarkup]);

  const marginPercent = useMemo(() => {
    if (!sellingPrice || sellingPrice <= 0) return 0;
    return ((sellingPrice - totalCost) / sellingPrice) * 100;
  }, [sellingPrice, totalCost]);

  const profitAmount = useMemo(() => {
    return (sellingPrice || 0) - totalCost;
  }, [sellingPrice, totalCost]);

  const marginColor = useMemo(() => {
    if (marginPercent > 40) return "text-green-600";
    if (marginPercent >= 15) return "text-yellow-600";
    return "text-red-600";
  }, [marginPercent]);

  const marginBg = useMemo(() => {
    if (marginPercent > 40) return "bg-green-50 border-green-200";
    if (marginPercent >= 15) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  }, [marginPercent]);

  const isBelowMinimum = sellingPrice > 0 && minimumPrice > 0 && sellingPrice < minimumPrice;

  useEffect(() => {
    loadSuppliers();
    if (isEditing) loadProduct();
  }, [id]);

  const loadSuppliers = async () => {
    try {
      const result = await ProductService.getSuppliers();
      setSuppliers(result || []);
    } catch {
      // suppliers optional
    }
  };

  const loadProduct = async () => {
    setInitialLoading(true);
    try {
      const product = await ProductService.getById(id!);
      form.reset({
        name: product.name || "",
        category: product.category || "",
        brand: product.brand || "",
        supplier: product.supplier || "",
        sku: product.sku || "",
        barcode: product.barcode || "",
        description: product.description || "",
        costPrice: product.costPrice || 0,
        taxFreight: product.taxFreight || 0,
        desiredMarkup: product.desiredMarkup || 100,
        sellingPrice: product.sellingPrice || 0,
        minimumPrice: product.minimumPrice || 0,
        currentStock: product.currentStock || 0,
        minStock: product.minStock || 0,
        location: product.location || "",
        active: product.active !== false,
        notes: product.notes || "",
      });
      if (product.photoUrl) {
        setPhotoPreview(product.photoUrl);
      }
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do produto.",
        variant: "destructive",
      });
      navigate("/products");
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
      if (isEditing) {
        await ProductService.update(id!, data, photoFile || undefined);
        toast({ title: "Sucesso", description: "Produto atualizado com sucesso!" });
      } else {
        await ProductService.create(data, photoFile || undefined);
        toast({ title: "Sucesso", description: "Produto cadastrado com sucesso!" });
      }
      navigate("/products");
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/products")}>
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
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
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

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Precificação
                </CardTitle>
                <CardDescription>
                  Defina custos e preço de venda. Os cálculos são atualizados em tempo real.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço de Custo (R$) *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="taxFreight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impostos + Frete (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col justify-end">
                    <p className="text-xs text-gray-500 mb-1">Custo Total</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(totalCost)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="desiredMarkup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Markup Desejado (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="1" min="0" placeholder="100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col justify-end">
                    <p className="text-xs text-gray-500 mb-1">Preço Sugerido</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(suggestedPrice)}
                      </p>
                      {suggestedPrice > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={applySuggestedPrice}
                          className="text-xs h-7"
                        >
                          Aplicar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço de Venda (R$) *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
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
                        <FormLabel>Preço Mínimo (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Margin Summary */}
                {sellingPrice > 0 && (
                  <div className={`rounded-lg border p-4 ${marginBg}`}>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Margem</p>
                        <p className={`text-xl font-bold ${marginColor}`}>
                          {marginPercent.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Lucro por Unidade</p>
                        <p className={`text-xl font-bold ${marginColor}`}>
                          {formatCurrency(profitAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Classificação</p>
                        <p className={`text-sm font-semibold mt-1 ${marginColor}`}>
                          {marginPercent > 40
                            ? "Boa margem"
                            : marginPercent >= 15
                            ? "Margem moderada"
                            : "Margem baixa"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isBelowMinimum && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Atenção: o preço de venda ({formatCurrency(sellingPrice)}) está abaixo do preço mínimo ({formatCurrency(minimumPrice)}).
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
                onClick={() => navigate("/products")}
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
