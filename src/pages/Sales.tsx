import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, Plus, MoreHorizontal, Eye, RefreshCw, Printer, XCircle,
  CalendarIcon, ShoppingBag, PackageSearch,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SalesOrder, SalesOrderStatus } from "@/types";
import { toast } from "sonner";

type StatusTab = "ALL" | SalesOrderStatus;

const STATUS_CONFIG: Record<SalesOrderStatus, { label: string; className: string }> = {
  [SalesOrderStatus.QUOTE]:         { label: "Orçamento",           className: "bg-slate-100 text-slate-700 border-slate-200" },
  [SalesOrderStatus.PENDING]:       { label: "Aguardando Lente",    className: "bg-blue-100 text-blue-700 border-blue-200" },
  [SalesOrderStatus.IN_PRODUCTION]: { label: "Em Produção",         className: "bg-amber-100 text-amber-700 border-amber-200" },
  [SalesOrderStatus.READY]:         { label: "Pronta p/ Retirada",  className: "bg-green-100 text-green-700 border-green-200" },
  [SalesOrderStatus.DELIVERED]:     { label: "Entregue",            className: "bg-gray-100 text-gray-600 border-gray-200" },
  [SalesOrderStatus.CANCELLED]:     { label: "Cancelada",           className: "bg-red-100 text-red-700 border-red-200" },
};

const TAB_OPTIONS: { value: StatusTab; label: string }[] = [
  { value: "ALL",                         label: "Todas" },
  { value: SalesOrderStatus.PENDING,      label: "Aguard. Lente" },
  { value: SalesOrderStatus.IN_PRODUCTION,label: "Em Produção" },
  { value: SalesOrderStatus.READY,        label: "Retirada" },
  { value: SalesOrderStatus.DELIVERED,    label: "Entregue" },
  { value: SalesOrderStatus.CANCELLED,    label: "Cancelada" },
];

// Mock data
const MOCK_SALES: SalesOrder[] = [
  {
    id: "1", orderNumber: "OS-0001", customerId: "c1",
    customer: { id: "c1", name: "Maria Silva", cpf: "123.456.789-00", status: "ACTIVE" as any, storeId: "s1", createdAt: "", updatedAt: "" },
    sellerId: "u1", status: SalesOrderStatus.PENDING,
    subtotal: 850, discount: 50, total: 800,
    items: [{ id: "i1", salesOrderId: "1", productId: "p1", quantity: 1, unitPrice: 500, discount: 0, total: 500, createdAt: "", updatedAt: "" }],
    storeId: "s1", createdAt: "2026-04-04T10:00:00Z", updatedAt: "2026-04-04T10:00:00Z",
  },
  {
    id: "2", orderNumber: "OS-0002", customerId: "c2",
    customer: { id: "c2", name: "João Santos", cpf: "987.654.321-00", status: "ACTIVE" as any, storeId: "s1", createdAt: "", updatedAt: "" },
    sellerId: "u1", status: SalesOrderStatus.IN_PRODUCTION,
    subtotal: 1200, discount: 0, total: 1200,
    items: [{ id: "i3", salesOrderId: "2", productId: "p3", quantity: 1, unitPrice: 1200, discount: 0, total: 1200, createdAt: "", updatedAt: "" }],
    storeId: "s1", createdAt: "2026-04-03T14:30:00Z", updatedAt: "2026-04-03T14:30:00Z",
  },
  {
    id: "3", orderNumber: "OS-0003", customerId: "c3",
    customer: { id: "c3", name: "Ana Oliveira", status: "ACTIVE" as any, storeId: "s1", createdAt: "", updatedAt: "" },
    sellerId: "u1", status: SalesOrderStatus.READY,
    subtotal: 650, discount: 100, total: 550,
    items: [{ id: "i4", salesOrderId: "3", productId: "p1", quantity: 1, unitPrice: 650, discount: 100, total: 550, createdAt: "", updatedAt: "" }],
    storeId: "s1", createdAt: "2026-04-02T09:15:00Z", updatedAt: "2026-04-02T09:15:00Z",
  },
  {
    id: "4", orderNumber: "OS-0004", customerId: "c4",
    customer: { id: "c4", name: "Carlos Pereira", status: "ACTIVE" as any, storeId: "s1", createdAt: "", updatedAt: "" },
    sellerId: "u1", status: SalesOrderStatus.DELIVERED,
    subtotal: 2100, discount: 200, total: 1900,
    items: [{ id: "i5", salesOrderId: "4", productId: "p2", quantity: 1, unitPrice: 2100, discount: 200, total: 1900, createdAt: "", updatedAt: "" }],
    storeId: "s1", createdAt: "2026-03-28T16:00:00Z", updatedAt: "2026-03-30T10:00:00Z",
  },
  {
    id: "5", orderNumber: "OS-0005", customerId: "c5",
    customer: { id: "c5", name: "Fernanda Costa", status: "ACTIVE" as any, storeId: "s1", createdAt: "", updatedAt: "" },
    sellerId: "u1", status: SalesOrderStatus.CANCELLED,
    subtotal: 450, discount: 0, total: 450, cancelReason: "Cliente desistiu",
    items: [],
    storeId: "s1", createdAt: "2026-03-25T11:00:00Z", updatedAt: "2026-03-25T15:00:00Z",
  },
];

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const Sales = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const itemsPerPage = 10;

  const filteredSales = useMemo(() => {
    let result = MOCK_SALES;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) => s.orderNumber.toLowerCase().includes(q) || s.customer?.name.toLowerCase().includes(q)
      );
    }
    if (activeTab !== "ALL") result = result.filter((s) => s.status === activeTab);
    if (startDate) result = result.filter((s) => new Date(s.createdAt) >= startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.createdAt) <= end);
    }
    return result;
  }, [search, activeTab, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));
  const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleCancelOrder = () => {
    if (selectedOrderId) {
      toast.success("Ordem de serviço cancelada com sucesso.");
      setCancelDialogOpen(false);
      setSelectedOrderId(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Vendas / OS</h1>
            <p className="text-gray-500 text-sm">Gerencie suas ordens de serviço e vendas</p>
          </div>
          <Button onClick={() => navigate("/vendas/nova")} className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
            <Plus className="mr-2 h-4 w-4" />Nova Venda
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nº OS ou nome do cliente..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {startDate ? format(startDate, "dd/MM/yy", { locale: ptBR }) : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setCurrentPage(1); }} locale={ptBR} />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {endDate ? format(endDate, "dd/MM/yy", { locale: ptBR }) : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setCurrentPage(1); }} locale={ptBR} />
                  </PopoverContent>
                </Popover>
                {(startDate || endDate) && (
                  <Button variant="ghost" size="sm" className="h-9 text-gray-500" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as StatusTab); setCurrentPage(1); }}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1">
            {TAB_OPTIONS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm rounded-lg">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* List */}
        {paginatedSales.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <PackageSearch className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-base font-semibold text-gray-700 mb-1">Nenhuma venda encontrada</h3>
              <p className="text-gray-400 text-sm mb-4">
                {search || startDate || endDate || activeTab !== "ALL"
                  ? "Tente ajustar os filtros de busca."
                  : "Comece registrando sua primeira venda."}
              </p>
              {!search && !startDate && !endDate && activeTab === "ALL" && (
                <Button onClick={() => navigate("/vendas/nova")} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="mr-2 h-4 w-4" />Nova Venda
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {paginatedSales.map((sale) => {
                const cfg = STATUS_CONFIG[sale.status];
                return (
                  <div
                    key={sale.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer active:bg-gray-50"
                    onClick={() => navigate(`/vendas/${sale.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {sale.customer?.name ? getInitials(sale.customer.name) : "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{sale.customer?.name || "Avulso"}</p>
                          <p className="text-xs text-gray-400">{sale.orderNumber}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900 text-sm">{fmt(sale.total)}</p>
                        <p className="text-xs text-gray-400">{format(new Date(sale.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge className={`${cfg.className} border text-xs font-medium`}>{cfg.label}</Badge>
                      <span className="text-xs text-gray-400">{sale.items?.length || 0} item(s)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <Card className="hidden sm:block">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Nº OS</TableHead>
                      <TableHead className="font-semibold">Cliente</TableHead>
                      <TableHead className="font-semibold">Data</TableHead>
                      <TableHead className="text-center font-semibold">Itens</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSales.map((sale) => {
                      const cfg = STATUS_CONFIG[sale.status];
                      return (
                        <TableRow
                          key={sale.id}
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => navigate(`/vendas/${sale.id}`)}
                        >
                          <TableCell className="font-semibold text-blue-600">{sale.orderNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {sale.customer?.name ? getInitials(sale.customer.name) : "?"}
                              </div>
                              <span className="text-sm">{sale.customer?.name || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {format(new Date(sale.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-center text-sm">{sale.items?.length || 0}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(sale.total)}</TableCell>
                          <TableCell>
                            <Badge className={`${cfg.className} border text-xs font-medium`}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/vendas/${sale.id}`); }}>
                                  <Eye className="mr-2 h-4 w-4" />Ver Detalhes
                                </DropdownMenuItem>
                                {sale.status !== SalesOrderStatus.DELIVERED && sale.status !== SalesOrderStatus.CANCELLED && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.success("Status atualizado!"); }}>
                                    <RefreshCw className="mr-2 h-4 w-4" />Atualizar Status
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info("Preparando impressão..."); window.print(); }}>
                                  <Printer className="mr-2 h-4 w-4" />Imprimir
                                </DropdownMenuItem>
                                {sale.status !== SalesOrderStatus.CANCELLED && sale.status !== SalesOrderStatus.DELIVERED && (
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={(e) => { e.stopPropagation(); setSelectedOrderId(sale.id); setCancelDialogOpen(true); }}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />Cancelar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Pagination */}
        {filteredSales.length > itemsPerPage && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink isActive={currentPage === i + 1} onClick={() => setCurrentPage(i + 1)} className="cursor-pointer">
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      {/* Cancel dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Ordem de Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta ordem de serviço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelOrder} className="bg-red-600 hover:bg-red-700">
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Sales;
