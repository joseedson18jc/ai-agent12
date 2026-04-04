import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatPhone } from "@/utils/formatters";
import { maskPhone } from "@/utils/masks";
import { FlaskConical, Plus, Pencil, Trash2, MessageCircle } from "lucide-react";
import type { Laboratory } from "@/types";
import api from "@/services/api";

const emptyForm = { name: "", phone: "", whatsapp: "", email: "", contactName: "", terms: "", notes: "" };

export default function Laboratories() {
  const { toast } = useToast();
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchLabs = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>("/api/laboratories");
      if (res.success) setLabs(res.data || []);
    } catch {
      toast({ title: "Erro", description: "Erro ao carregar laboratórios", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLabs(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (lab: Laboratory) => {
    setEditId(lab.id);
    setForm({
      name: lab.name || "",
      phone: lab.phone ? maskPhone(lab.phone) : "",
      whatsapp: lab.whatsapp ? maskPhone(lab.whatsapp) : "",
      email: lab.email || "",
      contactName: lab.contactName || "",
      terms: lab.terms || "",
      notes: lab.notes || "",
    });
    setDialogOpen(true);
  };

  const handleChange = (field: string, value: string) => {
    let v = value;
    if (field === "phone" || field === "whatsapp") v = maskPhone(value);
    setForm((prev) => ({ ...prev, [field]: v }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        phone: form.phone.replace(/\D/g, "") || null,
        whatsapp: form.whatsapp.replace(/\D/g, "") || null,
      };
      if (editId) {
        await api.put(`/api/laboratories/${editId}`, payload);
        toast({ title: "Sucesso", description: "Laboratório atualizado" });
      } else {
        await api.post("/api/laboratories", payload);
        toast({ title: "Sucesso", description: "Laboratório cadastrado" });
      }
      setDialogOpen(false);
      fetchLabs();
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/laboratories/${id}`);
      toast({ title: "Sucesso", description: "Laboratório removido" });
      fetchLabs();
    } catch {
      toast({ title: "Erro", description: "Erro ao remover", variant: "destructive" });
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/\D/g, "");
    const number = clean.startsWith("55") ? clean : `55${clean}`;
    window.open(`https://wa.me/${number}?text=Olá ${name}, tudo bem?`, "_blank");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Laboratórios</h1>
          </div>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" /> Novo Laboratório
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : labs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FlaskConical className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhum laboratório cadastrado</p>
                <p className="text-sm">Adicione seus laboratórios parceiros.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Condições</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labs.map((lab) => (
                    <TableRow key={lab.id}>
                      <TableCell className="font-medium">{lab.name}</TableCell>
                      <TableCell>{lab.contactName || "-"}</TableCell>
                      <TableCell>{lab.phone ? formatPhone(lab.phone) : "-"}</TableCell>
                      <TableCell>{lab.email || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{lab.terms || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {lab.whatsapp && (
                            <Button size="sm" variant="ghost" onClick={() => openWhatsApp(lab.whatsapp!, lab.name)}>
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => openEdit(lab)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(lab.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Laboratório" : "Novo Laboratório"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Nome do laboratório" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => handleChange("whatsapp", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
              </div>
              <div>
                <Label>Nome do Contato</Label>
                <Input value={form.contactName} onChange={(e) => handleChange("contactName", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Condições Comerciais</Label>
              <Textarea value={form.terms} onChange={(e) => handleChange("terms", e.target.value)} placeholder="Prazos, condições de pagamento..." rows={2} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
