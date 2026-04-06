import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import productService from "@/services/product.service";
import api from "@/services/api";
import { formatCurrency } from "@/utils/formatters";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Search, Plus, Eye, Pencil, LayoutGrid, List, Package, AlertTriangle,
} from "lucide-react";

const PAGE_SIZE = 12;

// Categories loaded dynamically from API

const STOCK_FILTERS = [
  { value: "all", label: "Todo Estoque" },
  { value: "in_stock", label: "Em Estoque" },
  { value: "low_stock", label: "Estoque Baixo" },
  { value: "out_of_stock", label: "Sem Estoque" },
];

function MarginIndicator({ margin }: { margin: number }) {
  const color =
    margin > 40 ? "bg-green-500" : margin >= 15 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-sm">{margin.toFixed(1)}%</span>
    </div>
  );
}

function StockBadge({ current, min }: { current: number; min: number }) {
  if (current <= 0) {
    return <span className="text-red-600 font-semibold text-sm">Sem estoque</span>;
  }
  if (current <= min) {
    return <span className="text-red-600 font-semibold text-sm">{current} un. (baixo)</span>;
  }
  return <span className="text-sm text-gray-700">{current} un.</span>;
}

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await productService.getAll({
        search,
        categoryId: category === "all" ? undefined : category,
        lowStock: stockFilter === "low_stock" ? true : undefined,
        page,
        limit: PAGE_SIZE,
      });
      setProducts(result.data || []);
      const total = result.pagination?.total || result.total || 0;
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, category, brand, stockFilter, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    // Load categories from API
    api.get<any>("/categories").then((res) => {
      setCategories(res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, category, brand, stockFilter]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
            <p className="text-gray-500 text-sm">Gerencie seu catálogo de produtos</p>
          </div>
          <Button onClick={() => navigate("/produtos/novo")} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Produto
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, SKU ou código de barras..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Marca"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full sm:w-[150px]"
              />
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-full sm:w-[170px]">
                  <SelectValue placeholder="Estoque" />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_FILTERS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="w-full h-40 rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-5 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Package className="w-12 h-12 mb-3" />
              <p className="text-lg font-medium text-gray-600">Nenhum produto encontrado</p>
              <p className="text-sm mt-1">
                {search || category !== "all" || brand || stockFilter !== "all"
                  ? "Tente alterar os filtros de busca."
                  : "Cadastre seu primeiro produto para começar."}
              </p>
              {!search && category === "all" && !brand && stockFilter === "all" && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/produtos/novo")}
                >
                  <Plus className="w-4 h-4 mr-2" /> Cadastrar Produto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => navigate(`/produtos/${product.id}`)}
              >
                <div className="aspect-[4/3] bg-gray-100 relative">
                  {product.photo ? (
                    <img
                      src={product.photo}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Package className="w-12 h-12" />
                    </div>
                  )}
                  {product.stock <= (product.minStock || 0) && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Estoque baixo
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {product.brand || "Sem marca"} - {product.category?.name || "-"}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(product.sellingPrice)}
                    </p>
                    <StockBadge current={product.stock} min={product.minStock || 0} />
                  </div>
                  {product.marginPercent !== undefined && (
                    <div className="mt-2">
                      <MarginIndicator margin={product.marginPercent} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Table View */
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Preço Venda</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Margem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.photo ? (
                            <img
                              src={product.photo}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            {product.sku && (
                              <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {product.category?.name || "-"}
                      </TableCell>
                      <TableCell className="text-sm">{product.brand || "-"}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(product.sellingPrice)}
                      </TableCell>
                      <TableCell>
                        <StockBadge current={product.stock} min={product.minStock || 0} />
                      </TableCell>
                      <TableCell>
                        {product.marginPercent !== undefined ? (
                          <MarginIndicator margin={product.marginPercent} />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/produtos/${product.id}`)}
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/produtos/${product.id}/editar`)}
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <PaginationItem key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <PaginationLink
                      onClick={() => setPage(p)}
                      isActive={p === page}
                      className="cursor-pointer"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </MainLayout>
  );
}
