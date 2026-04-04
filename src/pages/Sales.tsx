import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  RefreshCw,
  Printer,
  XCircle,
  CalendarIcon,
  ShoppingBag,
  PackageSearch,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SalesOrder, SalesOrderStatus } from "@/types";
import { toast } from "sonner";

type StatusTab = "ALL" | SalesOrderStatus;

const STATUS_CONFIG: Record<
  SalesOrderStatus,
  { label: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  [SalesOrderStatus.QUOTE]: {
    label: "Orcamento",
    color: "bg-slate-100 text-slate-700",
    variant: "outline",
  },
  [SalesOrderStatus.PENDING]: {
    label: "Aguardando Lente",
    color: "bg-blue-100 text-blue-700",
    variant: "default",
  },
  [SalesOrderStatus.IN_PRODUCTION]: {
    label: "Em Producao",
    color: "bg-yellow-100 text-yellow-700",
    variant: "secondary",
  },
  [SalesOrderStatus.READY]: {
    label: "Pronta p/ Retirada",
    color: "bg-green-100 text-green-700",
    variant: "default",
  },
  [SalesOrderStatus.DELIVERED]: {
    label: "Entregue",
    color: "bg-gray-100 text-gray-600",
    variant: "secondary",
  },
  [SalesOrderStatus.CANCELLED]: {
    label: "Cancelada",
    color: "bg-red-100 text-red-700",
    variant: "destructive",
  },
};

const TAB_OPTIONS: { value: StatusTab; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: SalesOrderStatus.PENDING, label: "Aguardando Lente" },
  { value: SalesOrderStatus.IN_PRODUCTION, label: "Em Producao" },
  { value: SalesOrderStatus.READY, label: "Pronta p/ Retirada" },
  { value: SalesOrderStatus.DELIVERED, label: "Entregue" },
  { value: SalesOrderStatus.CANCELLED, label: "Cancelada" },
];

// Mock data
const MOCK_SALES: SalesOrder[] = [
  {
    id: "1",
    orderNumber: "OS-0001",
    customerId: "c1",
    customer: { id: "c1", name: "Maria Silva", cpf: "123.456.789-00", status: "ACTIVE" as any, storeId: "s1", createdAt: "", updatedAt: "" },
    sellerId: "u1",
    status: SalesOrderStatus.PENDING,
    subtotal: 850,
    discount: 50,
    total: 800,
    items: [{ id: "i1", salesOrderId: "1", productId: "p1", quantity: 1, unitPrice: 500, discount: 0, total: 500, createdAt: "", updatedAt: "" }, { id: "i2", salesOrderId: "1", productId: "p2", quantity: 2, unitPrice: 175, discount: 0, total: 350, createdAt: "", updatedAt: "" }],
    storeId: "s1",
    createdAt: "2026-04-04T10:00:00Z",
    updatedAt: "2026-04-04T10:00:00Z",
  },
  {
    id: "2",
    orderNumber: "OS-0002",
    customerId: "c2",
    customer: { id: "c2", name: "Joao Santos", cpf: "987.654.321-00", status: "ACTIVE" as any, storeId: "s1", createdAt: "", updatedAt: "" },
    sellerId: "u1",
    status: SalesOrderStatus.IN_PRODUCTION,
    subtotal: 1200,
    discount: 0,
    total: 1200,
    items: [{ id: "i3", salesOrderId: "2", productId: "p3", quantity: 1, unitPrice: 1200, discount: 0, total: 1200, createdAt: "", updatedAt: "" }],
    storeId: "s1",
    createdAt: "2026-04-03T14:30:00Z",
    updatedAt: "2026-04-03T14:30:00Z",
  },
  {
    id: "3",
    orderNumber: "OS-0003",
    customerId: "c3",
    customer: { id: "c3", name: "Ana Oliveira", status: "ACTIVE" as any, storeId: "s1", createdAt: "", updatedAt: "" },
    sellerId: "u1",
    status: SalesOrderStatus.READY,
    subtotal: 650,
    discount: 100,
    total: 550,
    items: [{ id: "i4", salesOrderId: "3", productId: "p1", quantity: 1, unitPrice: 650, discount: 100, total: 550, createdAt: "", updatedAt: "" }],
    storeId: "s1",
    createdAt: "2026-04-02T09:15:00Z",
    updatedAt: "2026-04-02T09:15:00Z",
  },
  {
    id: "4",
    orderNumber: "OS-0004",
    customerId: "c4",
    customer: { id: "c4", name: "Carlos Pereira", status: "ACTIVE" as any, storeId: "s1", createdAt: "", updatedAt: "" },
    sellerId: "u1",
    status: SalesOrderStatus.DELIVERED,
    subtotal: 2100,
    discount: 200,
    total: 1900,
    items: [{ id: "i5", salesOrderId: "4", productId: "p2", quantity: 1, unitPrice: 2100, discount: 200, total: 1900, createdAt: "", updatedAt: "" }],
    storeId: "s1",
    createdAt: "2026-03-28T16:00:00Z",
    updatedAt: "2026-03-30T10:00:00Z",
  },
  {
    id: "5",
    orderNumber: "OS-0005",
    customerId: "c5",
    customer: { id: "c5", name: "Fernanda Costa", status: "ACTIVE" as any, storeId: "s1", createdAt: "", updatedAt: "" },
    sellerId: "u1",
    status: SalesOrderStatus.CANCELLED,
    subtotal: 450,
    discount: 0,
    total: 450,
    cancelReason: "Cliente desistiu",
    items: [],
    storeId: "s1",
    createdAt: "2026-03-25T11:00:00Z",
    updatedAt: "2026-03-25T15:00:00Z",
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const Sales = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const itemsPerPage = 10;

  const filteredSales = useMemo(() => {
    let result = MOCK_SALES;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.orderNumber.toLowerCase().includes(q) ||
          s.customer?.name.toLowerCase().includes(q)
      );
    }

    if (activeTab !== "ALL") {
      result = result.filter((s) => s.status === activeTab);
    }

    if (startDate) {
      result = result.filter((s) => new Date(s.createdAt) >= startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.createdAt) <= end);
    }

    return result;
  }, [search, activeTab, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCancelOrder = () => {
    if (selectedOrderId) {
      toast.success("Ordem de servico cancelada com sucesso.");
      setCancelDialogOpen(false);
      setSelectedOrderId(null);
    }
  };

  const handleUpdateStatus = (orderId: string) => {
    toast.success("Status atualizado com sucesso.");
  };

  const handlePrint = (orderId: string) => {
    toast.info("Preparando impressao...");
    window.print();
  };

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Vendas</h1>
            <p className="text-muted-foreground">
              Gerencie suas ordens de servico e vendas
            </p>
          </div>
          <Button onClick={() => navigate("/vendas/nova")}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por numero da OS ou nome do cliente..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate
                        ? format(startDate, "dd/MM/yyyy", { locale: ptBR })
                        : "Data inicio"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => { setStartDate(d); setCurrentPage(1); }}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate
                        ? format(endDate, "dd/MM/yyyy", { locale: ptBR })
                        : "Data fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => { setEndDate(d); setCurrentPage(1); }}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                {(startDate || endDate) && (
                  <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                    Limpar datas
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as StatusTab);
            setCurrentPage(1);
          }}
        >
          <TabsList className="flex flex-wrap h-auto gap-1">
            {TAB_OPTIONS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 flex-1" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-10" />
                  </div>
                ))}
              </div>
            ) : paginatedSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-1">
                  Nenhuma venda encontrada
                </h3>
                <p className="text-muted-foreground mb-4">
                  {search || startDate || endDate || activeTab !== "ALL"
                    ? "Tente ajustar os filtros da busca."
                    : "Comece registrando sua primeira venda."}
                </p>
                {!search && !startDate && !endDate && activeTab === "ALL" && (
                  <Button onClick={() => navigate("/vendas/nova")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Venda
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N. OS</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-center">Itens</TableHead>
                      <TableHead className="text-right">Total (R$)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSales.map((sale) => {
                      const cfg = STATUS_CONFIG[sale.status];
                      return (
                        <TableRow
                          key={sale.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/vendas/${sale.id}`)}
                        >
                          <TableCell className="font-medium">
                            {sale.orderNumber}
                          </TableCell>
                          <TableCell>{sale.customer?.name || "-"}</TableCell>
                          <TableCell>
                            {format(new Date(sale.createdAt), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            {sale.items?.length || 0}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(sale.total)}
                          </TableCell>
                          <TableCell>
                            <Badge className={cfg.color}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/vendas/${sale.id}`);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                {sale.status !== SalesOrderStatus.DELIVERED &&
                                  sale.status !== SalesOrderStatus.CANCELLED && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatus(sale.id);
                                      }}
                                    >
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      Atualizar Status
                                    </DropdownMenuItem>
                                  )}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrint(sale.id);
                                  }}
                                >
                                  <Printer className="mr-2 h-4 w-4" />
                                  Imprimir
                                </DropdownMenuItem>
                                {sale.status !== SalesOrderStatus.CANCELLED &&
                                  sale.status !== SalesOrderStatus.DELIVERED && (
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrderId(sale.id);
                                        setCancelDialogOpen(true);
                                      }}
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Cancelar
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
              </div>
            )}
          </CardContent>
        </Card>

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
                  <PaginationLink
                    isActive={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className="cursor-pointer"
                  >
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

        {/* Cancel dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Ordem de Servico</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja cancelar esta ordem de servico? Esta acao
                nao pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Nao, manter</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelOrder}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, cancelar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Sales;
