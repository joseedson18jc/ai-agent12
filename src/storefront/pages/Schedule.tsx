import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { addDays, format, isSunday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, CheckCircle2, Eye, Loader2, Wrench, Droplets, Sparkles, Sun, Sunset, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Container, Em, Honeypot, WhatsAppButton } from "../components/kit";
import { ContactFields, FormError, emptyContact, inputCls, validateContact, type ContactValues } from "../components/forms";
import { friendlyError, useCreateLead, useStoreInfo } from "../lib/api";
import { useSeo } from "../lib/seo";
import { BRAND, SERVICES, fullAddress, hoursLines, serviceBySlug, type ServiceSlug } from "../lib/store";

const ICONS: Record<ServiceSlug, React.ElementType> = {
  exame: Eye,
  ajuste: Wrench,
  "lentes-de-contato": Droplets,
  consultoria: Sparkles,
};

type Period = "Manhã" | "Tarde" | "Horário específico";

const SLOTS = Array.from({ length: 21 }, (_, i) => {
  const mins = 8 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

export default function Schedule() {
  const [params, setParams] = useSearchParams();
  const initial = serviceBySlug(params.get("servico"))?.slug ?? "exame";
  const [service, setService] = useState<ServiceSlug>(initial);
  const [date, setDate] = useState<string>("");
  const [period, setPeriod] = useState<Period>("Manhã");
  const [time, setTime] = useState("");
  const [values, setValues] = useState<ContactValues>(emptyContact);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactValues | "date" | "time", string>>>({});
  const [hp, setHp] = useState("");
  const lead = useCreateLead();
  const { data: store } = useStoreInfo();
  const hours = hoursLines(store);

  const svc = serviceBySlug(service)!;
  useSeo({
    title: lead.isSuccess ? "Pedido de agendamento enviado" : `Agendar ${svc.title.toLowerCase()}`,
    description: `Agende online ${svc.title.toLowerCase()} na ${BRAND}. Escolha o dia e o período — a loja confirma pelo WhatsApp.`,
  });

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 30 }, (_, i) => addDays(today, i + 1));
  }, []);

  const pickService = (s: ServiceSlug) => {
    setService(s);
    const next = new URLSearchParams(params);
    next.set("servico", s);
    setParams(next, { replace: true });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = validateContact(values);
    if (!date) errs.date = "Escolha um dia.";
    if (period === "Horário específico" && !time) errs.time = "Escolha o horário.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = errs.date ? "date-picker" : errs.time ? "time-select" : null;
      if (first) document.getElementById(first)?.scrollIntoView({ behavior: "smooth", block: "center" });
      else document.getElementById("agenda-form")?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    lead.mutate({
      type: "APPOINTMENT",
      name: values.name.trim(),
      phone: values.phone,
      email: values.email.trim() || undefined,
      message: values.message.trim() || undefined,
      service: svc.title,
      preferredDate: date,
      preferredTime: period === "Horário específico" ? time : period,
      website: hp,
    }, { onSuccess: () => window.scrollTo({ top: 0, behavior: "smooth" }) });
  };

  const dateLabel = date ? format(new Date(`${date}T12:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR }) : "";
  const whenLabel = `${dateLabel}${period === "Horário específico" ? (time ? `, às ${time}` : "") : `, ${period.toLowerCase()}`}`;

  if (lead.isSuccess) {
    const first = values.name.trim().split(" ")[0];
    const msg = `Olá! Pedi pelo site um agendamento de ${svc.title.toLowerCase()} para ${whenLabel}. Meu nome é ${values.name.trim()}.`;
    return (
      <Container className="py-12 sm:py-20">
        <div className="mx-auto max-w-xl text-center" role="status">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <p className="eyebrow mt-6 !text-gold">Pedido enviado</p>
          <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">Até breve, <Em>{first}</Em>!</h1>
          <p className="mt-3 text-muted-foreground">
            Recebemos seu pedido de <b className="font-semibold text-foreground">{svc.title.toLowerCase()}</b> para{" "}
            <b className="font-semibold text-foreground">{whenLabel}</b>. A loja vai confirmar o horário pelo WhatsApp{" "}
            <span className="num whitespace-nowrap">{values.phone}</span> — fique de olho nas mensagens.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <WhatsAppButton message={msg}>Falar com a loja agora</WhatsAppButton>
            <Link to="/loja" className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-6 font-semibold hover:border-gold hover:bg-gold-soft">
              Ver armações enquanto isso
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="max-w-2xl animate-rise">
        <p className="eyebrow flex items-center gap-2 !text-gold"><span className="h-px w-6 bg-gold" /> Agendamento</p>
        <h1 className="mt-3 font-display text-[2.4rem] font-medium leading-[1.02] text-primary sm:text-6xl">
          Reserve seu <Em>horário</Em>
        </h1>
        <p className="mt-3 text-[17px] text-muted-foreground">Escolha o serviço e o dia de preferência. A loja confirma pelo WhatsApp — sem custo para agendar.</p>
      </div>

      <form id="agenda-form" onSubmit={submit} noValidate className="relative mt-10 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14 [&>*]:min-w-0">
        <div className="space-y-10">
          {/* 1. Service */}
          <fieldset>
            <legend className="mb-4 flex items-center gap-3 font-display text-2xl font-medium">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-sans text-sm font-semibold text-gold">1</span>
              Qual serviço?
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {SERVICES.map((s) => {
                const Icon = ICONS[s.slug];
                const active = s.slug === service;
                return (
                  <label
                    key={s.slug}
                    className={cn(
                      "relative flex cursor-pointer gap-4 rounded-2xl border p-4 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring sm:p-5",
                      active ? "border-primary bg-primary text-primary-foreground shadow-lg" : "border-border bg-card hover:border-gold/60",
                    )}
                  >
                    <input type="radio" name="service" value={s.slug} checked={active} onChange={() => pickService(s.slug)} className="sr-only" />
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", active ? "bg-gold/20 text-gold" : "bg-gold-soft text-gold-foreground")}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 pr-5">
                      <span className="block font-semibold">{s.title}</span>
                      <span className={cn("mt-1 block text-sm leading-snug", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{s.description}</span>
                      <span className={cn("mt-2 inline-flex items-center gap-1 text-xs font-semibold", active ? "text-gold" : "text-muted-foreground")}>
                        <Clock className="h-3 w-3" /> {s.duration}
                      </span>
                    </span>
                    {active && <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-gold" />}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* 2. Date */}
          <fieldset id="date-picker" className="min-w-0 scroll-mt-28">
            <legend className="mb-1 flex items-center gap-3 font-display text-2xl font-medium">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-sans text-sm font-semibold text-gold">2</span>
              Qual dia?
            </legend>
            <p className="mb-4 ml-11 text-sm text-muted-foreground">Próximos 30 dias · não atendemos aos domingos.</p>
            <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:px-0">
              <div className="grid w-max grid-flow-col grid-rows-1 gap-2 sm:w-auto sm:grid-flow-row sm:grid-cols-6 md:grid-cols-7">
                {days.map((d) => {
                  const iso = format(d, "yyyy-MM-dd");
                  const sunday = isSunday(d);
                  const active = iso === date;
                  return (
                    <label
                      key={iso}
                      className={cn(
                        "relative flex w-[68px] flex-col items-center rounded-2xl border py-2.5 text-center transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring sm:w-auto",
                        sunday
                          ? "cursor-not-allowed border-dashed border-border bg-transparent text-muted-foreground/50"
                          : active
                            ? "cursor-pointer border-primary bg-primary text-primary-foreground shadow-md"
                            : "cursor-pointer border-border bg-card hover:border-gold",
                      )}
                    >
                      <input
                        type="radio"
                        name="date"
                        value={iso}
                        disabled={sunday}
                        checked={active}
                        onChange={() => {
                          setDate(iso);
                          setErrors((e) => ({ ...e, date: undefined }));
                        }}
                        className="sr-only"
                        aria-label={format(d, "EEEE, d 'de' MMMM", { locale: ptBR }) + (sunday ? " (fechado)" : "")}
                      />
                      <span className={cn("text-[10.5px] font-semibold uppercase tracking-wider", active ? "text-gold" : "")}>{format(d, "EEE", { locale: ptBR }).replace(".", "")}</span>
                      <span className="num font-display text-2xl font-medium leading-tight">{format(d, "d")}</span>
                      <span className="text-[10.5px]">{format(d, "MMM", { locale: ptBR }).replace(".", "")}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            {errors.date && <p className="mt-2 text-sm font-medium text-danger" role="alert">{errors.date}</p>}
          </fieldset>

          {/* 3. Time */}
          <fieldset>
            <legend className="mb-4 flex items-center gap-3 font-display text-2xl font-medium">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-sans text-sm font-semibold text-gold">3</span>
              Qual período?
            </legend>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {([
                ["Manhã", Sun],
                ["Tarde", Sunset],
                ["Horário específico", Clock],
              ] as [Period, React.ElementType][]).map(([p, Icon]) => {
                const active = p === period;
                return (
                  <label
                    key={p}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border px-2 py-4 text-center text-sm font-semibold transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-gold",
                    )}
                  >
                    <input type="radio" name="period" value={p} checked={active} onChange={() => setPeriod(p)} className="sr-only" />
                    <Icon className={cn("h-5 w-5", active ? "text-gold" : "text-muted-foreground")} />
                    <span className="leading-tight">{p === "Horário específico" ? "Horário exato" : p}</span>
                  </label>
                );
              })}
            </div>
            {period === "Horário específico" && (
              <div className="mt-4 max-w-xs">
                <label htmlFor="time-select" className="mb-1.5 block text-sm font-semibold">Horário de preferência</label>
                <select
                  id="time-select"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={cn(inputCls, "h-12")}
                  aria-invalid={errors.time ? true : undefined}
                >
                  <option value="">Selecione…</option>
                  {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.time && <p className="mt-1.5 text-xs font-medium text-danger">{errors.time}</p>}
                <p className="mt-1.5 text-xs text-muted-foreground">Sujeito à disponibilidade — a loja confirma.</p>
              </div>
            )}
          </fieldset>
        </div>

        {/* 4. Contact + summary */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <p className="flex items-center gap-3 font-display text-2xl font-medium">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-sans text-sm font-semibold text-gold">4</span>
              Seus dados
            </p>
            <div className="mb-5 mt-4 rounded-2xl bg-accent p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold"><CalendarCheck className="h-4 w-4 text-gold" /> {svc.title}</p>
              <p className="mt-1 text-muted-foreground">{date ? whenLabel.charAt(0).toUpperCase() + whenLabel.slice(1) : "Escolha um dia no passo 2"}</p>
              {fullAddress(store) && <p className="mt-1 text-xs text-muted-foreground">{fullAddress(store)}</p>}
            </div>
            <ContactFields values={values} onChange={setValues} errors={errors} messagePlaceholder="Ex.: Uso óculos multifocal há 3 anos. Prefiro depois das 16h." />
            <Honeypot value={hp} onChange={setHp} />
            <div className="mt-5 space-y-3">
              <FormError message={lead.isError ? friendlyError(lead.error) : null} />
              <Button type="submit" size="lg" className="h-14 w-full rounded-full text-[15px]" disabled={lead.isPending}>
                {lead.isPending ? <Loader2 className="animate-spin" /> : <CalendarCheck />}
                {lead.isPending ? "Enviando…" : "Solicitar agendamento"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {hours.length ? `Horário da loja: ${hours.join(" · ")}` : "Consulte horários pelo WhatsApp"}
              </p>
            </div>
          </div>
        </div>
      </form>
    </Container>
  );
}
