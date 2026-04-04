import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/formatters";
import { Eye, Plus, FileText, AlertTriangle } from "lucide-react";
import type { Prescription } from "@/types";
import api from "@/services/api";

export default function Prescriptions() {
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, expiring, expired
  const [search, setSearch] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Prescription | null>(null);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter === "expiring") params.set("expiring", "true");
      if (filter === "expired") params.set("expired", "true");
      const res = await api.get<any>(`/api/prescriptions?${params}`);
      if (res.success) setPrescriptions(res.data || []);
    } catch {
      toast({ title: "Erro", description: "Erro ao carregar receitas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrescriptions(); }, [filter, search]);

  const getStatusBadge = (p: Prescription) => {
    const now = new Date();
    const validity = new Date(p.validity);
    const daysLeft = Math.ceil((validity.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (p.isExpired || daysLeft <= 0) {
      return <Badge variant="destructive">Vencida</Badge>;
    }
    if (daysLeft <= 30) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Vence em {daysLeft} dias</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600">Válida</Badge>;
  };

  const formatDegree = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  };

  const lensTypeLabels: Record<string, string> = {
    SINGLE_VISION: "Visão Simples",
    BIFOCAL: "Bifocal",
    MULTIFOCAL: "Multifocal / Progressiva",
  };

  const treatmentLabels: Record<string, string> = {
    ANTIREFLECTIVE: "Antirreflexo",
    PHOTOCHROMIC: "Fotossensível",
    BLUE_LIGHT: "Filtro Luz Azul",
    TRANSITIONS: "Transitions",
  };

  const openDetail = (p: Prescription) => {
    setSelected(p);
    setDetailOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Receitas Ópticas</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Buscar por paciente ou médico..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="expiring">Vencendo em 30 dias</SelectItem>
                  <SelectItem value="expired">Vencidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhuma receita encontrada</p>
                <p className="text-sm">As receitas são cadastradas a partir do perfil do cliente.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Tipo de Lente</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.map((p) => (
                    <TableRow key={p.id} className={p.isExpired ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{(p as any).customer?.name || "-"}</TableCell>
                      <TableCell>{formatDate(p.date)}</TableCell>
                      <TableCell>{p.doctor || "-"}{p.doctorCrm ? ` (CRM: ${p.doctorCrm})` : ""}</TableCell>
                      <TableCell>{p.lensType ? lensTypeLabels[p.lensType] || p.lensType : "-"}</TableCell>
                      <TableCell>{formatDate(p.validity)}</TableCell>
                      <TableCell>{getStatusBadge(p)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openDetail(p)}>
                          <Eye className="h-4 w-4" /> Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Detalhes da Receita
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Cliente:</span>
                  <p className="font-medium">{(selected as any).customer?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Data da Receita:</span>
                  <p className="font-medium">{formatDate(selected.date)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Médico:</span>
                  <p className="font-medium">{selected.doctor || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500">CRM:</span>
                  <p className="font-medium">{selected.doctorCrm || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Validade:</span>
                  <p className="font-medium">{formatDate(selected.validity)} {getStatusBadge(selected)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Tipo de Lente:</span>
                  <p className="font-medium">{selected.lensType ? lensTypeLabels[selected.lensType] || selected.lensType : "-"}</p>
                </div>
              </div>

              {selected.treatments && selected.treatments.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500">Tratamentos:</span>
                  <div className="flex gap-2 mt-1">
                    {selected.treatments.map((t) => (
                      <Badge key={t} variant="secondary">{treatmentLabels[t] || t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Eye Data Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[100px]">Olho</TableHead>
                      <TableHead>Esférico</TableHead>
                      <TableHead>Cilíndrico</TableHead>
                      <TableHead>Eixo</TableHead>
                      <TableHead>DNP</TableHead>
                      <TableHead>Altura</TableHead>
                      <TableHead>Adição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold text-blue-600">OD (Direito)</TableCell>
                      <TableCell>{formatDegree(selected.odSpherical)}</TableCell>
                      <TableCell>{formatDegree(selected.odCylindrical)}</TableCell>
                      <TableCell>{selected.odAxis !== null && selected.odAxis !== undefined ? `${selected.odAxis}°` : "-"}</TableCell>
                      <TableCell>{selected.odDnp ? `${selected.odDnp} mm` : "-"}</TableCell>
                      <TableCell>{selected.odHeight ? `${selected.odHeight} mm` : "-"}</TableCell>
                      <TableCell>{formatDegree(selected.odAddition)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-green-600">OE (Esquerdo)</TableCell>
                      <TableCell>{formatDegree(selected.oeSphrical)}</TableCell>
                      <TableCell>{formatDegree(selected.oeCylindrical)}</TableCell>
                      <TableCell>{selected.oeAxis !== null && selected.oeAxis !== undefined ? `${selected.oeAxis}°` : "-"}</TableCell>
                      <TableCell>{selected.oeDnp ? `${selected.oeDnp} mm` : "-"}</TableCell>
                      <TableCell>{selected.oeHeight ? `${selected.oeHeight} mm` : "-"}</TableCell>
                      <TableCell>{formatDegree(selected.oeAddition)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {selected.notes && (
                <div>
                  <span className="text-sm text-gray-500">Observações:</span>
                  <p className="mt-1 text-sm bg-gray-50 p-3 rounded">{selected.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
