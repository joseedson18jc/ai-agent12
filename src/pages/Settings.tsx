import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { maskCNPJ, maskPhone, maskCEP } from "@/utils/masks";
import { Settings as SettingsIcon, Store, Users, Save, Plus, Pencil } from "lucide-react";
import type { User, Store as StoreType } from "@/types";
import api from "@/services/api";

export default function Settings() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Store settings
  const [store, setStore] = useState({
    name: "", cnpj: "", phone: "", email: "",
    address: "", city: "", state: "", zipCode: "",
    defaultMarkup: 100, billAlertDays: 5,
    prescriptionAlertDays: 30, defaultMinStock: 2, printerType: "A4",
  });

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "SELLER" });

  useEffect(() => {
    fetchSettings();
    if (isAdmin) fetchUsers();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>("/settings");
      if (res.success && res.data) {
        const s = res.data;
        setStore({
          name: s.name || "", cnpj: s.cnpj ? maskCNPJ(s.cnpj) : "",
          phone: s.phone ? maskPhone(s.phone) : "", email: s.email || "",
          address: s.address || "", city: s.city || "", state: s.state || "",
          zipCode: s.zipCode ? maskCEP(s.zipCode) : "",
          defaultMarkup: s.defaultMarkup || 100, billAlertDays: s.billAlertDays || 5,
          prescriptionAlertDays: s.prescriptionAlertDays || 30,
          defaultMinStock: s.defaultMinStock || 2, printerType: s.printerType || "A4",
        });
      }
    } catch { /* first time, no store yet */ }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get<any>("/users");
      if (res.success) setUsers(res.data || []);
    } catch { /* ignore */ }
  };

  const handleStoreChange = (field: string, value: string | number) => {
    let v = value;
    if (field === "cnpj" && typeof v === "string") v = maskCNPJ(v);
    if (field === "phone" && typeof v === "string") v = maskPhone(v);
    if (field === "zipCode" && typeof v === "string") v = maskCEP(v);
    setStore((prev) => ({ ...prev, [field]: v }));
  };

  const saveStore = async () => {
    setSaving(true);
    try {
      await api.put("/settings", {
        ...store,
        cnpj: store.cnpj.replace(/\D/g, "") || null,
        phone: store.phone.replace(/\D/g, "") || null,
        zipCode: store.zipCode.replace(/\D/g, "") || null,
      });
      toast({ title: "Sucesso", description: "Configurações salvas" });
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar configurações", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openCreateUser = () => {
    setEditUser(null);
    setUserForm({ name: "", email: "", password: "", role: "SELLER" });
    setUserDialogOpen(true);
  };

  const openEditUser = (u: User) => {
    setEditUser(u);
    setUserForm({ name: u.name, email: u.email, password: "", role: u.role });
    setUserDialogOpen(true);
  };

  const saveUser = async () => {
    if (!userForm.name || !userForm.email) {
      toast({ title: "Erro", description: "Nome e e-mail são obrigatórios", variant: "destructive" });
      return;
    }
    try {
      if (editUser) {
        const payload: any = { name: userForm.name, email: userForm.email, role: userForm.role };
        if (userForm.password) payload.password = userForm.password;
        await api.put(`/users/${editUser.id}`, payload);
        toast({ title: "Sucesso", description: "Usuário atualizado" });
      } else {
        if (!userForm.password) {
          toast({ title: "Erro", description: "Senha é obrigatória para novos usuários", variant: "destructive" });
          return;
        }
        await api.post("/users", userForm);
        toast({ title: "Sucesso", description: "Usuário criado" });
      }
      setUserDialogOpen(false);
      fetchUsers();
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar usuário", variant: "destructive" });
    }
  };

  const toggleUserActive = async (u: User) => {
    try {
      await api.put(`/users/${u.id}`, { isActive: !u.isActive });
      fetchUsers();
    } catch {
      toast({ title: "Erro", description: "Erro ao alterar status", variant: "destructive" });
    }
  };

  const roleLabels: Record<string, string> = { ADMIN: "Administrador", SELLER: "Vendedor", VIEWER: "Consulta" };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        </div>

        <Tabs defaultValue="loja">
          <TabsList>
            <TabsTrigger value="loja" className="flex items-center gap-1">
              <Store className="h-4 w-4" /> Dados da Loja
            </TabsTrigger>
            <TabsTrigger value="sistema">Sistema</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="usuarios" className="flex items-center gap-1">
                <Users className="h-4 w-4" /> Usuários
              </TabsTrigger>
            )}
          </TabsList>

          {/* DADOS DA LOJA */}
          <TabsContent value="loja">
            <Card>
              <CardHeader><CardTitle>Informações da Loja</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Nome da Loja</Label>
                  <Input value={store.name} onChange={(e) => handleStoreChange("name", e.target.value)} placeholder="Nome da ótica" />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input value={store.cnpj} onChange={(e) => handleStoreChange("cnpj", e.target.value)} placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={store.phone} onChange={(e) => handleStoreChange("phone", e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={store.email} onChange={(e) => handleStoreChange("email", e.target.value)} />
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input value={store.zipCode} onChange={(e) => handleStoreChange("zipCode", e.target.value)} placeholder="00000-000" />
                </div>
                <div className="md:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={store.address} onChange={(e) => handleStoreChange("address", e.target.value)} placeholder="Rua, número, bairro" />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={store.city} onChange={(e) => handleStoreChange("city", e.target.value)} />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input value={store.state} onChange={(e) => handleStoreChange("state", e.target.value)} maxLength={2} />
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end mt-4">
              <Button onClick={saveStore} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </TabsContent>

          {/* SISTEMA */}
          <TabsContent value="sistema">
            <Card>
              <CardHeader><CardTitle>Configurações do Sistema</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Markup Padrão (%)</Label>
                  <Input type="number" value={store.defaultMarkup} onChange={(e) => handleStoreChange("defaultMarkup", Number(e.target.value))} />
                  <p className="text-xs text-gray-500 mt-1">Markup padrão aplicado a novos produtos</p>
                </div>
                <div>
                  <Label>Alerta de Contas a Pagar (dias antes)</Label>
                  <Input type="number" value={store.billAlertDays} onChange={(e) => handleStoreChange("billAlertDays", Number(e.target.value))} />
                  <p className="text-xs text-gray-500 mt-1">Quantos dias antes do vencimento alertar</p>
                </div>
                <div>
                  <Label>Alerta de Receitas (dias antes do vencimento)</Label>
                  <Input type="number" value={store.prescriptionAlertDays} onChange={(e) => handleStoreChange("prescriptionAlertDays", Number(e.target.value))} />
                </div>
                <div>
                  <Label>Estoque Mínimo Padrão</Label>
                  <Input type="number" value={store.defaultMinStock} onChange={(e) => handleStoreChange("defaultMinStock", Number(e.target.value))} />
                </div>
                <div>
                  <Label>Tipo de Impressora</Label>
                  <Select value={store.printerType} onValueChange={(v) => handleStoreChange("printerType", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4 (Padrão)</SelectItem>
                      <SelectItem value="80mm">Térmica 80mm</SelectItem>
                      <SelectItem value="58mm">Térmica 58mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end mt-4">
              <Button onClick={saveStore} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </TabsContent>

          {/* USUÁRIOS */}
          {isAdmin && (
            <TabsContent value="usuarios">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Gerenciamento de Usuários</CardTitle>
                    <Button onClick={openCreateUser} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" /> Novo Usuário
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                              {roleLabels[u.role] || u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch checked={u.isActive} onCheckedChange={() => toggleUserActive(u)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => openEditUser(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Nome *</Label>
              <Input value={userForm.name} onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label>{editUser ? "Nova Senha (deixe em branco para manter)" : "Senha *"}</Label>
              <Input type="password" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div>
              <Label>Perfil</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="SELLER">Vendedor</SelectItem>
                  <SelectItem value="VIEWER">Consulta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveUser} className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
