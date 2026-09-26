import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck, ShoppingBag, Store, Copy } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Container, Em, Honeypot, WhatsAppButton } from "../components/kit";
import { ContactFields, FormError, emptyContact, validateContact, type ContactValues } from "../components/forms";
import { BagLine, RemovedNotice, useBagRevalidation } from "../components/BagDrawer";
import { ProductVisual } from "../components/ProductCard";
import { useBag, type BagItem } from "../context/BagContext";
import { friendlyError, useCreateLead, useStoreInfo } from "../lib/api";
import { useSeo } from "../lib/seo";
import { BRAND, fullAddress } from "../lib/store";
import type { LeadResult } from "../lib/types";

interface Confirmation {
  protocol: string;
  name: string;
  items: { name: string; quantity: number; unitPrice: number; product?: BagItem["product"] }[];
  total: number;
}

function Success({ c }: { c: Confirmation }) {
  const { data: store } = useStoreInfo();
  const [copied, setCopied] = useState(false);
  const summary = [
    `Olá! Fiz uma reserva pelo site da ${BRAND}.`,
    `Protocolo: ${c.protocol}`,
    `Nome: ${c.name}`,
    "",
    ...c.items.map((i) => `• ${i.quantity}x ${i.name} — ${formatCurrency(i.unitPrice * i.quantity)}`),
    "",
    `Total estimado: ${formatCurrency(c.total)}`,
    "Quando posso passar para experimentar?",
  ].join("\n");

  return (
    <Container className="py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="animate-rise text-center" role="status">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <p className="eyebrow mt-6 !text-gold">Reserva recebida</p>
          <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">Obrigado, <Em>{c.name.split(" ")[0]}</Em>!</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Vamos separar suas peças e falar com você pelo WhatsApp para combinar a visita. Nada foi cobrado.
          </p>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(c.protocol).then(() => setCopied(true), () => undefined);
            }}
            className="mx-auto mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-gold bg-gold-soft px-5 py-3"
            aria-label={`Protocolo ${c.protocol}. Copiar`}
          >
            <span className="text-left">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-foreground/70">Protocolo</span>
              <span className="num font-mono text-xl font-medium tracking-wider text-gold-foreground">{c.protocol}</span>
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-gold-foreground">
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copiado" : "Copiar"}
            </span>
          </button>
        </div>

        <div className="mt-10 rounded-3xl border border-border bg-card p-5 sm:p-7">
          <h2 className="font-display text-xl font-medium">Resumo da reserva</h2>
          <ul className="mt-4 divide-y divide-border">
            {c.items.map((i) => (
              <li key={i.name} className="flex items-center gap-3 py-3">
                {i.product && <ProductVisual product={i.product} className="h-14 w-16 shrink-0 rounded-lg" />}
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-semibold">{i.name}</span>
                  <span className="num text-muted-foreground">{i.quantity} × {formatCurrency(i.unitPrice)}</span>
                </span>
                <span className="num font-semibold">{formatCurrency(i.unitPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Total estimado</span>
            <span className="num font-display text-2xl font-semibold">{formatCurrency(c.total)}</span>
          </div>
          {fullAddress(store) && (
            <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <Store className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> Retirada em {store?.name ? `${store.name} — ` : ""}{fullAddress(store)}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <WhatsAppButton message={summary} className="sm:flex-1">Enviar confirmação no WhatsApp</WhatsAppButton>
          <Link to="/loja" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border sm:flex-1 border-border bg-card px-6 text-[15px] font-semibold hover:border-gold hover:bg-gold-soft">
            Continuar olhando
          </Link>
        </div>
      </div>
    </Container>
  );
}

export default function Bag() {
  const bag = useBag();
  const { removed, dismiss, isFetching } = useBagRevalidation(true);
  const [values, setValues] = useState<ContactValues>(emptyContact);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactValues, string>>>({});
  const [hp, setHp] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const lead = useCreateLead();

  useSeo({ title: confirmation ? "Reserva confirmada" : "Sacola", description: "Reserve seus óculos online sem pagar nada e experimente na loja." });

  if (confirmation) return <Success c={confirmation} />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateContact(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById("reserva-form")?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    const snapshot = bag.items;
    lead.mutate(
      {
        type: "RESERVATION",
        name: values.name.trim(),
        phone: values.phone,
        email: values.email.trim() || undefined,
        message: values.message.trim() || undefined,
        items: snapshot.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        website: hp,
      },
      {
        onSuccess: (res: LeadResult) => {
          const items =
            res.items?.map((i) => ({ ...i, product: snapshot.find((s) => s.productId === i.productId)?.product })) ??
            snapshot.map((s) => ({ name: s.product.name, quantity: s.quantity, unitPrice: s.product.sellingPrice, product: s.product }));
          setConfirmation({
            protocol: (res.id || "").replace(/-/g, "").slice(0, 8).toUpperCase() || "—",
            name: values.name.trim(),
            items,
            total: res.total ?? bag.subtotal,
          });
          bag.clear();
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
    );
  };

  return (
    <Container className="py-8 sm:py-12">
      <Link to="/loja" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Continuar escolhendo
      </Link>
      <h1 className="mt-4 font-display text-4xl font-medium text-primary sm:text-5xl">
        Sua <Em>sacola</Em>
      </h1>
      <p className="mt-2 text-muted-foreground">Reserve agora, experimente na loja. Nada é cobrado agora — você paga ao retirar/experimentar na loja.</p>

      {removed.length > 0 && (
        <div className="mt-6">
          <RemovedNotice names={removed} onDismiss={dismiss} />
        </div>
      )}

      {bag.items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-soft text-gold-foreground"><ShoppingBag className="h-7 w-7" /></span>
          <p className="mt-4 font-display text-2xl">Sua sacola está vazia</p>
          <p className="mt-1 max-w-sm text-muted-foreground">Escolha os modelos que quer experimentar — a gente deixa tudo separado para você.</p>
          <Link to="/loja" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 font-semibold text-primary-foreground">
            Ver coleção <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          <section aria-labelledby="items-title">
            <div className="flex items-baseline justify-between">
              <h2 id="items-title" className="font-display text-xl font-medium">
                {bag.count} {bag.count === 1 ? "item" : "itens"}
              </h2>
              {isFetching && <span className="text-xs text-muted-foreground">Atualizando preços…</span>}
            </div>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {bag.items.map((item) => (
                <BagLine key={item.productId} item={item} />
              ))}
            </ul>
            <div className="mt-5 flex items-baseline justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="num font-display text-3xl font-semibold">{formatCurrency(bag.subtotal)}</span>
            </div>
            <p className="mt-1 text-right text-xs text-muted-foreground">Valor confirmado pela loja na retirada.</p>
          </section>

          <section aria-labelledby="form-title" className="lg:sticky lg:top-28 lg:self-start">
            <form id="reserva-form" onSubmit={submit} noValidate className="relative rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
              <h2 id="form-title" className="font-display text-2xl font-medium">Reservar para experimentar</h2>
              <p className="mb-5 mt-1 text-sm text-muted-foreground">A gente separa as peças e confirma com você pelo WhatsApp.</p>
              <ContactFields values={values} onChange={setValues} errors={errors} messagePlaceholder="Ex.: Passo na sexta à tarde. Quero ver também em outra cor." />
              <Honeypot value={hp} onChange={setHp} />
              <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-success-soft p-4 text-sm text-success">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p><b className="font-semibold">Nada é cobrado agora</b> — você paga ao retirar/experimentar na loja, com PIX, cartão, dinheiro ou crediário.</p>
              </div>
              <div className="mt-4 space-y-3">
                <FormError message={lead.isError ? friendlyError(lead.error) : null} />
                <Button type="submit" size="lg" className="h-14 w-full rounded-full text-[15px]" disabled={lead.isPending}>
                  {lead.isPending ? <Loader2 className="animate-spin" /> : null}
                  {lead.isPending ? "Enviando reserva…" : `Confirmar reserva · ${formatCurrency(bag.subtotal)}`}
                </Button>
                {lead.isError && (
                  <WhatsAppButton
                    message={`Olá! Quero reservar: ${bag.items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ")}.`}
                    variant="outline"
                    className="w-full"
                    size="default"
                  >
                    Reservar pelo WhatsApp
                  </WhatsAppButton>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
    </Container>
  );
}
