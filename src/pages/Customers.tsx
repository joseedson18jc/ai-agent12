import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerService } from "@/services/customer.service";
import { formatCPF, formatPhone } from "@/utils/formatters";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Search, Plus, Eye, Pencil, Trash2, MessageCircle, Users, Loader2,
} from "lucide-react";

const PAGE_SIZE = 10;

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await CustomerService.list({
        search,
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setCustomers(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await CustomerService.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadCustomers();
    } catch {
      // handle silently
    } finally {
      setDeleting(false);
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    const number = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
    window.open(`https://wa.me/${number}`, "_blank");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-500 text-sm">Gerencie sua base de clientes</p>
          </div>
          <Button onClick={() => navigate("/customers/new")} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, CPF ou telefone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users className="w-12 h-12 mb-3" />
                <p className="text-lg font-medium text-gray-600">Nenhum cliente encontrado</p>
                <p className="text-sm mt-1">
                  {search
                    ? "Tente alterar os filtros de busca."
                    : "Cadastre seu primeiro cliente para começar."}
                </p>
                {!search && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate("/customers/new")}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Cadastrar Cliente
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="sm:hidden divide-y">
                  {customers.map((customer) => (
                    <div key={customer.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-xs text-gray-500">{formatCPF(customer.cpf)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={customer.status === "active" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {customer.status === "active" ? "Ativo" : "Inativo"}
                          </Badge>
                          {customer.overdueCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {customer.overdueCount} pendência(s)
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">{formatPhone(customer.phone)}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/customers/${customer.id}`)}>
                          <Eye className="w-3 h-3 mr-1" /> Ver
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/customers/${customer.id}/edit`)}>
                          <Pencil className="w-3 h-3 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openWhatsApp(customer.phone)} className="text-green-600">
                          <MessageCircle className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteTarget(customer)} className="text-red-600">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pendências</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.id} className="cursor-pointer hover:bg-gray-50">
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{formatCPF(customer.cpf)}</TableCell>
                          <TableCell>{formatPhone(customer.phone)}</TableCell>
                          <TableCell>
                            <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                              {customer.status === "active" ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {customer.overdueCount > 0 ? (
                              <Badge variant="destructive">
                                {customer.overdueCount} atrasada(s)
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">Nenhuma</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/customers/${customer.id}`)}
                                title="Visualizar"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/customers/${customer.id}/edit`)}
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openWhatsApp(customer.phone)}
                                title="WhatsApp"
                                className="text-green-600 hover:text-green-700"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteTarget(customer)}
                                title="Excluir"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

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

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cliente{" "}
              <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
