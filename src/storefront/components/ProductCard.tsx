import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductArt } from "./ProductArt";
import { useBag } from "../context/BagContext";
import type { Product } from "../lib/types";
import { CATEGORY_COPY } from "../lib/store";

export const SAND_BG: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(120% 85% at 50% 18%, hsl(var(--card)) 0%, hsl(var(--accent)) 58%, hsl(var(--muted)) 100%)",
};

/** Product photo when there is one, otherwise the matching illustration. */
export function ProductVisual({
  product,
  className,
  imgClassName,
  eager,
}: {
  product: Pick<Product, "name" | "photo" | "color" | "material" | "id"> & { category?: Product["category"] };
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const showPhoto = product.photo && !broken;
  return (
    <div className={cn("relative overflow-hidden", className)} style={SAND_BG}>
      {showPhoto ? (
        <img
          src={product.photo!}
          alt={product.name}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setBroken(true)}
          className={cn("h-full w-full object-contain p-4 mix-blend-multiply", imgClassName)}
        />
      ) : (
        <ProductArt
          type={product.category?.type}
          name={product.name}
          color={product.color}
          material={product.material}
          seed={product.id}
          title={product.name}
          className={cn("h-full w-full", imgClassName)}
        />
      )}
    </div>
  );
}

export function AvailabilityTag({ product, className }: { product: Pick<Product, "inStock" | "lowStock">; className?: string }) {
  if (!product.inStock)
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground", className)}>
        Esgotado
      </span>
    );
  if (product.lowStock)
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-semibold text-warning", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" /> Últimas unidades
      </span>
    );
  return null;
}

export function ProductCard({ product, index = 0, priority }: { product: Product; index?: number; priority?: boolean }) {
  const bag = useBag();
  const inBag = bag.has(product.id);
  const typeLabel = CATEGORY_COPY[product.category?.type]?.label ?? product.category?.name;
  const isNew = Date.now() - new Date(product.createdAt).getTime() < 1000 * 60 * 60 * 24 * 30;

  return (
    <article
      className="group relative flex flex-col animate-rise"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <Link
        to={`/loja/${product.id}`}
        className="relative block overflow-hidden rounded-2xl border border-border/70 shadow-sm transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
        aria-label={`${product.name} — ${formatCurrency(product.sellingPrice)}`}
      >
        <ProductVisual
          product={product}
          eager={priority}
          className="aspect-[4/3.4]"
          imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {isNew && product.inStock && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-foreground">
              Novo
            </span>
          )}
          <AvailabilityTag product={product} />
        </div>
      </Link>
      <div className="flex flex-1 items-start justify-between gap-2 px-1 pt-3">
        <div className="min-w-0">
          <p className="eyebrow truncate !text-[10px]">{product.brand || typeLabel}</p>
          <h3 className="mt-0.5 font-sans text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
            <Link to={`/loja/${product.id}`} className="line-clamp-2 hover:text-primary hover:underline decoration-gold/60 underline-offset-4">
              {product.name}
            </Link>
          </h3>
          <p className="num mt-1 font-display text-base font-semibold text-foreground sm:text-lg">{formatCurrency(product.sellingPrice)}</p>
        </div>
        {product.inStock && (
          <button
            type="button"
            onClick={() => bag.add(product)}
            className={cn(
              "mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              inBag
                ? "border-gold bg-gold-soft text-gold-foreground"
                : "border-border bg-card text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground",
            )}
            aria-label={inBag ? `${product.name} já está na sacola — adicionar mais um` : `Reservar ${product.name}`}
            title={inBag ? "Na sacola" : "Reservar para experimentar"}
          >
            {inBag ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
          </button>
        )}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-[4/3.4] rounded-2xl" />
      <Skeleton className="mt-3 h-3 w-16" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-2 h-5 w-20" />
    </div>
  );
}

export function ProductGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10", className)}>
      {children}
    </div>
  );
}
