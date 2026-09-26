import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { maskCNPJ, maskPhone, maskCEP } from "@/utils/masks";
import { validateCNPJ } from "@/utils/formatters";
import { PageHeader, Panel, rise } from "@/components/imperio";
import { ArrowLeft, Save, Truck, Building2, MapPin, StickyNote, Loader2, CheckCircle2, AlertTriangle, Package } from "lucide-react";
import supplierService, { type SupplierPayload } from "@/services/supplier.service";

const empty = {
  name: "", cnpj: "", contactName: "", contactRole: "",
  phone: "", whatsapp: "", email: "",
  zipCode: "", street: "", number: "", complement: "",
  neighborhood: "", city: "", state: "",
  category: "", paymentTerms: "", notes: "",
};
type FormState = typeof empty;
type Field = keyof FormState;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (v: string) => v.replace(/\D/g, "");

function FieldBlock({
  id, label, error, hint, className, children,
}: { id?: string; label: string; error?: string; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export default function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [original, setOriginal] = useState<{ cnpj: string | null }>({ cnpj: null });
  const [productCount, setProductCount] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "ok" | "notfound">("idle");
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const lastCep = useRef("");

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    supplierService
      .getById(id!)
      .then((res) => {
        const s = res.data;
        setOriginal({ cnpj: s.cnpj || null });
        setProductCount(s.products?.length ?? null);
        lastCep.current = digits(s.zipCode || "");
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
      })
      .catch((e) => {
        toast({ title: "Fornecedor não encontrado", description: e instanceof Error ? e.message : "", variant: "destructive" });
        navigate("/fornecedores");
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate, toast]);

  const handleChange = (field: Field, value: string) => {
    let v = value;
    if (field === "cnpj") v = maskCNPJ(value);
    else if (field === "phone" || field === "whatsapp") v = maskPhone(value);
    else if (field === "zipCode") v = maskCEP(value);
    else if (field === "state") v = value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    setForm((prev) => ({ ...prev, [field]: v }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  /* CEP autofill (ViaCEP) as soon as 8 digits are typed */
  useEffect(() => {
    const cep = digits(form.zipCode);
    if (cep.length !== 8 || cep === lastCep.current) return;
    lastCep.current = cep;
    let cancelled = false;
    setCepStatus("loading");
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.erro) {
          setCepStatus("notfound");
          return;
        }
        setForm((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
          complement: prev.complement || data.complemento || "",
        }));
        setCepStatus("ok");
        setTimeout(() => numberRef.current?.focus(), 50);
      })
      .catch(() => !cancelled && setCepStatus("notfound"));
    return () => { cancelled = true; };
  }, [form.zipCode]);

  /* CNPJ duplicate hint */
  useEffect(() => {
    const c = digits(form.cnpj);
    setDupWarning(null);
    if (c.length !== 14 || !validateCNPJ(c) || c === original.cnpj) return;
    const t = setTimeout(() => {
      supplierService
        .list({ search: c, limit: 5 })
        .then((r) => {
          const dup = (r.data || []).find((s) => s.cnpj === c && s.id !== id);
          if (dup) setDupWarning(`Este CNPJ já está cadastrado para "${dup.name}".`);
        })
        .catch(() => { /* hint only */ });
    }, 300);
    return () => clearTimeout(t);
  }, [form.cnpj, original.cnpj, id]);

  const validate = () => {
    const errs: Partial<Record<Field, string>> = {};
    if (form.name.trim().length < 2) errs.name = "Informe o nome (mín. 2 caracteres)";
    const c = digits(form.cnpj);
    if (c && (c.length !== 14 || !validateCNPJ(c))) errs.cnpj = "CNPJ inválido";
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errs.email = "E-mail inválido";
    const p = digits(form.phone);
    if (p && p.length < 10) errs.phone = "Telefone incompleto";
    const w = digits(form.whatsapp);
    if (w && w.length < 10) errs.whatsapp = "WhatsApp incompleto";
    const z = digits(form.zipCode);
    if (z && z.length !== 8) errs.zipCode = "CEP incompleto";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({ title: "Revise os campos destacados", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Backend zod accepts strings (no null) for text fields; "" clears on edit, undefined skips on create.
      const text = (v: string) => {
        const t = v.trim();
        return t ? t : isEdit ? "" : undefined;
      };
      const cnpj = digits(form.cnpj);
      const payload: SupplierPayload = {
        name: form.name.trim(),
        cnpj: cnpj ? cnpj : isEdit && original.cnpj ? null : undefined,
        contactName: text(form.contactName),
        contactRole: text(form.contactRole),
        phone: text(digits(form.phone)),
        whatsapp: text(digits(form.whatsapp)),
        email: text(form.email),
        zipCode: text(digits(form.zipCode)),
        street: text(form.street),
        number: text(form.number),
        complement: text(form.complement),
        neighborhood: text(form.neighborhood),
        city: text(form.city),
        state: text(form.state),
        category: text(form.category),
        paymentTerms: text(form.paymentTerms),
        notes: text(form.notes),
      };
      if (isEdit) {
        await supplierService.update(id!, payload);
        toast({ title: "Fornecedor atualizado", description: payload.name });
      } else {
        await supplierService.create(payload);
        toast({ title: "Fornecedor cadastrado", description: payload.name });
      }
      navigate("/fornecedores");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/cnpj/i.test(msg)) setErrors((p) => ({ ...p, cnpj: msg }));
      toast({ title: "Erro ao salvar fornecedor", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-16 w-72" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

  const input = (field: Field, props: React.ComponentProps<typeof Input> = {}) => (
    <Input
      id={field}
      value={form[field]}
      onChange={(e) => handleChange(field, e.target.value)}
      aria-invalid={!!errors[field]}
      className={cn(errors[field] && "border-danger focus-visible:ring-danger", props.className)}
      {...props}
    />
  );

  const cnpjDigits = digits(form.cnpj);
  const cnpjOk = cnpjDigits.length === 14 && validateCNPJ(cnpjDigits);

  return (
    <MainLayout>
      <div className="space-y-6 pb-16 lg:pb-0">
        <PageHeader
          eyebrow="Fornecedores"
          title={isEdit ? "Editar fornecedor" : "Novo fornecedor"}
          description={isEdit ? form.name : "Cadastre um parceiro de armações, lentes ou acessórios."}
          icon={Truck}
          actions={
            <Button variant="outline" onClick={() => navigate("/fornecedores")}>
              <ArrowLeft /> Voltar
            </Button>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <Panel {...rise(1)} title="Dados do fornecedor" icon={Building2}
            actions={productCount ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Package className="h-3.5 w-3.5" /> <span className="num">{productCount}</span> {productCount === 1 ? "produto vinculado" : "produtos vinculados"}
              </span>
            ) : undefined}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FieldBlock id="name" label="Razão social / Nome fantasia *" error={errors.name} className="md:col-span-2 lg:col-span-2">
                {input("name", { placeholder: "Nome do fornecedor", autoFocus: !isEdit })}
              </FieldBlock>
              <FieldBlock
                id="cnpj"
                label="CNPJ"
                error={errors.cnpj}
                hint={
                  dupWarning ? (
                    <span className="inline-flex items-center gap-1 text-warning"><AlertTriangle className="h-3 w-3" />{dupWarning}</span>
                  ) : cnpjOk ? (
                    <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" />CNPJ válido</span>
                  ) : undefined
                }
              >
                {input("cnpj", { placeholder: "00.000.000/0000-00", inputMode: "numeric", className: "num" })}
              </FieldBlock>
              <FieldBlock id="category" label="Categoria de produtos">
                {input("category", { placeholder: "Ex.: Armações, Lentes" })}
              </FieldBlock>
              <FieldBlock id="paymentTerms" label="Condições de pagamento">
                {input("paymentTerms", { placeholder: "Ex.: 30/60/90 dias" })}
              </FieldBlock>
              <FieldBlock id="email" label="E-mail" error={errors.email}>
                {input("email", { type: "email", placeholder: "contato@fornecedor.com.br" })}
              </FieldBlock>
              <FieldBlock id="contactName" label="Nome do contato">
                {input("contactName")}
              </FieldBlock>
              <FieldBlock id="contactRole" label="Cargo do contato">
                {input("contactRole", { placeholder: "Ex.: Representante" })}
              </FieldBlock>
              <div className="hidden lg:block" />
              <FieldBlock id="phone" label="Telefone" error={errors.phone}>
                {input("phone", { placeholder: "(00) 0000-0000", inputMode: "tel", className: "num" })}
              </FieldBlock>
              <FieldBlock
                id="whatsapp"
                label="WhatsApp"
                error={errors.whatsapp}
                hint={
                  !form.whatsapp && digits(form.phone).length === 11 ? (
                    <button type="button" className="font-semibold text-primary hover:underline" onClick={() => handleChange("whatsapp", form.phone)}>
                      Usar o mesmo número do telefone
                    </button>
                  ) : undefined
                }
              >
                {input("whatsapp", { placeholder: "(00) 00000-0000", inputMode: "tel", className: "num" })}
              </FieldBlock>
            </div>
          </Panel>

          <Panel {...rise(2)} title="Endereço" description="Digite o CEP para preencher automaticamente" icon={MapPin}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <FieldBlock
                id="zipCode"
                label="CEP"
                error={errors.zipCode}
                className="lg:col-span-2"
                hint={
                  cepStatus === "loading" ? (
                    <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Buscando endereço…</span>
                  ) : cepStatus === "ok" ? (
                    <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" />Endereço preenchido</span>
                  ) : cepStatus === "notfound" ? (
                    <span className="text-warning">CEP não encontrado — preencha manualmente</span>
                  ) : undefined
                }
              >
                {input("zipCode", { placeholder: "00000-000", inputMode: "numeric", className: "num" })}
              </FieldBlock>
              <FieldBlock id="street" label="Rua" className="sm:col-span-2 lg:col-span-4">
                {input("street")}
              </FieldBlock>
              <FieldBlock id="number" label="Número" className="lg:col-span-1">
                <Input id="number" ref={numberRef} value={form.number} onChange={(e) => handleChange("number", e.target.value)} />
              </FieldBlock>
              <FieldBlock id="complement" label="Complemento" className="lg:col-span-2">
                {input("complement", { placeholder: "Sala, galpão…" })}
              </FieldBlock>
              <FieldBlock id="neighborhood" label="Bairro" className="lg:col-span-3">
                {input("neighborhood")}
              </FieldBlock>
              <FieldBlock id="city" label="Cidade" className="lg:col-span-4">
                {input("city")}
              </FieldBlock>
              <FieldBlock id="state" label="UF" className="lg:col-span-2">
                {input("state", { placeholder: "SP", maxLength: 2 })}
              </FieldBlock>
            </div>
          </Panel>

          <Panel {...rise(3)} title="Observações" icon={StickyNote}>
            <Textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Prazos de entrega, marcas representadas, pedido mínimo…"
              rows={4}
            />
          </Panel>

          {/* actions — sticky on mobile */}
          <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="flex gap-3 lg:justify-end">
              <Button type="button" variant="outline" className="flex-1 lg:flex-none" onClick={() => navigate("/fornecedores")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 lg:flex-none">
                {saving ? <Loader2 className="animate-spin" /> : <Save />} {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Cadastrar fornecedor"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
