import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { SlideOver } from "./kit";
import { ProductVisual } from "./ProductCard";
import { MAX_QTY, useBag, type BagItem } from "../context/BagContext";
import { useProductsByIds } from "../lib/api";

export function QtyStepper({ item, size = "md" }: { item: BagItem; size?: "sm" | "md" }) {
  const bag = useBag();
  const h = size === "sm" ? "h-9" : "h-10";
  return (
    <div className={cn("inline-flex items-center rounded-full border border-border bg-card", h)} role="group" aria-label={`Quantidade de ${item.product.name}`}>
      <button
        type="button"
        className={cn("flex items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-40", h, size === "sm" ? "w-9" : "w-10")}
        onClick={() => bag.setQuantity(item.productId, item.quantity - 1)}
        disabled={item.quantity <= 1}
        aria-label="Diminuir quantidade"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="num w-6 text-center text-sm font-semibold" aria-live="polite">{item.quantity}</span>
      <button
        type="button"
        className={cn("flex items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-40", h, size === "sm" ? "w-9" : "w-10")}
        onClick={() => bag.setQuantity(item.productId, item.quantity + 1)}
        disabled={item.quantity >= MAX_QTY}
        aria-label="Aumentar quantidade"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function BagLine({ item, onNavigate, compact }: { item: BagItem; onNavigate?: () => void; compact?: boolean }) {
  const bag = useBag();
  const p = item.product;
  return (
    <li className="flex gap-3 py-4 sm:gap-4">
      <Link to={`/loja/${p.id}`} onClick={onNavigate} className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ProductVisual product={p} className={cn("rounded-xl border border-border/60", compact ? "h-20 w-24" : "h-24 w-28 sm:h-28 sm:w-36")} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {p.brand && <p className="eyebrow !text-[10px]">{p.brand}</p>}
            <Link to={`/loja/${p.id}`} onClick={onNavigate} className="line-clamp-2 text-sm font-semibold leading-snug hover:underline decoration-gold/60 underline-offset-4">
              {p.name}
            </Link>
            {p.color && <p className="mt-0.5 text-xs text-muted-foreground">{p.color}</p>}
          </div>
          <p className="num shrink-0 font-display text-base font-semibold">{formatCurrency(p.sellingPrice * item.quantity)}</p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <QtyStepper item={item} size="sm" />
          <button
            type="button"
            onClick={() => bag.remove(item.productId)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
            aria-label={`Remover ${p.name} da sacola`}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remover
          </button>
        </div>
      </div>
    </li>
  );
}

/** Refreshes bag prices/availability from the API; returns names removed in this pass. */
export function useBagRevalidation(active: boolean) {
  const bag = useBag();
  const ids = active ? bag.items.map((i) => i.productId) : [];
  const q = useProductsByIds(ids);
  const [removed, setRemoved] = useState<string[]>([]);
  const lastSynced = useRef(0);
  const { sync } = bag;
  useEffect(() => {
    if (!q.data || q.dataUpdatedAt === lastSynced.current) return;
    lastSynced.current = q.dataUpdatedAt;
    const gone = sync(q.data);
    if (gone.length) setRemoved((prev) => Array.from(new Set([...prev, ...gone])));
  }, [q.data, q.dataUpdatedAt, sync]);
  return { removed, dismiss: () => setRemoved([]), isFetching: q.isFetching };
}

export function RemovedNotice({ names, onDismiss }: { names: string[]; onDismiss: () => void }) {
  if (!names.length) return null;
  return (
    <div role="status" className="rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
      <p className="font-semibold">Alguns itens saíram da sua sacola</p>
      <p className="mt-0.5 text-foreground/80">
        {names.join(", ")} {names.length === 1 ? "não está mais disponível" : "não estão mais disponíveis"} online. Chame a gente no WhatsApp — pode haver na loja.
      </p>
      <button onClick={onDismiss} className="mt-1.5 text-xs font-semibold underline underline-offset-4">Entendi</button>
    </div>
  );
}

export function BagDrawer() {
  const bag = useBag();
  const navigate = useNavigate();
  const { removed, dismiss } = useBagRevalidation(bag.isOpen);

  return (
    <SlideOver
      open={bag.isOpen}
      onOpenChange={bag.setOpen}
      title="Sua sacola"
      description={bag.count ? `${bag.count} ${bag.count === 1 ? "item reservado" : "itens reservados"} para experimentar` : "Reserve online, experimente na loja."}
      footer={
        bag.items.length ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="num font-display text-2xl font-semibold">{formatCurrency(bag.subtotal)}</span>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-success" />
              Nada é cobrado agora — você paga ao retirar/experimentar na loja.
            </p>
            <Button
              size="lg"
              className="h-12 w-full rounded-full text-[15px]"
              onClick={() => {
                bag.close();
                navigate("/sacola");
              }}
            >
              Finalizar reserva <ArrowRight />
            </Button>
            <button onClick={bag.close} className="w-full py-1 text-center text-sm font-medium text-muted-foreground hover:text-foreground">
              Continuar escolhendo
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="px-5">
        {removed.length > 0 && (
          <div className="pt-4">
            <RemovedNotice names={removed} onDismiss={dismiss} />
          </div>
        )}
        {bag.items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-soft text-gold-foreground">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <p className="mt-4 font-display text-xl">Sua sacola está vazia</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">Separe os modelos que quer experimentar — a gente deixa tudo pronto na loja.</p>
            <Button
              className="mt-6 h-11 rounded-full px-6"
              onClick={() => {
                bag.close();
                navigate("/loja");
              }}
            >
              Ver coleção
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {bag.items.map((item) => (
              <BagLine key={item.productId} item={item} onNavigate={bag.close} compact />
            ))}
          </ul>
        )}
      </div>
    </SlideOver>
  );
}
