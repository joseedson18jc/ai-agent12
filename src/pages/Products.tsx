import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import productService, {
  type ProductCategoryOption,
  type ProductSort,
  type ProductStockFilter,
  type ProductSummary,
} from "@/services/product.service";
import type { Product } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import MainLayout from "@/components/layout/MainLayout";
import {
  PageHeader, Panel, StatCard, StatusPill, EmptyState, InsightCard, rise,
} from "@/components/imperio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, Plus, Pencil, LayoutGrid, List, Package, AlertTriangle, Trash2,
  Boxes, Coins, TrendingUp, Sparkles, RefreshCw, X, ChevronLeft, ChevronRight,
  PackageX, Percent, Tag, Loader2, EyeOff,
} from "lucide-react";

const PAGE_SIZE = 12;

/** Products with showOnline === false are hidden from the public website. */
const isHiddenOnline = (p: Product) => (p as Product & { showOnline?: boolean }).showOnline === false;

function OfflinePill({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="Oculto no site — não aparece na vitrine online"
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border"
    >
      <EyeOff className="h-3 w-3" />
      {!compact && "Fora do site"}
    </span>
  );
}
const VIEW_KEY = "imperio.products.view";
const SORT_KEY = "imperio.products.sort";

const STOCK_FILTERS: { value: "all" | ProductStockFilter; label: string }[] = [
  { value: "all", label: "Todo o estoque" },
  { value: "in_stock", label: "Em estoque" },
  { value: "low", label: "Estoque baixo" },
  { value: "out", label: "Sem estoque" },
];

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "name", label: "Nome (A–Z)" },
  { value: "recent", label: "Mais recentes" },
  { value: "stock", label: "Menor estoque" },
  { value: "margin", label: "Maior margem" },
  { value: "price", label: "Maior preço" },
];

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

const compactBRL = (v: number) =>
  v >= 100000
    ? `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v / 1000)} mil`
    : formatCurrency(v);

function marginTone(m: number): "success" | "warning" | "danger" {
  if (m >= 40) return "success";
  if (m >= 20) return "warning";
  return "danger";
}

function MarginIndicator({ margin, className }: { margin: number; className?: string }) {
  const tone = marginTone(margin);
  const bar = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-danger";
  const text = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-danger";
  const width = Math.max(4, Math.min(100, margin));
  return (
    <div className={cn("flex items-center gap-2", className)} title="Margem bruta sobre o preço de venda">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${width}%` }} />
      </div>
      <span className={cn("num text-xs font-semibold", text)}>{margin.toFixed(1)}%</span>
    </div>
  );
}

function StockBadge({ current, min }: { current: number; min: number }) {
  if (current <= 0) return <StatusPill tone="danger">Sem estoque</StatusPill>;
  if (current <= min) return <StatusPill tone="warning"><span className="num">{current}</span> un. · baixo</StatusPill>;
  return <StatusPill tone="success"><span className="num">{current}</span> un.</StatusPill>;
}

function ProductThumb({ product, className, iconClass }: { product: Product; className?: string; iconClass?: string }) {
  return product.photo ? (
    <img src={product.photo} alt={product.name} loading="lazy" className={cn("object-cover", className)} />
  ) : (
    <div className={cn("flex items-center justify-center bg-accent text-primary/40", className)}>
      <Package className={iconClass ?? "h-5 w-5"} />
    </div>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const savedState = (location.state as { savedId?: string } | null) ?? null;
  const [highlightId, setHighlightId] = useState<string | null>(savedState?.savedId ?? null);

  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | ProductStockFilter>("all");
  const [sort, setSort] = useState<ProductSort>(() => {
    if (savedState?.savedId) return "recent";
    const s = readLS(SORT_KEY);
    return SORTS.some((o) => o.value === s) ? (s as ProductSort) : "name";
  });
  const [viewMode, setViewMode] = useState<"grid" | "table">(() =>
    readLS(VIEW_KEY) === "grid" ? "grid" : "table"
  );
  const [page, setPage] = useState(1);

  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const requestId = useRef(0);

  // Debounce search typing
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to first page whenever the filters change
  useEffect(() => {
    setPage(1);
  }, [search, category, brand, stockFilter, sort]);

  useEffect(() => writeLS(VIEW_KEY, viewMode), [viewMode]);
  useEffect(() => writeLS(SORT_KEY, sort), [sort]);

  // Drop the router state so a refresh doesn't re-highlight; fade highlight out.
  useEffect(() => {
    if (!highlightId) return;
    navigate(location.pathname, { replace: true, state: null });
    const t = setTimeout(() => setHighlightId(null), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProducts = useCallback(async () => {
    const rid = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await productService.list({
        search,
        categoryId: category === "all" ? undefined : category,
        brand: brand === "all" ? undefined : brand,
        stock: stockFilter === "all" ? undefined : stockFilter,
        sort,
        page,
        limit: PAGE_SIZE,
      });
      if (rid !== requestId.current) return;
      setProducts(res.data || []);
      setTotal(res.pagination?.total ?? (res.data?.length || 0));
      if (res.summary) setSummary(res.summary);
    } catch (err) {
      if (rid !== requestId.current) return;
      const msg = err instanceof Error ? err.message : "Não foi possível carregar os produtos.";
      setError(msg);
      setProducts([]);
      toast({ title: "Erro ao carregar produtos", description: msg, variant: "destructive" });
    } finally {
      if (rid === requestId.current) setLoading(false);
    }
  }, [search, category, brand, stockFilter, sort, page, toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    productService.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!search || category !== "all" || brand !== "all" || stockFilter !== "all";

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategory("all");
    setBrand("all");
    setStockFilter("all");
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await productService.delete(toDelete.id);
      toast({ title: "Produto excluído", description: `"${toDelete.name}" foi removido do catálogo.` });
      setToDelete(null);
      if (products.length === 1 && page > 1) setPage((p) => p - 1);
      else loadProducts();
    } catch (err) {
      toast({
        title: "Não foi possível excluir",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ── Assistente Império — heuristics over the real catalogue summary ──
  const insights = useMemo(() => {
    if (!summary || summary.products === 0) return [];
    const list: { key: string; icon: typeof Sparkles; tone: "success" | "warning" | "info" | "danger" | "gold"; title: string; body: string; action?: { label: string; run: () => void } }[] = [];
    if (summary.outOfStock > 0) {
      list.push({
        key: "out", icon: PackageX, tone: "danger",
        title: `${summary.outOfStock} ${summary.outOfStock === 1 ? "produto está" : "produtos estão"} sem estoque`,
        body: "Itens zerados não podem ser vendidos. Reponha com o fornecedor ou retire do catálogo.",
        action: { label: "Ver sem estoque", run: () => setStockFilter("out") },
      });
    }
    if (summary.lowStock > 0) {
      list.push({
        key: "low", icon: AlertTriangle, tone: "warning",
        title: `${summary.lowStock} ${summary.lowStock === 1 ? "item chegou" : "itens chegaram"} ao estoque mínimo`,
        body: "Programe a reposição antes que acabem.",
        action: { label: "Ver estoque baixo", run: () => setStockFilter("low") },
      });
    }
    if (summary.belowMinimum > 0) {
      list.push({
        key: "min", icon: Tag, tone: "danger",
        title: `${summary.belowMinimum} ${summary.belowMinimum === 1 ? "produto vendido" : "produtos vendidos"} abaixo do preço mínimo`,
        body: "O preço de venda não cobre custo + despesas do negócio. Revise a precificação.",
        action: { label: "Ordenar por margem", run: () => setSort("margin") },
      });
    }
    if (summary.lowMargin > 0) {
      list.push({
        key: "margin", icon: Percent, tone: "warning",
        title: `${summary.lowMargin} ${summary.lowMargin === 1 ? "produto tem" : "produtos têm"} margem abaixo de 20%`,
        body: "Depois de impostos, cartão e comissão, essa margem costuma virar prejuízo.",
      });
    }
    if (summary.costValue > 0 && summary.saleValue > summary.costValue) {
      const potential = summary.saleValue - summary.costValue;
      list.push({
        key: "potential", icon: TrendingUp, tone: "success",
        title: `Lucro bruto potencial de ${formatCurrency(potential)} no estoque`,
        body: `Margem média do catálogo: ${summary.avgMargin.toFixed(1)}%.`,
      });
    }
    return list.slice(0, 4);
  }, [summary]);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
      (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
    );
    const out: (number | "gap")[] = [];
    pages.forEach((p, i) => {
      if (i > 0 && p - pages[i - 1] > 1) out.push("gap");
      out.push(p);
    });
    return out;
  }, [totalPages, page]);

  const editPath = (p: Product) => `/produtos/${p.id}/editar`;

  const RowActions = ({ product }: { product: Product }) => (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(editPath(product))} aria-label="Editar produto" title="Editar">
        <Pencil className="h-4 w-4" />
      </Button>
      {isAdmin && (
        <Button
          size="icon" variant="ghost"
          className="h-8 w-8 text-danger hover:bg-danger-soft hover:text-danger"
          onClick={() => setToDelete(product)} aria-label="Excluir produto" title="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Catálogo"
          title="Produtos"
          description="Armações, lentes e acessórios — com estoque, preço e margem em um só lugar."
          icon={Package}
          actions={
            <Button onClick={() => navigate("/produtos/novo")}>
              <Plus className="h-4 w-4" /> Novo produto
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {!summary ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[112px] rounded-2xl" />)
          ) : (
            <>
              <StatCard {...rise(1)} label="Produtos cadastrados" value={summary.products} icon={Package} tone="navy"
                hint={`${summary.brands.length} marcas`} />
              <StatCard {...rise(2)} label="Unidades em estoque" value={summary.units.toLocaleString("pt-BR")} icon={Boxes} tone="info"
                hint="Somatório de todas as peças" />
              <StatCard {...rise(3)} label="Estoque a custo" value={compactBRL(summary.costValue)} icon={Coins} tone="gold"
                hint="Capital investido em mercadoria" />
              <StatCard {...rise(4)} featured label="Estoque a preço de venda" value={compactBRL(summary.saleValue)} icon={TrendingUp}
                hint={summary.costValue > 0 ? `+${formatCurrency(summary.saleValue - summary.costValue)} potencial` : undefined} />
              <StatCard style={rise(5).style} className="animate-rise col-span-2 lg:col-span-1" label="Estoque baixo" value={summary.lowStock}
                icon={AlertTriangle} tone={summary.lowStock + summary.outOfStock > 0 ? "warning" : "success"}
                hint={summary.outOfStock > 0 ? `+ ${summary.outOfStock} sem estoque` : "Nenhum item zerado"}
                onClick={() => setStockFilter("low")} />
            </>
          )}
        </div>

        {insights.length > 0 && (
          <Panel {...rise(6)} title="Assistente Império" description="Leituras automáticas do seu catálogo" icon={Sparkles}>
            <div className="grid gap-3 sm:grid-cols-2">
              {insights.map((ins) => (
                <InsightCard
                  key={ins.key} icon={ins.icon} tone={ins.tone} title={ins.title}
                  action={ins.action && (
                    <button type="button" onClick={ins.action.run} className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
                      {ins.action.label} →
                    </button>
                  )}
                >
                  {ins.body}
                </InsightCard>
              ))}
            </div>
          </Panel>
        )}

        {/* Filters */}
        <div className="surface animate-rise p-3 sm:p-4" style={rise(7).style}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, marca, modelo ou código…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <button type="button" onClick={() => setSearchInput("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Limpar busca">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="xl:w-[190px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger className="xl:w-[165px]"><SelectValue placeholder="Marca" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as marcas</SelectItem>
                  {(summary?.brands ?? []).map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as "all" | ProductStockFilter)}>
                <SelectTrigger className="xl:w-[165px]"><SelectValue placeholder="Estoque" /></SelectTrigger>
                <SelectContent>
                  {STOCK_FILTERS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as ProductSort)}>
                <SelectTrigger className="xl:w-[165px]"><SelectValue placeholder="Ordenar" /></SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-2 xl:justify-end">
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="h-3.5 w-3.5" /> Limpar
                </Button>
              )}
              <div className="ml-auto flex rounded-lg border border-border bg-muted/50 p-0.5" role="group" aria-label="Modo de visualização">
                <button
                  type="button" onClick={() => setViewMode("table")} aria-pressed={viewMode === "table"}
                  className={cn("flex h-8 w-9 items-center justify-center rounded-md transition-colors", viewMode === "table" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  title="Lista"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button" onClick={() => setViewMode("grid")} aria-pressed={viewMode === "grid"}
                  className={cn("flex h-8 w-9 items-center justify-center rounded-md transition-colors", viewMode === "grid" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  title="Grade com fotos"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading && products.length === 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="surface overflow-hidden">
                  <Skeleton className="aspect-[4/3] w-full rounded-none" />
                  <div className="space-y-2 p-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-5 w-20" /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="surface divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-11 w-11 rounded-lg" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-28" /></div>
                  <Skeleton className="hidden h-4 w-20 md:block" />
                  <Skeleton className="hidden h-5 w-20 md:block" />
                </div>
              ))}
            </div>
          )
        ) : error ? (
          <div className="surface">
            <EmptyState
              icon={AlertTriangle}
              title="Não foi possível carregar os produtos"
              description={error}
              action={<Button variant="outline" onClick={loadProducts}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button>}
            />
          </div>
        ) : products.length === 0 ? (
          <div className="surface">
            <EmptyState
              icon={Package}
              title={hasFilters ? "Nenhum produto encontrado" : "Seu catálogo está vazio"}
              description={hasFilters ? "Ajuste ou limpe os filtros para ver mais resultados." : "Cadastre armações, lentes e acessórios para começar a vender."}
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}><X className="h-4 w-4" /> Limpar filtros</Button>
                ) : (
                  <Button onClick={() => navigate("/produtos/novo")}><Plus className="h-4 w-4" /> Cadastrar produto</Button>
                )
              }
            />
          </div>
        ) : (
          <div className={cn("relative transition-opacity", loading && "opacity-60")}>
            {loading && (
              <div className="absolute right-3 top-3 z-10"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            )}

            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {products.map((p, i) => (
                  <div
                    key={p.id}
                    style={rise(i).style}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(editPath(p))}
                    onKeyDown={(e) => e.key === "Enter" && navigate(editPath(p))}
                    className={cn(
                      "animate-rise group surface cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md",
                      highlightId === p.id && "ring-2 ring-gold"
                    )}
                  >
                    <div className="relative aspect-[4/3] bg-accent">
                      <ProductThumb product={p} className="h-full w-full" iconClass="h-10 w-10" />
                      <div className="absolute left-2 top-2"><StockBadge current={p.stock} min={p.minStock || 0} /></div>
                      {isHiddenOnline(p) && <div className="absolute bottom-2 left-2"><OfflinePill /></div>}
                      <div className="absolute right-1.5 top-1.5 rounded-lg bg-card/90 opacity-100 shadow-sm backdrop-blur md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                        <RowActions product={p} />
                      </div>
                    </div>
                    <div className="space-y-1.5 p-3 sm:p-4">
                      <p className="eyebrow truncate">{p.category?.name || "Sem categoria"}</p>
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</h3>
                      <p className="truncate text-xs text-muted-foreground">{[p.brand, p.model].filter(Boolean).join(" · ") || "Sem marca"}</p>
                      <div className="flex flex-wrap items-end justify-between gap-1 pt-1">
                        <p className="font-display num text-lg font-semibold">{formatCurrency(p.sellingPrice)}</p>
                        <MarginIndicator margin={p.marginPercent ?? 0} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Mobile list */}
                <div className="surface divide-y divide-border md:hidden">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigate(editPath(p))}
                      className={cn("flex cursor-pointer items-center gap-3 p-3 active:bg-muted/60", highlightId === p.id && "bg-gold-soft/60")}
                    >
                      <ProductThumb product={p} className="h-12 w-12 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{[p.category?.name, p.brand].filter(Boolean).join(" · ")}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <StockBadge current={p.stock} min={p.minStock || 0} />
                          <MarginIndicator margin={p.marginPercent ?? 0} />
                          {isHiddenOnline(p) && <OfflinePill />}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="font-display num text-base font-semibold">{formatCurrency(p.sellingPrice)}</p>
                        <RowActions product={p} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="surface hidden overflow-hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="pl-5">Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Preço de venda</TableHead>
                        <TableHead>Margem</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead className="pr-5 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => {
                        const belowMin = p.minimumPrice > 0 && p.sellingPrice < p.minimumPrice;
                        return (
                          <TableRow
                            key={p.id}
                            onClick={() => navigate(editPath(p))}
                            className={cn("cursor-pointer", highlightId === p.id && "bg-gold-soft/60 hover:bg-gold-soft/70")}
                          >
                            <TableCell className="pl-5">
                              <div className="flex items-center gap-3">
                                <ProductThumb product={p} className="h-11 w-11 shrink-0 rounded-lg" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="max-w-[260px] truncate font-semibold">{p.name}</p>
                                    {isHiddenOnline(p) && <OfflinePill compact />}
                                  </div>
                                  <p className="max-w-[260px] truncate text-xs text-muted-foreground">
                                    {[p.brand, p.model, p.barcode && `Cód. ${p.barcode}`].filter(Boolean).join(" · ") || "—"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.category?.name || "—"}</TableCell>
                            <TableCell className="num text-right text-sm text-muted-foreground">{formatCurrency(p.totalCost ?? p.costPrice)}</TableCell>
                            <TableCell className="text-right">
                              <p className="num font-semibold">{formatCurrency(p.sellingPrice)}</p>
                              {belowMin && (
                                <p className="num text-[11px] font-medium text-danger">mín. {formatCurrency(p.minimumPrice)}</p>
                              )}
                            </TableCell>
                            <TableCell><MarginIndicator margin={p.marginPercent ?? 0} /></TableCell>
                            <TableCell><StockBadge current={p.stock} min={p.minStock || 0} /></TableCell>
                            <TableCell className="pr-5"><RowActions product={p} /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Pagination */}
        {!error && total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Mostrando <span className="num font-semibold text-foreground">{from}–{to}</span> de{" "}
              <span className="num font-semibold text-foreground">{total}</span> produtos
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-9 w-9" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {pageNumbers.map((p, i) =>
                  p === "gap" ? (
                    <span key={`g${i}`} className="px-1 text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={p} size="icon" variant={p === page ? "default" : "ghost"}
                      className="num h-9 w-9" onClick={() => setPage(p)} aria-current={p === page ? "page" : undefined}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button variant="outline" size="icon" className="h-9 w-9" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{toDelete?.name}</span> sairá do catálogo e das buscas de venda.
              O histórico de vendas já registradas é mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-danger text-primary-foreground hover:bg-danger/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
