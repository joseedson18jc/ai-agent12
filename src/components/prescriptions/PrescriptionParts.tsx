import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Copy, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill, InitialsAvatar } from "@/components/imperio";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LensTreatment, LensType, type Prescription } from "@/types";
import prescriptionService, {
  LENS_TYPE_LABELS, TREATMENT_LABELS, formatAxis, formatDiopter, formatMm, getValidity, validityLabel,
  type PrescriptionPayload,
} from "@/services/prescription.service";
import customerService, { type CustomerListItem } from "@/services/customer.service";

/* ── Datas "somente dia" ────────────────────────────────────
   Guardamos datas ao meio-dia UTC para que o dia não mude em
   nenhum fuso do Brasil; exibimos a parte AAAA-MM-DD. */
export function toIsoDay(day: string): string {
  return new Date(`${day}T12:00:00.000Z`).toISOString();
}
export function isoToDay(iso?: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}
export function formatDay(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}
function todayDay(): string {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}
function addYears(day: string, years: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${y + years}-${p(m)}-${p(d)}`;
}

/* ── Pill de validade ──────────────────────────────────── */
export function ValidityPill({ validity }: { validity: string }) {
  const { state } = getValidity(validity);
  const tone = state === "expired" ? "danger" : state === "expiring" ? "warning" : "success";
  return <StatusPill tone={tone}>{validityLabel(validity)}</StatusPill>;
}

/* ── Grade OD/OE ───────────────────────────────────────── */
type Eye = "od" | "oe";
function eyeValues(rx: Partial<Prescription>, eye: Eye) {
  return eye === "od"
    ? {
        sph: rx.odSpherical, cyl: rx.odCylindrical, axis: rx.odAxis,
        dnp: rx.odDnp, height: rx.odHeight, add: rx.odAddition,
      }
    : {
        sph: rx.oeSphrical, cyl: rx.oeCylindrical, axis: rx.oeAxis,
        dnp: rx.oeDnp, height: rx.oeHeight, add: rx.oeAddition,
      };
}

export function PrescriptionGrid({ rx, compact = false }: { rx: Partial<Prescription>; compact?: boolean }) {
  const cols = ["Esférico", "Cilíndrico", "Eixo", "DNP", "Altura", "Adição"];
  const rows: { eye: Eye; label: string; long: string }[] = [
    { eye: "od", label: "OD", long: "Olho direito" },
    { eye: "oe", label: "OE", long: "Olho esquerdo" },
  ];
  const cell = (eye: Eye) => {
    const v = eyeValues(rx, eye);
    return [formatDiopter(v.sph), formatDiopter(v.cyl), formatAxis(v.axis), formatMm(v.dnp), formatMm(v.height), formatDiopter(v.add)];
  };
  return (
    <>
      {/* Mobile: cartões por olho */}
      <div className={cn("grid gap-2 sm:hidden", compact && "text-xs")}>
        {rows.map((r) => (
          <div key={r.eye} className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="eyebrow mb-2">{r.long} ({r.label})</p>
            <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
              {cell(r.eye).map((val, i) => (
                <div key={cols[i]}>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{cols[i]}</dt>
                  <dd className="num text-sm font-semibold">{val}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      {/* Desktop: grade */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Olho</th>
              {cols.map((c) => (
                <th key={c} className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.eye} className="border-t border-border">
                <td className="px-3 py-2">
                  <span className="font-display font-semibold text-primary">{r.label}</span>
                  {!compact && <span className="ml-2 text-xs text-muted-foreground">{r.long}</span>}
                </td>
                {cell(r.eye).map((val, i) => (
                  <td key={cols[i]} className="num px-3 py-2 text-right font-medium">{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ── Formulário (criar/editar) ─────────────────────────── */
type FieldKey = "sph" | "cyl" | "axis" | "dnp" | "height" | "add";
type EyeForm = Record<FieldKey, string>;
const EMPTY_EYE: EyeForm = { sph: "", cyl: "", axis: "", dnp: "", height: "", add: "" };

const FIELD_META: Record<FieldKey, { label: string; placeholder: string; min: number; max: number; step?: number; int?: boolean; unit?: string }> = {
  sph: { label: "Esférico", placeholder: "+0,00", min: -30, max: 30, step: 0.25 },
  cyl: { label: "Cilíndrico", placeholder: "-0,00", min: -10, max: 10, step: 0.25 },
  axis: { label: "Eixo", placeholder: "0–180", min: 0, max: 180, int: true, unit: "°" },
  dnp: { label: "DNP", placeholder: "mm", min: 20, max: 45, unit: "mm" },
  height: { label: "Altura", placeholder: "mm", min: 10, max: 40, unit: "mm" },
  add: { label: "Adição", placeholder: "+0,00", min: 0.5, max: 4, step: 0.25 },
};

function parseNum(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".").replace("−", "-");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function numToField(v?: number | null): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(".", ",");
}

function validateEye(eye: EyeForm): Partial<Record<FieldKey, string>> {
  const errs: Partial<Record<FieldKey, string>> = {};
  (Object.keys(FIELD_META) as FieldKey[]).forEach((k) => {
    const meta = FIELD_META[k];
    const n = parseNum(eye[k]);
    if (n === null) return;
    if (Number.isNaN(n)) errs[k] = "Número inválido";
    else if (n < meta.min || n > meta.max) errs[k] = `Entre ${meta.min} e ${meta.max}`;
    else if (meta.int && !Number.isInteger(n)) errs[k] = "Use número inteiro";
    else if (meta.step && Math.abs(Math.round(n / meta.step) * meta.step - n) > 1e-6) errs[k] = "Passos de 0,25";
  });
  const cyl = parseNum(eye.cyl);
  if (cyl && !Number.isNaN(cyl) && cyl !== 0 && parseNum(eye.axis) === null && !errs.axis) {
    errs.axis = "Informe o eixo do cilíndrico";
  }
  return errs;
}

export function PrescriptionFormDialog({
  open,
  onOpenChange,
  prescription,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Receita a editar; ausente = nova receita */
  prescription?: Prescription | null;
  /** Cliente fixo (ex.: no perfil). Ausente = seletor de cliente. */
  customer?: { id: string; name: string } | null;
  onSaved?: (p: Prescription) => void;
}) {
  const { toast } = useToast();
  const isEdit = !!prescription;
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [selCustomer, setSelCustomer] = useState<{ id: string; name: string } | null>(null);
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<CustomerListItem[]>([]);
  const [custLoading, setCustLoading] = useState(false);

  const [date, setDate] = useState(todayDay());
  const [validity, setValidity] = useState(addYears(todayDay(), 1));
  const [validityTouched, setValidityTouched] = useState(false);
  const [doctor, setDoctor] = useState("");
  const [doctorCrm, setDoctorCrm] = useState("");
  const [lensType, setLensType] = useState<LensType | "">("");
  const [treatments, setTreatments] = useState<LensTreatment[]>([]);
  const [notes, setNotes] = useState("");
  const [od, setOd] = useState<EyeForm>(EMPTY_EYE);
  const [oe, setOe] = useState<EyeForm>(EMPTY_EYE);

  // Reinicia o formulário ao abrir
  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setCustQuery("");
    setCustResults([]);
    if (prescription) {
      setSelCustomer(prescription.customer ?? (customer || null));
      setDate(isoToDay(prescription.date));
      setValidity(isoToDay(prescription.validity));
      setValidityTouched(true);
      setDoctor(prescription.doctor ?? "");
      setDoctorCrm(prescription.doctorCrm ?? "");
      setLensType(prescription.lensType ?? "");
      setTreatments(prescription.treatments ?? []);
      setNotes(prescription.notes ?? "");
      setOd({
        sph: numToField(prescription.odSpherical), cyl: numToField(prescription.odCylindrical),
        axis: numToField(prescription.odAxis), dnp: numToField(prescription.odDnp),
        height: numToField(prescription.odHeight), add: numToField(prescription.odAddition),
      });
      setOe({
        sph: numToField(prescription.oeSphrical), cyl: numToField(prescription.oeCylindrical),
        axis: numToField(prescription.oeAxis), dnp: numToField(prescription.oeDnp),
        height: numToField(prescription.oeHeight), add: numToField(prescription.oeAddition),
      });
    } else {
      const t = todayDay();
      setSelCustomer(customer || null);
      setDate(t);
      setValidity(addYears(t, 1));
      setValidityTouched(false);
      setDoctor("");
      setDoctorCrm("");
      setLensType("");
      setTreatments([]);
      setNotes("");
      setOd(EMPTY_EYE);
      setOe(EMPTY_EYE);
    }
  }, [open, prescription, customer]);

  // Busca de clientes (debounce)
  useEffect(() => {
    if (!open || customer || selCustomer) return;
    const q = custQuery.trim();
    if (q.length < 2) {
      setCustResults([]);
      return;
    }
    setCustLoading(true);
    const t = setTimeout(() => {
      customerService
        .list({ search: q, limit: 6 })
        .then((r) => setCustResults(r.data))
        .catch(() => setCustResults([]))
        .finally(() => setCustLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [custQuery, open, customer, selCustomer]);

  const odErr = useMemo(() => validateEye(od), [od]);
  const oeErr = useMemo(() => validateEye(oe), [oe]);
  const dateErr = !date ? "Informe a data" : "";
  const validityErr = !validity ? "Informe a validade" : validity < date ? "Validade antes da data da receita" : "";
  const hasAddition = !!(parseNum(od.add) || parseNum(oe.add));
  const suggestMultifocal = hasAddition && lensType === "";

  const setEye = (eye: Eye, k: FieldKey, v: string) =>
    (eye === "od" ? setOd : setOe)((prev) => ({ ...prev, [k]: v }));

  const toggleTreatment = (t: LensTreatment) =>
    setTreatments((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const handleDateChange = (v: string) => {
    setDate(v);
    if (!validityTouched && v) setValidity(addYears(v, 1));
  };

  const numOrNull = (s: string) => {
    const n = parseNum(s);
    return n === null || Number.isNaN(n) ? null : n;
  };
  const strOrNull = (s: string) => (s.trim() ? s.trim() : null);

  const handleSubmit = async () => {
    setSubmitted(true);
    const target = customer || selCustomer;
    if (!target) {
      toast({ title: "Selecione o cliente", description: "A receita precisa estar vinculada a um cliente.", variant: "destructive" });
      return;
    }
    if (dateErr || validityErr || Object.keys(odErr).length || Object.keys(oeErr).length) {
      toast({ title: "Revise os campos destacados", variant: "destructive" });
      return;
    }
    const payload: PrescriptionPayload = {
      customerId: target.id,
      date: toIsoDay(date),
      validity: toIsoDay(validity),
      doctor: strOrNull(doctor),
      doctorCrm: strOrNull(doctorCrm),
      odSpherical: numOrNull(od.sph),
      odCylindrical: numOrNull(od.cyl),
      odAxis: numOrNull(od.axis),
      odDnp: numOrNull(od.dnp),
      odHeight: numOrNull(od.height),
      odAddition: numOrNull(od.add),
      oeSphrical: numOrNull(oe.sph),
      oeCylindrical: numOrNull(oe.cyl),
      oeAxis: numOrNull(oe.axis),
      oeDnp: numOrNull(oe.dnp),
      oeHeight: numOrNull(oe.height),
      oeAddition: numOrNull(oe.add),
      lensType: lensType || null,
      treatments,
      notes: strOrNull(notes),
    };
    // Na criação, omitimos campos vazios; na edição, null limpa o valor.
    const body = isEdit
      ? payload
      : (Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== null)) as PrescriptionPayload);
    setSaving(true);
    try {
      const saved = isEdit
        ? await prescriptionService.update(prescription!.id, body)
        : await prescriptionService.create(body);
      toast({ title: isEdit ? "Receita atualizada" : "Receita cadastrada", description: `Cliente: ${target.name}` });
      onSaved?.({ ...saved, customer: saved.customer ?? target });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Não foi possível salvar a receita",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const eyeBlock = (eye: Eye, title: string, values: EyeForm, errs: Partial<Record<FieldKey, string>>) => (
    <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display font-semibold">
          <span className="text-primary">{eye.toUpperCase()}</span>{" "}
          <span className="text-sm font-normal text-muted-foreground">{title}</span>
        </p>
        {eye === "oe" && (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOe({ ...od })}>
            <Copy className="mr-1 h-3.5 w-3.5" /> Copiar do OD
          </Button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {(Object.keys(FIELD_META) as FieldKey[]).map((k) => {
          const meta = FIELD_META[k];
          const err = errs[k];
          const showErr = err && (submitted || values[k] !== "");
          return (
            <div key={k} className="space-y-1">
              <Label htmlFor={`${eye}-${k}`} className="text-[11px] text-muted-foreground">
                {meta.label}
              </Label>
              <Input
                id={`${eye}-${k}`}
                inputMode="decimal"
                placeholder={meta.placeholder}
                value={values[k]}
                onChange={(e) => setEye(eye, k, e.target.value)}
                className={cn("num h-9 px-2 text-right", showErr && "border-danger focus-visible:ring-danger")}
                aria-invalid={!!showErr}
              />
              {showErr && <p className="text-[10px] leading-tight text-danger">{err}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const fixedCustomer = customer || (isEdit ? selCustomer : null);

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{isEdit ? "Editar receita" : "Nova receita"}</DialogTitle>
          <DialogDescription>
            Grau em dioptrias (use vírgula ou ponto; ex.: -1,25). DNP e altura em milímetros.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Cliente */}
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            {fixedCustomer || selCustomer ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <InitialsAvatar name={(fixedCustomer || selCustomer)!.name} size="sm" />
                  <span className="truncate font-medium">{(fixedCustomer || selCustomer)!.name}</span>
                </div>
                {!fixedCustomer && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelCustomer(null)}>
                    Trocar
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Buscar cliente por nome, CPF ou telefone…"
                  value={custQuery}
                  onChange={(e) => setCustQuery(e.target.value)}
                  className={cn("pl-9", submitted && "border-danger")}
                />
                {custLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                {custResults.length > 0 && (
                  <div className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-md">
                    {custResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelCustomer({ id: c.id, name: c.name })}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <InitialsAvatar name={c.name} size="sm" />
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {custQuery.trim().length >= 2 && !custLoading && custResults.length === 0 && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5" /> Nenhum cliente encontrado.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Dados da receita */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="rx-date">Data da receita *</Label>
              <Input id="rx-date" type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} />
              {submitted && dateErr && <p className="text-xs text-danger">{dateErr}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rx-validity">Validade *</Label>
              <Input
                id="rx-validity"
                type="date"
                value={validity}
                onChange={(e) => {
                  setValidity(e.target.value);
                  setValidityTouched(true);
                }}
              />
              {validityErr ? (
                <p className="text-xs text-danger">{validityErr}</p>
              ) : (
                !validityTouched && <p className="text-[11px] text-muted-foreground">Sugestão: 1 ano após a data</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rx-doctor">Médico(a)</Label>
              <Input id="rx-doctor" placeholder="Dr(a). nome" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rx-crm">CRM</Label>
              <Input id="rx-crm" placeholder="000000/UF" value={doctorCrm} onChange={(e) => setDoctorCrm(e.target.value)} />
            </div>
          </div>

          {/* Grade */}
          <div className="space-y-3">
            {eyeBlock("od", "Olho direito", od, odErr)}
            {eyeBlock("oe", "Olho esquerdo", oe, oeErr)}
          </div>

          {/* Lente & tratamentos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de lente</Label>
              <Select value={lensType || "none"} onValueChange={(v) => setLensType(v === "none" ? "" : (v as LensType))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informado</SelectItem>
                  {Object.values(LensType).map((t) => (
                    <SelectItem key={t} value={t}>
                      {LENS_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {suggestMultifocal && (
                <button
                  type="button"
                  onClick={() => setLensType(LensType.MULTIFOCAL)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gold-foreground hover:underline"
                >
                  <Sparkles className="h-3.5 w-3.5 text-gold" /> Há adição — sugerir lente multifocal
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Tratamentos</Label>
              <div className="flex flex-wrap gap-2">
                {Object.values(LensTreatment).map((t) => {
                  const on = treatments.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTreatment(t)}
                      aria-pressed={on}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-gold/50 hover:text-foreground",
                      )}
                    >
                      {TREATMENT_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rx-notes">Observações</Label>
            <Textarea id="rx-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: uso contínuo, lente de contato, prisma…" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar alterações" : "Cadastrar receita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Resumo de lente/tratamentos ───────────────────────── */
export function LensSummary({ rx }: { rx: Partial<Prescription> }) {
  if (!rx.lensType && !rx.treatments?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {rx.lensType && <StatusPill tone="navy">{LENS_TYPE_LABELS[rx.lensType]}</StatusPill>}
      {rx.treatments?.map((t) => (
        <StatusPill key={t} tone="gold">
          {TREATMENT_LABELS[t]}
        </StatusPill>
      ))}
    </div>
  );
}
