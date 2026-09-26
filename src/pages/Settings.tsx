import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { maskCNPJ, maskPhone, maskCEP } from "@/utils/masks";
import { formatCurrency, formatDateTime, validateCNPJ } from "@/utils/formatters";
import { PageHeader, Panel, StatusPill, EmptyState, InitialsAvatar, rise } from "@/components/imperio";
import {
  Settings as SettingsIcon, Store, Users, Save, Plus, Pencil, SlidersHorizontal, KeyRound, Loader2,
  CheckCircle2, AlertTriangle, RefreshCw, Printer, Lock, Copy, Wand2, ShieldCheck,
  Globe, MessageCircle, Instagram, Clock, ExternalLink,
} from "lucide-react";
import settingsService, { userService, type StoreSettings, type SystemUser, type UserRoleCode } from "@/services/settings.service";

const ROLE_LABEL: Record<UserRoleCode, string> = { ADMIN: "Administrador", SELLER: "Vendedor", VIEWER: "Consulta" };
const ROLE_HINT: Record<UserRoleCode, string> = {
  ADMIN: "Acesso total, incluindo usuários e configurações.",
  SELLER: "Vendas, clientes, estoque e financeiro do dia a dia.",
  VIEWER: "Apenas visualização.",
};
const ROLE_TONE: Record<UserRoleCode, "navy" | "gold" | "neutral"> = { ADMIN: "navy", SELLER: "gold", VIEWER: "neutral" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (v: string) => v.replace(/\D/g, "");

const emptyStore = {
  name: "", cnpj: "", phone: "", email: "",
  address: "", city: "", state: "", zipCode: "",
  defaultMarkup: "100", billAlertDays: "5",
  prescriptionAlertDays: "30", defaultMinStock: "2", printerType: "A4",
  whatsapp: "", instagram: "", openingHours: "", siteHeadline: "",
};
const HEADLINE_MAX = 160;
const HOURS_MAX = 600;

/** "@oticaimperio", "instagram.com/oticaimperio/", "https://www.instagram.com/oticaimperio?igsh=…" → "oticaimperio" */
function normalizeInstagram(v: string) {
  return v
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?instagram\.com\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/^@+/, "")
    .split("/")[0];
}
type StoreForm = typeof emptyStore;

function toForm(s: StoreSettings): StoreForm {
  return {
    name: s.name || "",
    cnpj: s.cnpj ? maskCNPJ(s.cnpj) : "",
    phone: s.phone ? maskPhone(s.phone) : "",
    email: s.email || "",
    address: s.address || "",
    city: s.city || "",
    state: s.state || "",
    zipCode: s.zipCode ? maskCEP(s.zipCode) : "",
    defaultMarkup: String(s.defaultMarkup ?? 100),
    billAlertDays: String(s.billAlertDays ?? 5),
    prescriptionAlertDays: String(s.prescriptionAlertDays ?? 30),
    defaultMinStock: String(s.defaultMinStock ?? 2),
    printerType: s.printerType || "A4",
    whatsapp: s.whatsapp ? maskPhone(s.whatsapp) : "",
    instagram: s.instagram ? `@${s.instagram}` : "",
    openingHours: s.openingHours || "",
    siteHeadline: s.siteHeadline || "",
  };
}

function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

function Field({ id, label, error, hint, className, children }: { id?: string; label: string; error?: string; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { isAdmin, user: me } = useAuth();
  const [tab, setTab] = useState("loja");

  /* store */
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<StoreForm>(emptyStore);
  const [saved, setSaved] = useState<StoreForm>(emptyStore);
  const [errors, setErrors] = useState<Partial<Record<keyof StoreForm, string>>>({});
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "ok" | "notfound">("idle");
  const lastCep = useRef("");

  /* users */
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<SystemUser | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "SELLER" as UserRoleCode });
  const [userErrors, setUserErrors] = useState<Record<string, string>>({});
  const [userSaving, setUserSaving] = useState(false);
  const [resetUser, setResetUser] = useState<SystemUser | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await settingsService.get();
      const f = toForm(res.data);
      setStore(f);
      setSaved(f);
      lastCep.current = digits(f.zipCode);
    } catch (e) {
      setLoadError(true);
      toast({ title: "Erro ao carregar configurações", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(false);
    try {
      const res = await userService.list(100);
      setUsers(res.data || []);
    } catch (e) {
      setUsersError(true);
      toast({ title: "Erro ao carregar usuários", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setUsersLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => { if (isAdmin) fetchUsers(); }, [isAdmin, fetchUsers]);

  const dirty = useMemo(() => JSON.stringify(store) !== JSON.stringify(saved), [store, saved]);
  const readOnly = !isAdmin;

  const handleStoreChange = (field: keyof StoreForm, value: string) => {
    let v = value;
    if (field === "cnpj") v = maskCNPJ(v);
    else if (field === "phone" || field === "whatsapp") v = maskPhone(v);
    else if (field === "zipCode") v = maskCEP(v);
    else if (field === "state") v = v.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    setStore((prev) => ({ ...prev, [field]: v }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  /* CEP autofill */
  useEffect(() => {
    const cep = digits(store.zipCode);
    if (readOnly || cep.length !== 8 || cep === lastCep.current) return;
    lastCep.current = cep;
    let cancelled = false;
    setCepStatus("loading");
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.erro) { setCepStatus("notfound"); return; }
        setStore((prev) => ({
          ...prev,
          address: prev.address || [d.logradouro, d.bairro].filter(Boolean).join(", "),
          city: d.localidade || prev.city,
          state: d.uf || prev.state,
        }));
        setCepStatus("ok");
      })
      .catch(() => !cancelled && setCepStatus("notfound"));
    return () => { cancelled = true; };
  }, [store.zipCode, readOnly]);

  const saveStore = async () => {
    const errs: Partial<Record<keyof StoreForm, string>> = {};
    if (store.name.trim().length < 2) errs.name = "Informe o nome da loja";
    const c = digits(store.cnpj);
    if (c && (c.length !== 14 || !validateCNPJ(c))) errs.cnpj = "CNPJ inválido";
    if (store.email.trim() && !EMAIL_RE.test(store.email.trim())) errs.email = "E-mail inválido";
    const markup = Number(store.defaultMarkup.replace(",", "."));
    const billDays = Number(store.billAlertDays);
    const rxDays = Number(store.prescriptionAlertDays);
    const minStock = Number(store.defaultMinStock);
    if (!Number.isFinite(markup) || markup < 0) errs.defaultMarkup = "Informe um percentual válido";
    if (!Number.isInteger(billDays) || billDays < 1) errs.billAlertDays = "Mínimo de 1 dia";
    if (!Number.isInteger(rxDays) || rxDays < 1) errs.prescriptionAlertDays = "Mínimo de 1 dia";
    if (!Number.isInteger(minStock) || minStock < 0) errs.defaultMinStock = "Informe um número inteiro";
    const wa = digits(store.whatsapp);
    if (wa && (wa.length < 10 || wa.length > 11)) errs.whatsapp = "Informe o número com DDD";
    const ig = normalizeInstagram(store.instagram);
    if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) errs.instagram = "Use só o nome de usuário (letras, números, ponto e _)";
    if (store.siteHeadline.trim().length > HEADLINE_MAX) errs.siteHeadline = `Máximo de ${HEADLINE_MAX} caracteres`;
    if (store.openingHours.trim().length > HOURS_MAX) errs.openingHours = `Máximo de ${HOURS_MAX} caracteres`;
    setErrors(errs);
    if (Object.keys(errs).length) {
      const sysFields: (keyof StoreForm)[] = ["defaultMarkup", "billAlertDays", "prescriptionAlertDays", "defaultMinStock"];
      const siteFields: (keyof StoreForm)[] = ["whatsapp", "instagram", "siteHeadline", "openingHours"];
      if (Object.keys(errs).some((k) => sysFields.includes(k as keyof StoreForm))) setTab("sistema");
      else if (Object.keys(errs).some((k) => siteFields.includes(k as keyof StoreForm))) setTab("site");
      else setTab("loja");
      toast({ title: "Revise os campos destacados", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Backend zod: strings only (null rejected) and numbers as numbers.
      const res = await settingsService.update({
        name: store.name.trim(),
        cnpj: c,
        phone: digits(store.phone),
        email: store.email.trim(),
        address: store.address.trim(),
        city: store.city.trim(),
        state: store.state.trim(),
        zipCode: digits(store.zipCode),
        defaultMarkup: markup,
        billAlertDays: billDays,
        prescriptionAlertDays: rxDays,
        defaultMinStock: minStock,
        printerType: store.printerType,
        whatsapp: wa,
        instagram: ig,
        openingHours: store.openingHours.split("\n").map((l) => l.trim()).filter(Boolean).join("\n"),
        siteHeadline: store.siteHeadline.trim(),
      });
      const f = toForm(res.data);
      setStore(f);
      setSaved(f);
      toast({ title: "Configurações salvas" });
    } catch (e) {
      toast({ title: "Erro ao salvar configurações", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* users */
  const openCreateUser = () => {
    setEditUser(null);
    setUserForm({ name: "", email: "", password: "", role: "SELLER" });
    setUserErrors({});
    setUserDialogOpen(true);
  };
  const openEditUser = (u: SystemUser) => {
    setEditUser(u);
    setUserForm({ name: u.name, email: u.email, password: "", role: u.role });
    setUserErrors({});
    setUserDialogOpen(true);
  };

  const saveUser = async () => {
    const errs: Record<string, string> = {};
    if (userForm.name.trim().length < 2) errs.name = "Informe o nome (mín. 2 caracteres)";
    if (!EMAIL_RE.test(userForm.email.trim())) errs.email = "E-mail inválido";
    if (!editUser && userForm.password.length < 6) errs.password = "A senha precisa ter ao menos 6 caracteres";
    if (editUser && userForm.password && userForm.password.length < 6) errs.password = "A senha precisa ter ao menos 6 caracteres";
    if (editUser && editUser.id === me?.id && userForm.role !== "ADMIN") errs.role = "Você não pode remover seu próprio acesso de administrador";
    setUserErrors(errs);
    if (Object.keys(errs).length) return;

    setUserSaving(true);
    try {
      if (editUser) {
        const payload: { name: string; email: string; role: UserRoleCode; password?: string } = {
          name: userForm.name.trim(),
          email: userForm.email.trim().toLowerCase(),
          role: userForm.role,
        };
        if (userForm.password) payload.password = userForm.password;
        await userService.update(editUser.id, payload);
        toast({ title: "Usuário atualizado", description: payload.name });
      } else {
        await userService.create({
          name: userForm.name.trim(),
          email: userForm.email.trim().toLowerCase(),
          password: userForm.password,
          role: userForm.role,
        });
        toast({ title: "Usuário criado", description: `${userForm.name.trim()} já pode acessar o sistema.` });
      }
      setUserDialogOpen(false);
      fetchUsers();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/e-?mail/i.test(msg)) setUserErrors((p) => ({ ...p, email: msg }));
      toast({ title: "Erro ao salvar usuário", description: msg, variant: "destructive" });
    } finally {
      setUserSaving(false);
    }
  };

  const toggleUserActive = async (u: SystemUser) => {
    if (u.id === me?.id) {
      toast({ title: "Você não pode desativar sua própria conta", variant: "destructive" });
      return;
    }
    setTogglingId(u.id);
    try {
      await userService.update(u.id, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: !u.isActive } : x)));
      toast({ title: u.isActive ? "Usuário desativado" : "Usuário reativado", description: u.name });
    } catch (e) {
      toast({ title: "Erro ao alterar status", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const openReset = (u: SystemUser) => {
    setResetUser(u);
    setResetPwd(generatePassword());
  };

  const doReset = async () => {
    if (!resetUser) return;
    if (resetPwd.length < 6) {
      toast({ title: "A senha precisa ter ao menos 6 caracteres", variant: "destructive" });
      return;
    }
    setResetSaving(true);
    try {
      await userService.update(resetUser.id, { password: resetPwd });
      try { await navigator.clipboard.writeText(resetPwd); } catch { /* clipboard optional */ }
      toast({ title: "Senha redefinida", description: `Nova senha de ${resetUser.name.split(" ")[0]} copiada para a área de transferência.` });
      setResetUser(null);
    } catch (e) {
      toast({ title: "Erro ao redefinir senha", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setResetSaving(false);
    }
  };

  const markupNum = Number(store.defaultMarkup.replace(",", "."));
  const activeAdmins = users.filter((u) => u.role === "ADMIN" && u.isActive).length;

  const saveBar = !readOnly && (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
      {dirty && <p className="text-xs text-warning sm:mr-auto">Há alterações não salvas.</p>}
      <div className="flex gap-2">
        {dirty && <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => { setStore(saved); setErrors({}); }}>Descartar</Button>}
        <Button onClick={saveStore} disabled={saving || !dirty} className="flex-1 sm:flex-none">
          {saving ? <Loader2 className="animate-spin" /> : <Save />} {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Administração"
          title="Configurações"
          description="Dados da loja, parâmetros do sistema e acesso da equipe."
          icon={SettingsIcon}
        />

        {readOnly && (
          <div {...rise(1)} className={cn(rise(1).className, "flex items-start gap-3 rounded-xl border border-border bg-info-soft p-4 text-sm text-info")}>
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Somente administradores podem alterar as configurações. Você está vendo os dados em modo leitura.</p>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className={cn("grid h-auto w-full sm:inline-grid sm:w-auto", isAdmin ? "grid-cols-4" : "grid-cols-3")}>
            <TabsTrigger value="loja" className="gap-1.5 px-2 py-2 sm:px-3"><Store className="hidden h-4 w-4 sm:block" /> Loja</TabsTrigger>
            <TabsTrigger value="sistema" className="gap-1.5 px-2 py-2 sm:px-3"><SlidersHorizontal className="hidden h-4 w-4 sm:block" /> Sistema</TabsTrigger>
            <TabsTrigger value="site" className="gap-1.5 px-2 py-2 sm:px-3"><Globe className="hidden h-4 w-4 sm:block" /> Site</TabsTrigger>
            {isAdmin && <TabsTrigger value="usuarios" className="gap-1.5 px-2 py-2 sm:px-3"><Users className="hidden h-4 w-4 sm:block" /> Usuários</TabsTrigger>}
          </TabsList>

          {/* ═════════ LOJA ═════════ */}
          <TabsContent value="loja" className="mt-6 space-y-4">
            {loading ? (
              <Skeleton className="h-[420px] rounded-2xl" />
            ) : loadError ? (
              <Panel>
                <EmptyState icon={AlertTriangle} title="Não foi possível carregar" description="Verifique sua conexão e tente novamente."
                  action={<Button variant="outline" onClick={fetchSettings}><RefreshCw /> Tentar novamente</Button>} />
              </Panel>
            ) : (
              <>
                <Panel {...rise(2)} title="Informações da loja" description="Aparecem em recibos, orçamentos e impressões." icon={Store}>
                  <fieldset disabled={readOnly} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
                    <Field id="st-name" label="Nome da loja *" error={errors.name} className="md:col-span-2 lg:col-span-4">
                      <Input id="st-name" value={store.name} onChange={(e) => handleStoreChange("name", e.target.value)} placeholder="Óticas Império" />
                    </Field>
                    <Field id="st-cnpj" label="CNPJ" error={errors.cnpj} className="lg:col-span-2"
                      hint={digits(store.cnpj).length === 14 && validateCNPJ(digits(store.cnpj)) ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" />CNPJ válido</span> : undefined}>
                      <Input id="st-cnpj" inputMode="numeric" className="num" value={store.cnpj} onChange={(e) => handleStoreChange("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
                    </Field>
                    <Field id="st-phone" label="Telefone" className="lg:col-span-2">
                      <Input id="st-phone" inputMode="tel" className="num" value={store.phone} onChange={(e) => handleStoreChange("phone", e.target.value)} placeholder="(00) 00000-0000" />
                    </Field>
                    <Field id="st-email" label="E-mail" error={errors.email} className="lg:col-span-4">
                      <Input id="st-email" type="email" value={store.email} onChange={(e) => handleStoreChange("email", e.target.value)} placeholder="contato@oticaimperio.com.br" />
                    </Field>
                    <Field id="st-cep" label="CEP" className="lg:col-span-2"
                      hint={cepStatus === "loading" ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Buscando endereço…</span>
                        : cepStatus === "ok" ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" />Cidade e UF preenchidas</span>
                        : cepStatus === "notfound" ? <span className="text-warning">CEP não encontrado</span> : undefined}>
                      <Input id="st-cep" inputMode="numeric" className="num" value={store.zipCode} onChange={(e) => handleStoreChange("zipCode", e.target.value)} placeholder="00000-000" />
                    </Field>
                    <Field id="st-address" label="Endereço" className="md:col-span-2 lg:col-span-4">
                      <Input id="st-address" value={store.address} onChange={(e) => handleStoreChange("address", e.target.value)} placeholder="Rua, número, bairro" />
                    </Field>
                    <Field id="st-city" label="Cidade" className="lg:col-span-4">
                      <Input id="st-city" value={store.city} onChange={(e) => handleStoreChange("city", e.target.value)} />
                    </Field>
                    <Field id="st-uf" label="UF" className="lg:col-span-2">
                      <Input id="st-uf" value={store.state} onChange={(e) => handleStoreChange("state", e.target.value)} maxLength={2} placeholder="SP" />
                    </Field>
                  </fieldset>
                </Panel>
                {saveBar}
              </>
            )}
          </TabsContent>

          {/* ═════════ SISTEMA ═════════ */}
          <TabsContent value="sistema" className="mt-6 space-y-4">
            {loading ? (
              <Skeleton className="h-[320px] rounded-2xl" />
            ) : loadError ? (
              <Panel>
                <EmptyState icon={AlertTriangle} title="Não foi possível carregar" description="Verifique sua conexão e tente novamente."
                  action={<Button variant="outline" onClick={fetchSettings}><RefreshCw /> Tentar novamente</Button>} />
              </Panel>
            ) : (
              <>
                <Panel {...rise(2)} title="Parâmetros do sistema" description="Padrões usados em produtos, alertas e impressão." icon={SlidersHorizontal}>
                  <fieldset disabled={readOnly} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field id="sys-markup" label="Markup padrão (%)" error={errors.defaultMarkup}
                      hint={Number.isFinite(markupNum) && markupNum >= 0
                        ? <>Ex.: custo de <span className="num">{formatCurrency(100)}</span> → venda sugerida de <span className="num font-semibold text-foreground">{formatCurrency(100 * (1 + markupNum / 100))}</span></>
                        : "Aplicado a novos produtos."}>
                      <Input id="sys-markup" inputMode="decimal" className="num" value={store.defaultMarkup} onChange={(e) => handleStoreChange("defaultMarkup", e.target.value)} />
                    </Field>
                    <Field id="sys-min" label="Estoque mínimo padrão" error={errors.defaultMinStock} hint="Quantidade que dispara o alerta de estoque baixo.">
                      <Input id="sys-min" type="number" min={0} className="num" value={store.defaultMinStock} onChange={(e) => handleStoreChange("defaultMinStock", e.target.value)} />
                    </Field>
                    <Field id="sys-bill" label="Alerta de contas a pagar (dias antes)" error={errors.billAlertDays} hint="Janela de “próximas” no Financeiro.">
                      <Input id="sys-bill" type="number" min={1} className="num" value={store.billAlertDays} onChange={(e) => handleStoreChange("billAlertDays", e.target.value)} />
                    </Field>
                    <Field id="sys-rx" label="Alerta de receitas (dias antes do vencimento)" error={errors.prescriptionAlertDays} hint="Para convidar o cliente a renovar o exame.">
                      <Input id="sys-rx" type="number" min={1} className="num" value={store.prescriptionAlertDays} onChange={(e) => handleStoreChange("prescriptionAlertDays", e.target.value)} />
                    </Field>
                    <Field label="Tipo de impressora" hint="Formato dos recibos e comprovantes.">
                      <Select value={store.printerType} onValueChange={(v) => handleStoreChange("printerType", v)} disabled={readOnly}>
                        <SelectTrigger><Printer className="mr-2 h-4 w-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4 (padrão)</SelectItem>
                          <SelectItem value="80mm">Térmica 80 mm</SelectItem>
                          <SelectItem value="58mm">Térmica 58 mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </fieldset>
                </Panel>
                {saveBar}
              </>
            )}
          </TabsContent>

          {/* ═════════ SITE / VITRINE ═════════ */}
          <TabsContent value="site" className="mt-6 space-y-4">
            {loading ? (
              <Skeleton className="h-[420px] rounded-2xl" />
            ) : loadError ? (
              <Panel>
                <EmptyState icon={AlertTriangle} title="Não foi possível carregar" description="Verifique sua conexão e tente novamente."
                  action={<Button variant="outline" onClick={fetchSettings}><RefreshCw /> Tentar novamente</Button>} />
              </Panel>
            ) : (
              <>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <Panel {...rise(2)} title="Site / Vitrine" description="Contato e textos exibidos no site público da loja." icon={Globe}
                    actions={
                      <Button variant="outline" size="sm" asChild>
                        <a href="/" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Ver site</a>
                      </Button>
                    }>
                    <fieldset disabled={readOnly} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <Field id="site-wa" label="WhatsApp da loja" error={errors.whatsapp}
                        hint="Botão “Chamar no WhatsApp” do site. Clientes falam direto com a loja.">
                        <div className="relative">
                          <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="site-wa" inputMode="tel" className="num pl-9" value={store.whatsapp}
                            onChange={(e) => handleStoreChange("whatsapp", e.target.value)} placeholder="(11) 99999-9999" />
                        </div>
                      </Field>
                      <Field id="site-ig" label="Instagram" error={errors.instagram}
                        hint="Pode colar o link do perfil — guardamos só o @usuario.">
                        <div className="relative">
                          <Instagram className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="site-ig" className="pl-9" value={store.instagram}
                            onChange={(e) => handleStoreChange("instagram", e.target.value)}
                            onBlur={() => { const ig = normalizeInstagram(store.instagram); setStore((p) => ({ ...p, instagram: ig ? `@${ig}` : "" })); }}
                            placeholder="@oticaimperio" />
                        </div>
                      </Field>
                      <Field id="site-headline" label="Frase de destaque do site" error={errors.siteHeadline} className="md:col-span-2"
                        hint={<span className="flex justify-between gap-2"><span>Aparece no topo da página inicial.</span>
                          <span className={cn("num shrink-0", store.siteHeadline.length > HEADLINE_MAX - 20 && "text-warning", store.siteHeadline.length > HEADLINE_MAX && "text-danger")}>
                            {store.siteHeadline.length}/{HEADLINE_MAX}
                          </span></span>}>
                        <Input id="site-headline" maxLength={HEADLINE_MAX} value={store.siteHeadline}
                          onChange={(e) => handleStoreChange("siteHeadline", e.target.value)}
                          placeholder="Óculos de grau, solares e lentes com atendimento de quem cuida do seu olhar." />
                      </Field>
                      <Field id="site-hours" label="Horário de funcionamento" error={errors.openingHours} className="md:col-span-2"
                        hint="Uma linha por faixa de dias. Deixe em branco para não exibir.">
                        <Textarea id="site-hours" rows={4} maxLength={HOURS_MAX} value={store.openingHours}
                          onChange={(e) => handleStoreChange("openingHours", e.target.value)}
                          placeholder={"Seg a Sex: 9h às 18h\nSáb: 9h às 13h\nDom e feriados: fechado"} />
                      </Field>
                    </fieldset>
                  </Panel>

                  {/* Live preview */}
                  <section {...rise(3)} className={cn(rise(3).className, "surface overflow-hidden self-start")}>
                    <div className="ink-texture px-5 py-5 text-primary-foreground">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">Prévia no site</p>
                      <p className="mt-2 font-display text-lg font-semibold leading-snug text-white">
                        {store.siteHeadline.trim() || <span className="opacity-50">Sua frase de destaque aparece aqui</span>}
                      </p>
                    </div>
                    <div className="space-y-3 p-5 text-sm">
                      <p className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-success" />
                        {digits(store.whatsapp).length >= 10
                          ? <span className="num">{store.whatsapp}</span>
                          : <span className="text-muted-foreground">WhatsApp não informado</span>}
                      </p>
                      <p className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-gold-foreground" />
                        {normalizeInstagram(store.instagram)
                          ? <span>@{normalizeInstagram(store.instagram)}</span>
                          : <span className="text-muted-foreground">Instagram não informado</span>}
                      </p>
                      <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 h-4 w-4 text-primary" />
                        {store.openingHours.trim() ? (
                          <ul className="space-y-0.5">
                            {store.openingHours.split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}
                          </ul>
                        ) : <span className="text-muted-foreground">Horário não informado</span>}
                      </div>
                    </div>
                  </section>
                </div>
                {saveBar}
              </>
            )}
          </TabsContent>

          {/* ═════════ USUÁRIOS ═════════ */}
          {isAdmin && (
            <TabsContent value="usuarios" className="mt-6">
              <Panel
                {...rise(2)}
                title="Equipe"
                description={usersLoading ? "Carregando…" : `${users.filter((u) => u.isActive).length} ativos de ${users.length} usuários`}
                icon={Users}
                bodyClassName="p-0"
                actions={<Button onClick={openCreateUser}><Plus /> Novo usuário</Button>}
              >
                {usersLoading ? (
                  <div className="space-y-4 border-t border-border p-5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/4" /></div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                ) : usersError ? (
                  <EmptyState icon={AlertTriangle} title="Não foi possível carregar os usuários" description="Tente novamente."
                    action={<Button variant="outline" onClick={fetchUsers}><RefreshCw /> Tentar novamente</Button>} />
                ) : users.length === 0 ? (
                  <EmptyState icon={Users} title="Nenhum usuário" description="Cadastre a equipe da loja." action={<Button onClick={openCreateUser}><Plus /> Novo usuário</Button>} />
                ) : (
                  <>
                    {/* mobile */}
                    <div className="divide-y divide-border border-t border-border md:hidden">
                      {users.map((u) => (
                        <div key={u.id} className={cn("px-5 py-4", !u.isActive && "opacity-60")}>
                          <div className="flex items-start gap-3">
                            <InitialsAvatar name={u.name} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{u.name}{u.id === me?.id && <span className="ml-1 text-xs text-muted-foreground">(você)</span>}</p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <StatusPill tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</StatusPill>
                                {!u.isActive && <StatusPill tone="danger">Inativo</StatusPill>}
                              </div>
                              <p className="num mt-1 text-xs text-muted-foreground">{u.lastLogin ? `Último acesso ${formatDateTime(u.lastLogin)}` : "Nunca acessou"}</p>
                            </div>
                            <Switch checked={u.isActive} disabled={u.id === me?.id || togglingId === u.id} onCheckedChange={() => toggleUserActive(u)} aria-label="Ativo" />
                          </div>
                          <div className="mt-2 flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openReset(u)}><KeyRound /> Senha</Button>
                            <Button size="sm" variant="ghost" onClick={() => openEditUser(u)}><Pencil /> Editar</Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* desktop */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-5">Usuário</TableHead>
                            <TableHead>Perfil</TableHead>
                            <TableHead>Último acesso</TableHead>
                            <TableHead>Ativo</TableHead>
                            <TableHead className="pr-5 text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((u) => (
                            <TableRow key={u.id} className={cn(!u.isActive && "opacity-60")}>
                              <TableCell className="pl-5">
                                <div className="flex items-center gap-3">
                                  <InitialsAvatar name={u.name} size="sm" />
                                  <div className="min-w-0">
                                    <p className="font-medium">{u.name}{u.id === me?.id && <span className="ml-1 text-xs text-muted-foreground">(você)</span>}</p>
                                    <p className="text-xs text-muted-foreground">{u.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell><StatusPill tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</StatusPill></TableCell>
                              <TableCell className="num text-sm text-muted-foreground">{u.lastLogin ? formatDateTime(u.lastLogin) : "Nunca acessou"}</TableCell>
                              <TableCell>
                                <Switch checked={u.isActive} disabled={u.id === me?.id || togglingId === u.id} onCheckedChange={() => toggleUserActive(u)}
                                  aria-label={u.isActive ? "Desativar usuário" : "Ativar usuário"} />
                              </TableCell>
                              <TableCell className="pr-5 text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => openReset(u)} title="Redefinir senha"><KeyRound /> Senha</Button>
                                  <Button size="icon" variant="ghost" onClick={() => openEditUser(u)} aria-label="Editar"><Pencil /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {activeAdmins === 1 && (
                      <div className="flex items-start gap-2 border-t border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        Há apenas um administrador ativo. Considere ter um segundo administrador para não perder o acesso às configurações.
                      </div>
                    )}
                  </>
                )}
              </Panel>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* user dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editUser ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>{editUser ? editUser.email : "Crie o acesso de um membro da equipe."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field id="u-name" label="Nome *" error={userErrors.name}>
              <Input id="u-name" value={userForm.name} onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field id="u-email" label="E-mail *" error={userErrors.email}>
              <Input id="u-email" type="email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} />
            </Field>
            <Field id="u-pass" label={editUser ? "Nova senha (deixe em branco para manter)" : "Senha *"} error={userErrors.password}
              hint={!editUser ? (
                <button type="button" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  onClick={() => setUserForm((p) => ({ ...p, password: generatePassword() }))}>
                  <Wand2 className="h-3 w-3" /> Gerar senha segura
                </button>
              ) : undefined}>
              <Input id="u-pass" type={editUser ? "password" : "text"} autoComplete="new-password" className={cn(!editUser && "font-mono")} value={userForm.password}
                onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} />
            </Field>
            <Field label="Perfil" error={userErrors.role} hint={ROLE_HINT[userForm.role]}>
              <Select value={userForm.role} onValueChange={(v) => setUserForm((p) => ({ ...p, role: v as UserRoleCode }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as UserRoleCode[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveUser} disabled={userSaving}>
              {userSaving && <Loader2 className="animate-spin" />} {userSaving ? "Salvando…" : editUser ? "Salvar" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* reset password */}
      <Dialog open={!!resetUser} onOpenChange={(o) => !o && setResetUser(null)}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Redefinir senha</DialogTitle>
            <DialogDescription>Defina uma nova senha para {resetUser?.name}. Informe-a pessoalmente ao usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-pwd">Nova senha</Label>
            <div className="flex gap-2">
              <Input id="reset-pwd" className="font-mono" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} />
              <Button type="button" variant="outline" size="icon" onClick={() => setResetPwd(generatePassword())} aria-label="Gerar outra"><Wand2 /></Button>
              <Button type="button" variant="outline" size="icon" aria-label="Copiar"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(resetPwd); toast({ title: "Senha copiada" }); } catch { /* ignore */ }
                }}>
                <Copy />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetUser(null)}>Cancelar</Button>
            <Button onClick={doReset} disabled={resetSaving}>
              {resetSaving ? <Loader2 className="animate-spin" /> : <KeyRound />} Redefinir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
