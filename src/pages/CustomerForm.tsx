import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle, ArrowLeft, Camera, CheckCircle2, Contact, Loader2, MapPin, NotebookPen, RefreshCw,
  Save, UserRound, X,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, InitialsAvatar, PageHeader, Panel, rise } from "@/components/imperio";
import customerService, { type CustomerListItem, type CustomerPayload } from "@/services/customer.service";
import { isoToDay, toIsoDay } from "@/components/prescriptions/PrescriptionParts";
import { maskCEP, maskCPF, maskPhone } from "@/utils/masks";
import { validateCPF } from "@/utils/formatters";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CustomerStatus } from "@/types";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const digits = (v?: string) => (v ?? "").replace(/\D/g, "");

const schema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome completo (mínimo 2 letras)"),
    cpf: z
      .string()
      .optional()
      .refine((v) => !digits(v) || validateCPF(digits(v)), "CPF inválido — confira os dígitos"),
    birthDate: z
      .string()
      .optional()
      .refine((v) => {
        if (!v) return true;
        const d = new Date(`${v}T12:00:00`);
        return !isNaN(d.getTime()) && d <= new Date() && d.getFullYear() >= 1900;
      }, "Data de nascimento inválida"),
    status: z.nativeEnum(CustomerStatus),
    phone: z.string().refine((v) => digits(v).length >= 10, "Telefone com DDD (10 ou 11 dígitos)"),
    whatsappSame: z.boolean(),
    whatsapp: z.string().optional(),
    email: z.string().trim().optional().refine((v) => !v || z.string().email().safeParse(v).success, "E-mail inválido"),
    zipCode: z.string().optional().refine((v) => !digits(v) || digits(v).length === 8, "CEP deve ter 8 dígitos"),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((d) => d.whatsappSame || !digits(d.whatsapp) || digits(d.whatsapp).length >= 10, {
    path: ["whatsapp"],
    message: "WhatsApp com DDD (10 ou 11 dígitos)",
  });

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  name: "",
  cpf: "",
  birthDate: "",
  status: CustomerStatus.ACTIVE,
  phone: "",
  whatsappSame: true,
  whatsapp: "",
  email: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  notes: "",
};

/** Reduz a foto para no máx. 320px (JPEG) para caber no campo `photo` como data URL. */
function resizeImage(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditing = !!id;

  const [loadingCustomer, setLoadingCustomer] = useState(isEditing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [originalPhoto, setOriginalPhoto] = useState<string | null>(null);
  const [originalCpf, setOriginalCpf] = useState<string>("");
  const [cepState, setCepState] = useState<"idle" | "loading" | "ok" | "notfound" | "error">("idle");
  const [duplicate, setDuplicate] = useState<{ field: "CPF" | "telefone"; customer: CustomerListItem } | null>(null);
  const numberRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY, mode: "onTouched" });
  const whatsappSame = form.watch("whatsappSame");
  const nameValue = form.watch("name");

  const loadCustomer = async () => {
    if (!id) return;
    setLoadingCustomer(true);
    setLoadError(null);
    try {
      const { data: c } = await customerService.getById(id);
      const wa = digits(c.whatsapp);
      const same = !wa || wa === digits(c.phone);
      form.reset({
        name: c.name ?? "",
        cpf: c.cpf ? maskCPF(c.cpf) : "",
        birthDate: isoToDay(c.birthDate),
        status: c.status ?? CustomerStatus.ACTIVE,
        phone: maskPhone(c.phone ?? ""),
        whatsappSame: same,
        whatsapp: same ? "" : maskPhone(c.whatsapp ?? ""),
        email: c.email ?? "",
        zipCode: c.zipCode ? maskCEP(c.zipCode) : "",
        street: c.street ?? "",
        number: c.number ?? "",
        complement: c.complement ?? "",
        neighborhood: c.neighborhood ?? "",
        city: c.city ?? "",
        state: c.state ?? "",
        notes: c.notes ?? "",
      });
      setPhoto(c.photo ?? null);
      setOriginalPhoto(c.photo ?? null);
      setOriginalCpf(digits(c.cpf));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar o cliente.");
    } finally {
      setLoadingCustomer(false);
    }
  };

  useEffect(() => {
    if (isEditing) loadCustomer();
    else {
      form.reset(EMPTY);
      setPhoto(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ── CEP (ViaCEP) ───────────────────────────────────── */
  const lookupCep = async (cep: string) => {
    setCepState("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) throw new Error("http");
      const data = await res.json();
      if (data.erro) {
        setCepState("notfound");
        return;
      }
      const opts = { shouldValidate: true, shouldDirty: true };
      if (data.logradouro) form.setValue("street", data.logradouro, opts);
      if (data.bairro) form.setValue("neighborhood", data.bairro, opts);
      if (data.localidade) form.setValue("city", data.localidade, opts);
      if (data.uf) form.setValue("state", data.uf, opts);
      if (data.complemento && !form.getValues("complement")) form.setValue("complement", data.complemento, opts);
      setCepState("ok");
      setTimeout(() => numberRef.current?.focus(), 50);
    } catch {
      setCepState("error");
    }
  };

  /* ── Checagem de duplicidade (apenas no cadastro) ───── */
  const checkDuplicate = async (field: "CPF" | "telefone", raw?: string) => {
    const d = digits(raw);
    if (isEditing && field === "CPF" && d === originalCpf) return;
    if ((field === "CPF" && (d.length !== 11 || !validateCPF(d))) || (field === "telefone" && d.length < 10)) return;
    try {
      const res = await customerService.list({ search: d, limit: 5 });
      const match = res.data.find(
        (c) => c.id !== id && (field === "CPF" ? digits(c.cpf) === d : digits(c.phone) === d),
      );
      if (match) setDuplicate({ field, customer: match });
      else if (duplicate?.field === field) setDuplicate(null);
    } catch {
      /* checagem opcional */
    }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Envie uma imagem JPG ou PNG.", variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Tamanho máximo: 8 MB.", variant: "destructive" });
      return;
    }
    try {
      setPhoto(await resizeImage(file));
    } catch (err) {
      toast({ title: "Não foi possível usar a foto", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  };

  /* ── Envio ──────────────────────────────────────────── */
  const onSubmit = async (v: FormValues) => {
    // Criação: vazio => undefined (omitido). Edição: vazio => null (limpa no banco).
    const empty = isEditing ? null : undefined;
    const opt = (s?: string) => {
      const t = (s ?? "").trim();
      return t ? t : empty;
    };
    const phone = digits(v.phone);
    const payload: CustomerPayload = {
      name: v.name.trim(),
      phone,
      cpf: digits(v.cpf) || empty,
      whatsapp: v.whatsappSame ? phone : digits(v.whatsapp) || empty,
      email: opt(v.email),
      birthDate: v.birthDate ? toIsoDay(v.birthDate) : empty,
      zipCode: digits(v.zipCode) || empty,
      street: opt(v.street),
      number: opt(v.number),
      complement: opt(v.complement),
      neighborhood: opt(v.neighborhood),
      city: opt(v.city),
      state: opt(v.state)?.toUpperCase() ?? empty,
      notes: opt(v.notes),
      status: v.status,
    };
    if (!isEditing || photo !== originalPhoto) payload.photo = photo ?? empty;

    setSaving(true);
    try {
      const res = isEditing ? await customerService.update(id!, payload) : await customerService.create(payload);
      toast({
        title: isEditing ? "Cliente atualizado" : "Cliente cadastrado",
        description: res.data?.name ?? payload.name,
      });
      navigate(`/clientes/${res.data?.id ?? id}`, { replace: !isEditing });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível salvar o cliente.";
      if (/cpf/i.test(msg)) form.setError("cpf", { message: msg });
      else if (/telefone|phone/i.test(msg)) form.setError("phone", { message: msg });
      else if (/e-?mail/i.test(msg)) form.setError("email", { message: msg });
      toast({ title: "Não foi possível salvar", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onInvalid = () => {
    toast({ title: "Revise os campos destacados", variant: "destructive" });
  };

  const backTo = isEditing ? `/clientes/${id}` : "/clientes";

  /* ── Estados de carregamento ─────────────────────────── */
  if (loadingCustomer) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-16 w-72" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="surface space-y-4 p-5">
              <Skeleton className="h-5 w-40" />
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((__, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </MainLayout>
    );
  }

  if (loadError) {
    return (
      <MainLayout>
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível carregar o cliente"
          description={loadError}
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/clientes")}>
                Voltar
              </Button>
              <Button onClick={loadCustomer}>
                <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
              </Button>
            </div>
          }
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow={isEditing ? "Editar cadastro" : "Novo cadastro"}
          title={isEditing ? nameValue || "Editar cliente" : "Novo cliente"}
          description="Campos com * são obrigatórios. O endereço é preenchido automaticamente pelo CEP."
          icon={UserRound}
          actions={
            <Button variant="ghost" onClick={() => navigate(backTo)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          }
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6" noValidate>
            {/* Dados pessoais */}
            <Panel title="Dados pessoais" icon={UserRound} {...rise(1)}>
              <div className="flex flex-col gap-6 md:flex-row">
                {/* Foto */}
                <div className="flex shrink-0 items-center gap-4 md:flex-col md:items-center">
                  <div className="relative">
                    {photo ? (
                      <img src={photo} alt="Foto do cliente" className="h-24 w-24 rounded-full object-cover ring-2 ring-gold/40" />
                    ) : (
                      <InitialsAvatar name={nameValue || "?"} size="lg" className="h-24 w-24 text-2xl" />
                    )}
                    {photo && (
                      <button
                        type="button"
                        onClick={() => setPhoto(null)}
                        className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow"
                        aria-label="Remover foto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <Camera className="h-4 w-4" />
                    {photo ? "Trocar foto" : "Adicionar foto"}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  </label>
                </div>

                <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 lg:col-span-3">
                        <FormLabel>Nome completo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: Maria Aparecida da Silva" autoComplete="name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            placeholder="000.000.000-00"
                            className="num"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(maskCPF(e.target.value))}
                            onBlur={() => {
                              field.onBlur();
                              checkDuplicate("CPF", field.value);
                            }}
                            maxLength={14}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" max={new Date().toISOString().slice(0, 10)} {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={CustomerStatus.ACTIVE}>Ativo</SelectItem>
                            <SelectItem value={CustomerStatus.INACTIVE}>Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Panel>

            {/* Contato */}
            <Panel title="Contato" icon={Contact} {...rise(2)}>
              {duplicate && (
                <div className="mb-4 flex flex-col gap-2 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-start gap-2 text-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <span>
                      Já existe um cliente com este {duplicate.field}: <strong>{duplicate.customer.name}</strong>.
                    </span>
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/clientes/${duplicate.customer.id}`}>Abrir cadastro existente</Link>
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone *</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="(11) 99999-9999"
                          className="num"
                          value={field.value}
                          onChange={(e) => field.onChange(maskPhone(e.target.value))}
                          onBlur={() => {
                            field.onBlur();
                            if (!isEditing) checkDuplicate("telefone", field.value);
                          }}
                          maxLength={15}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="whatsappSame"
                    render={({ field }) => (
                      <FormItem className="flex h-[22px] items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">WhatsApp é o mesmo telefone</FormLabel>
                      </FormItem>
                    )}
                  />
                  {!whatsappSame && (
                    <FormField
                      control={form.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="tel"
                              inputMode="tel"
                              placeholder="WhatsApp (11) 99999-9999"
                              className="num"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(maskPhone(e.target.value))}
                              onBlur={field.onBlur}
                              maxLength={15}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" inputMode="email" autoComplete="email" placeholder="cliente@email.com" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Panel>

            {/* Endereço */}
            <Panel title="Endereço" icon={MapPin} {...rise(3)}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            inputMode="numeric"
                            placeholder="00000-000"
                            className="num pr-9"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const masked = maskCEP(e.target.value);
                              field.onChange(masked);
                              const d = digits(masked);
                              if (d.length === 8) lookupCep(d);
                              else setCepState("idle");
                            }}
                            onBlur={field.onBlur}
                            maxLength={9}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2">
                            {cepState === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            {cepState === "ok" && <CheckCircle2 className="h-4 w-4 text-success" />}
                          </span>
                        </div>
                      </FormControl>
                      {cepState === "notfound" && <FormDescription className="text-warning">CEP não encontrado — preencha manualmente.</FormDescription>}
                      {cepState === "error" && <FormDescription className="text-warning">Consulta de CEP indisponível — preencha manualmente.</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-4">
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, avenida…" autoComplete="address-line1" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123"
                          {...field}
                          value={field.value ?? ""}
                          ref={(el) => {
                            field.ref(el);
                            numberRef.current = el;
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-4">
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Apto, bloco, referência" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input autoComplete="address-level2" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-1">
                      <FormLabel>UF</FormLabel>
                      <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {UFS.map((uf) => (
                            <SelectItem key={uf} value={uf}>
                              {uf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Panel>

            {/* Observações */}
            <Panel title="Observações" icon={NotebookPen} {...rise(4)}>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Preferências de armação, histórico de atendimento, melhor horário para contato…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Panel>

            {/* Ações — fixas no rodapé no celular (acima da navegação inferior) */}
            <div
              className={cn(
                "sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-3 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-3 py-3 backdrop-blur",
                "sm:-mx-5 sm:px-5 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none",
              )}
            >
              <Button type="button" variant="outline" onClick={() => navigate(backTo)} disabled={saving} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 sm:flex-none">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? "Salvar alterações" : "Cadastrar cliente"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
}
