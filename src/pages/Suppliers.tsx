import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCNPJ, formatPhone } from "@/utils/formatters";
import { Truck, Plus, Search, Pencil, Trash2, MessageCircle, Phone } from "lucide-react";
import type { Supplier } from "@/types";
import api from "@/services/api";

export default function Suppliers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      const res = await api.get<any>(`/api/suppliers?${params}`);
      if (res.success) {
        setSuppliers(res.data || []);
        setTotal(res.pagination?.total || 0);
      }
    } catch {
      toast({ title: "Erro", description: "Erro ao carregar fornecedores", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, [page, search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/suppliers/${deleteId}`);
      toast({ title: "Sucesso", description: "Fornecedor removido" });
      fetchSuppliers();
    } catch {
      toast({ title: "Erro", description: "Erro ao remover fornecedor", variant: "destructive" });
    }
    setDeleteId(null);
  };

  const openWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/\D/g, "");
    const number = clean.startsWith("55") ? clean : `55${clean}`;
    window.open(`https://wa.me/${number}?text=Olá ${name}, tudo bem?`, "_blank");
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          </div>
          <Button onClick={() => navigate("/fornecedores/novo")} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" /> Novo Fornecedor
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhum fornecedor encontrado</p>
                <p className="text-sm">Cadastre seu primeiro fornecedor para começar.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.cnpj ? formatCNPJ(s.cnpj) : "-"}</TableCell>
                          <TableCell>{s.contactName || "-"}</TableCell>
                          <TableCell>{s.phone ? formatPhone(s.phone) : "-"}</TableCell>
                          <TableCell>
                            {s.category ? <Badge variant="secondary">{s.category}</Badge> : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {s.whatsapp && (
                                <Button size="sm" variant="ghost" onClick={() => openWhatsApp(s.whatsapp!, s.name)}>
                                  <MessageCircle className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/fornecedores/${s.id}/editar`)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleteId(s.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {suppliers.map((s) => (
                    <Card key={s.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{s.name}</p>
                            <p className="text-sm text-gray-500">{s.cnpj ? formatCNPJ(s.cnpj) : ""}</p>
                            {s.phone && <p className="text-sm text-gray-500">{formatPhone(s.phone)}</p>}
                            {s.category && <Badge variant="secondary" className="mt-1">{s.category}</Badge>}
                          </div>
                          <div className="flex gap-1">
                            {s.whatsapp && (
                              <Button size="sm" variant="ghost" onClick={() => openWhatsApp(s.whatsapp!, s.name)}>
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/fornecedores/${s.id}/editar`)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Anterior
                    </Button>
                    <span className="px-3 py-1 text-sm text-gray-600">
                      Página {page} de {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      Próxima
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este fornecedor? Esta ação pode ser desfeita pelo administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
