import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCNPJ, formatPhone } from "@/utils/formatters";
import { PageHeader, Panel, EmptyState, InitialsAvatar, rise } from "@/components/imperio";
import { Truck, Plus, Search, Pencil, Trash2, MessageCircle, Phone, Mail, X, RefreshCw, AlertTriangle, MapPin } from "lucide-react";
import supplierService, { type SupplierItem } from "@/services/supplier.service";

const LIMIT = 12;

function waLink(phone: string, name: string) {
  const clean = phone.replace(/\D/g, "");
  const number = clean.startsWith("55") ? clean : `55${clean}`;
  const first = name.split(" ")[0];
  return `https://wa.me/${number}?text=${encodeURIComponent(`Olá${first ? `, ${first}` : ""}! Aqui é da Óticas Império, tudo bem?`)}`;
}

function ContactActions({ s, compact = false }: { s: SupplierItem; compact?: boolean }) {
  const wa = s.whatsapp || null;
  return (
    <>
      {wa && (
        <Button size={compact ? "icon" : "sm"} variant="ghost" asChild title="WhatsApp">
          <a href={waLink(wa, s.contactName || s.name)} target="_blank" rel="noreferrer" aria-label="Abrir WhatsApp">
            <MessageCircle className="text-success" />
          </a>
        </Button>
      )}
      {s.phone && (
        <Button size={compact ? "icon" : "sm"} variant="ghost" asChild title="Ligar">
          <a href={`tel:${s.phone.replace(/\D/g, "")}`} aria-label="Ligar">
            <Phone className="text-primary" />
          </a>
        </Button>
      )}
      {s.email && (
        <Button size={compact ? "icon" : "sm"} variant="ghost" asChild title="E-mail">
          <a href={`mailto:${s.email}`} aria-label="Enviar e-mail">
            <Mail className="text-primary" />
          </a>
        </Button>
      )}
    </>
  );
}

export default function Suppliers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SupplierItem | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await supplierService.list({ page, limit: LIMIT, search: search || undefined });
      setSuppliers(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch (e) {
      setError(true);
      toast({ title: "Erro ao carregar fornecedores", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await supplierService.remove(deleteTarget.id);
      toast({ title: "Fornecedor removido", description: deleteTarget.name });
      if (suppliers.length === 1 && page > 1) setPage(page - 1);
      else fetchSuppliers();
    } catch (e) {
      toast({ title: "Erro ao remover fornecedor", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const location = (s: SupplierItem) => [s.city, s.state].filter(Boolean).join(" / ");

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Cadastros"
          title="Fornecedores"
          description={loading ? "Carregando…" : `${total} ${total === 1 ? "fornecedor cadastrado" : "fornecedores cadastrados"}`}
          icon={Truck}
          actions={
            <Button onClick={() => navigate("/fornecedores/novo")}>
              <Plus /> Novo fornecedor
            </Button>
          }
        />

        <Panel {...rise(1)} bodyClassName="p-0">
          <div className="p-5 pb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ ou contato"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <button type="button" onClick={() => setSearchInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar busca">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 border-t border-border p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertTriangle}
              title="Não foi possível carregar"
              description="Verifique sua conexão e tente novamente."
              action={<Button variant="outline" onClick={fetchSuppliers}><RefreshCw /> Tentar novamente</Button>}
            />
          ) : suppliers.length === 0 ? (
            <EmptyState
              icon={Truck}
              title={search ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
              description={search ? `Nada corresponde a "${search}".` : "Cadastre seus fornecedores de armações, lentes e acessórios."}
              action={
                search ? (
                  <Button variant="outline" onClick={() => setSearchInput("")}>Limpar busca</Button>
                ) : (
                  <Button onClick={() => navigate("/fornecedores/novo")}><Plus /> Cadastrar fornecedor</Button>
                )
              }
            />
          ) : (
            <>
              {/* mobile cards */}
              <div className="divide-y divide-border border-t border-border md:hidden">
                {suppliers.map((s) => (
                  <div key={s.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <InitialsAvatar name={s.name} size="sm" />
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/fornecedores/${s.id}/editar`)}>
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="num truncate text-xs text-muted-foreground">
                          {s.cnpj ? formatCNPJ(s.cnpj) : "Sem CNPJ"}
                          {s.contactName ? ` · ${s.contactName}` : ""}
                        </p>
                        {(s.phone || location(s)) && (
                          <p className="num truncate text-xs text-muted-foreground">
                            {s.phone ? formatPhone(s.phone) : ""}{s.phone && location(s) ? " · " : ""}{location(s)}
                          </p>
                        )}
                        {s.category && <Badge variant="gold" className="mt-1.5">{s.category}</Badge>}
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <ContactActions s={s} compact />
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/fornecedores/${s.id}/editar`)} aria-label="Editar">
                        <Pencil />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(s)} aria-label="Remover">
                        <Trash2 className="text-danger" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Fornecedor</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="pr-5 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((s) => (
                      <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/fornecedores/${s.id}/editar`)}>
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-3">
                            <InitialsAvatar name={s.name} size="sm" />
                            <div className="min-w-0">
                              <p className="font-medium">{s.name}</p>
                              <p className="num text-xs text-muted-foreground">
                                {s.cnpj ? formatCNPJ(s.cnpj) : "Sem CNPJ"}
                                {location(s) && <><MapPin className="mx-1 inline h-3 w-3" />{location(s)}</>}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{s.contactName || "—"}</p>
                          {s.contactRole && <p className="text-xs text-muted-foreground">{s.contactRole}</p>}
                        </TableCell>
                        <TableCell className="num text-sm">{s.phone ? formatPhone(s.phone) : s.whatsapp ? formatPhone(s.whatsapp) : "—"}</TableCell>
                        <TableCell>{s.category ? <Badge variant="gold">{s.category}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.paymentTerms || "—"}</TableCell>
                        <TableCell className="pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-0.5">
                            <ContactActions s={s} compact />
                            <Button size="icon" variant="ghost" onClick={() => navigate(`/fornecedores/${s.id}/editar`)} aria-label="Editar">
                              <Pencil />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(s)} aria-label="Remover">
                              <Trash2 className="text-danger" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                  <span className="num text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" deixará de aparecer nas listas. Produtos e contas vinculados continuam registrados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
