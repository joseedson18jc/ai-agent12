import { useId, useState, type ReactNode } from "react";
import { Loader2, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { maskPhone } from "@/utils/masks";
import { Button } from "@/components/ui/button";
import { friendlyError, useCreateLead } from "../lib/api";
import { Honeypot } from "./kit";

export interface ContactValues {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export const emptyContact: ContactValues = { name: "", phone: "", email: "", message: "" };

export function validateContact(v: ContactValues, opts: { messageRequired?: boolean } = {}) {
  const errors: Partial<Record<keyof ContactValues, string>> = {};
  if (v.name.trim().length < 2) errors.name = "Conte pra gente seu nome.";
  const d = v.phone.replace(/\D/g, "");
  if (d.length < 10 || d.length > 11) errors.phone = "Informe o WhatsApp com DDD, ex.: (11) 98765-4321.";
  if (v.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) errors.email = "Esse e-mail parece incompleto.";
  if (opts.messageRequired && v.message.trim().length < 3) errors.message = "Escreva sua mensagem.";
  return errors;
}

const inputCls =
  "block w-full rounded-xl border border-input bg-card px-4 text-[16px] text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/70 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20 sm:text-[15px]";

export function Field({
  label,
  hint,
  error,
  optional,
  children,
  id,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-foreground">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted-foreground">opcional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function ContactFields({
  values,
  onChange,
  errors,
  messageLabel = "Observação",
  messagePlaceholder = "Algo que a gente deva saber?",
  messageOptional = true,
  showMessage = true,
}: {
  values: ContactValues;
  onChange: (v: ContactValues) => void;
  errors: Partial<Record<keyof ContactValues, string>>;
  messageLabel?: string;
  messagePlaceholder?: string;
  messageOptional?: boolean;
  showMessage?: boolean;
}) {
  const id = useId();
  const set = (k: keyof ContactValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...values, [k]: k === "phone" ? maskPhone(e.target.value) : e.target.value });
  const aria = (k: keyof ContactValues) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `${id}-${k}-err` : undefined,
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field id={`${id}-name`} label="Nome" error={errors.name}>
          <input id={`${id}-name`} className={cn(inputCls, "h-12")} autoComplete="name" value={values.name} onChange={set("name")} placeholder="Como podemos te chamar?" {...aria("name")} />
        </Field>
      </div>
      <Field id={`${id}-phone`} label="WhatsApp" error={errors.phone} hint="Com DDD. É por lá que a gente confirma.">
        <input
          id={`${id}-phone`}
          className={cn(inputCls, "h-12")}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={values.phone}
          onChange={set("phone")}
          placeholder="(11) 98765-4321"
          {...aria("phone")}
        />
      </Field>
      <Field id={`${id}-email`} label="E-mail" optional error={errors.email}>
        <input id={`${id}-email`} className={cn(inputCls, "h-12")} type="email" inputMode="email" autoComplete="email" value={values.email} onChange={set("email")} placeholder="voce@email.com" {...aria("email")} />
      </Field>
      {showMessage && (
        <div className="sm:col-span-2">
          <Field id={`${id}-message`} label={messageLabel} optional={messageOptional} error={errors.message}>
            <textarea
              id={`${id}-message`}
              className={cn(inputCls, "min-h-[96px] resize-y py-3")}
              value={values.message}
              onChange={set("message")}
              placeholder={messagePlaceholder}
              maxLength={1500}
              {...aria("message")}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export { inputCls };

/** "Fale conosco" — sends a CONTACT lead to the CRM inbox. */
export function ContactForm({ className, dark }: { className?: string; dark?: boolean }) {
  const [values, setValues] = useState<ContactValues>(emptyContact);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactValues, string>>>({});
  const [hp, setHp] = useState("");
  const lead = useCreateLead();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateContact(values, { messageRequired: true });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    lead.mutate({
      type: "CONTACT",
      name: values.name.trim(),
      phone: values.phone,
      email: values.email.trim() || undefined,
      message: values.message.trim(),
      website: hp,
    });
  };

  if (lead.isSuccess) {
    return (
      <div className={cn("rounded-3xl border border-border bg-card p-6 sm:p-8", className)} role="status">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="mt-3 font-display text-2xl font-medium">Mensagem recebida!</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Obrigado, {values.name.split(" ")[0]}. Nossa equipe responde pelo WhatsApp {values.phone} assim que possível.
        </p>
        <Button
          variant="outline"
          className="mt-5 rounded-full"
          onClick={() => {
            lead.reset();
            setValues(emptyContact);
          }}
        >
          Enviar outra mensagem
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={cn("relative rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8", dark && "shadow-xl", className)}>
      <p className="font-display text-2xl font-medium">Fale conosco</p>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">Dúvida sobre um modelo, lente ou receita? Mande aqui que a gente responde.</p>
      <ContactFields
        values={values}
        onChange={setValues}
        errors={errors}
        messageLabel="Mensagem"
        messageOptional={false}
        messagePlaceholder="Ex.: Vocês têm armação redonda dourada? Minha receita é multifocal."
      />
      <Honeypot value={hp} onChange={setHp} />
      <div className="mt-5 space-y-3">
        <FormError message={lead.isError ? friendlyError(lead.error) : null} />
        <Button type="submit" size="lg" className="h-12 w-full rounded-full sm:w-auto" disabled={lead.isPending}>
          {lead.isPending ? <Loader2 className="animate-spin" /> : <Send />}
          {lead.isPending ? "Enviando…" : "Enviar mensagem"}
        </Button>
      </div>
    </form>
  );
}
