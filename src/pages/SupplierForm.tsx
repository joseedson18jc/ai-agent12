import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { maskCNPJ, maskPhone, maskCEP } from "@/utils/masks";
import { validateCNPJ } from "@/utils/formatters";
import { ArrowLeft, Save } from "lucide-react";
import api from "@/services/api";

export default function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", cnpj: "", contactName: "", contactRole: "",
    phone: "", whatsapp: "", email: "",
    zipCode: "", street: "", number: "", complement: "",
    neighborhood: "", city: "", state: "",
    category: "", paymentTerms: "", notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get<any>(`/api/suppliers/${id}`).then((res) => {
        if (res.success && res.data) {
          const s = res.data;
          setForm({
            name: s.name || "", cnpj: s.cnpj ? maskCNPJ(s.cnpj) : "",
            contactName: s.contactName || "", contactRole: s.contactRole || "",
            phone: s.phone ? maskPhone(s.phone) : "", whatsapp: s.whatsapp ? maskPhone(s.whatsapp) : "",
            email: s.email || "",
            zipCode: s.zipCode ? maskCEP(s.zipCode) : "", street: s.street || "",
            number: s.number || "", complement: s.complement || "",
            neighborhood: s.neighborhood || "", city: s.city || "", state: s.state || "",
            category: s.category || "", paymentTerms: s.paymentTerms || "", notes: s.notes || "",
          });
        }
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (field: string, value: string) => {
    let masked = value;
    if (field === "cnpj") masked = maskCNPJ(value);
    else if (field === "phone" || field === "whatsapp") masked = maskPhone(value);
    else if (field === "zipCode") masked = maskCEP(value);
    setForm((prev) => ({ ...prev, [field]: masked }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const fetchCEP = async () => {
    const cep = form.zipCode.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch { /* ignore */ }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Nome é obrigatório";
    const cnpjClean = form.cnpj.replace(/\D/g, "");
    if (cnpjClean && !validateCNPJ(cnpjClean)) errs.cnpj = "CNPJ inválido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        cnpj: form.cnpj.replace(/\D/g, "") || null,
        phone: form.phone.replace(/\D/g, "") || null,
        whatsapp: form.whatsapp.replace(/\D/g, "") || null,
        zipCode: form.zipCode.replace(/\D/g, "") || null,
      };
      if (isEdit) {
        await api.put(`/api/suppliers/${id}`, payload);
        toast({ title: "Sucesso", description: "Fornecedor atualizado" });
      } else {
        await api.post("/api/suppliers", payload);
        toast({ title: "Sucesso", description: "Fornecedor cadastrado" });
      }
      navigate("/fornecedores");
    } catch {
      toast({ title: "Erro", description: "Erro ao salvar fornecedor", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/fornecedores")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Editar Fornecedor" : "Novo Fornecedor"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Dados do Fornecedor</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Razão Social / Nome Fantasia *</Label>
                <Input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Nome do fornecedor" />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" value={form.cnpj} onChange={(e) => handleChange("cnpj", e.target.value)} placeholder="00.000.000/0001-00" />
                {errors.cnpj && <p className="text-sm text-red-500 mt-1">{errors.cnpj}</p>}
              </div>
              <div>
                <Label htmlFor="category">Categoria de Produtos</Label>
                <Input id="category" value={form.category} onChange={(e) => handleChange("category", e.target.value)} placeholder="Ex: Armações, Lentes" />
              </div>
              <div>
                <Label htmlFor="contactName">Nome do Contato</Label>
                <Input id="contactName" value={form.contactName} onChange={(e) => handleChange("contactName", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="contactRole">Cargo do Contato</Label>
                <Input id="contactRole" value={form.contactRole} onChange={(e) => handleChange("contactRole", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" value={form.whatsapp} onChange={(e) => handleChange("whatsapp", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="paymentTerms">Condições de Pagamento</Label>
                <Input id="paymentTerms" value={form.paymentTerms} onChange={(e) => handleChange("paymentTerms", e.target.value)} placeholder="Ex: 30/60/90 dias" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="zipCode">CEP</Label>
                <Input id="zipCode" value={form.zipCode} onChange={(e) => handleChange("zipCode", e.target.value)} onBlur={fetchCEP} placeholder="00000-000" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="street">Rua</Label>
                <Input id="street" value={form.street} onChange={(e) => handleChange("street", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="number">Número</Label>
                <Input id="number" value={form.number} onChange={(e) => handleChange("number", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input id="complement" value={form.complement} onChange={(e) => handleChange("complement", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input id="neighborhood" value={form.neighborhood} onChange={(e) => handleChange("neighborhood", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input id="state" value={form.state} onChange={(e) => handleChange("state", e.target.value)} maxLength={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="Anotações sobre o fornecedor..." rows={4} />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/fornecedores")}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
