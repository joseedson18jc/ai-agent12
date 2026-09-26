import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Container, Em, ErrorBlock, SlideOver, WhatsAppButton } from "../components/kit";
import { ProductCard, ProductCardSkeleton, ProductGrid } from "../components/ProductCard";
import { useCategories, useProducts } from "../lib/api";
import { useDebounced } from "../lib/hooks";
import { useSeo } from "../lib/seo";
import { CATEGORY_COPY, sortCategories } from "../lib/store";

const PAGE_SIZE = 24;

const SORTS = [
  { value: "newest", label: "Novidades" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "name", label: "Nome (A–Z)" },
];

const num = (v: string | null) => (v != null && v !== "" && !isNaN(Number(v)) ? Number(v) : undefined);

function PriceRange({
  min,
  max,
  value,
  onCommit,
}: {
  min: number;
  max: number;
  value: [number, number];
  onCommit: (v: [number, number]) => void;
}) {
  const [local, setLocal] = useState<[number, number]>(value);
  useEffect(() => setLocal(value), [value[0], value[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = max - min > 500 ? 10 : 5;
  if (max <= min) return null;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="num rounded-lg bg-muted px-2.5 py-1 font-semibold">{formatCurrency(local[0])}</span>
        <span className="text-muted-foreground">até</span>
        <span className="num rounded-lg bg-muted px-2.5 py-1 font-semibold">{formatCurrency(local[1])}</span>
      </div>
      <SliderPrimitive.Root
        className="relative flex h-8 w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        minStepsBetweenThumbs={1}
        value={local}
        onValueChange={(v) => setLocal([v[0], v[1]])}
        onValueCommit={(v) => onCommit([v[0], v[1]])}
      >
        <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Range className="absolute h-full bg-gold" />
        </SliderPrimitive.Track>
        {["Preço mínimo", "Preço máximo"].map((label) => (
          <SliderPrimitive.Thumb
            key={label}
            aria-label={label}
            className="block h-6 w-6 rounded-full border-2 border-primary bg-card shadow-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/40"
          />
        ))}
      </SliderPrimitive.Root>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-border py-5 first:pt-0 last:border-0">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const categoria = params.get("categoria") || "";
  const marca = params.get("marca") || "";
  const ordem = params.get("ordem") || "newest";
  const pagina = Math.max(1, num(params.get("pagina")) || 1);
  const min = num(params.get("min"));
  const max = num(params.get("max"));

  const [term, setTerm] = useState(q);
  const debounced = useDebounced(term.trim(), 350);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const update = (patch: Record<string, string | number | undefined | null>, opts: { keepPage?: boolean } = {}) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") next.delete(k);
      else next.set(k, String(v));
    });
    if (!opts.keepPage) next.delete("pagina");
    setParams(next, { replace: !("pagina" in patch) });
  };

  // URL → input (e.g. search overlay navigates here with ?q=)
  useEffect(() => setTerm(q), [q]);
  // input → URL (debounced)
  useEffect(() => {
    if (debounced !== q) update({ q: debounced });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: cats } = useCategories();
  const categories = sortCategories(cats || []);
  const currentCat = categories.find((c) => c.id === categoria);

  const query = useProducts({
    search: q || undefined,
    categoryId: categoria || undefined,
    brand: marca || undefined,
    minPrice: min,
    maxPrice: max,
    sort: ordem,
    page: pagina,
    limit: PAGE_SIZE,
  });
  const { data, isLoading, isError, refetch, isFetching } = query;
  const total = data?.pagination.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const facets = data?.facets;
  const brands = facets?.brands ?? [];
  const priceMin = Math.floor(facets?.minPrice ?? 0);
  const priceMax = Math.ceil(facets?.maxPrice ?? 0);
  const activeCount = [marca, min != null || max != null ? "p" : "", categoria].filter(Boolean).length;

  const title = q ? `Resultados para “${q}”` : currentCat ? CATEGORY_COPY[currentCat.type]?.label ?? currentCat.name : "Toda a coleção";
  useSeo({
    title: currentCat ? CATEGORY_COPY[currentCat.type]?.label ?? currentCat.name : q ? `Busca: ${q}` : "Loja",
    description: currentCat
      ? `${CATEGORY_COPY[currentCat.type]?.label}: ${CATEGORY_COPY[currentCat.type]?.blurb}. Reserve online e experimente na loja.`
      : "Óculos de grau, óculos de sol, lentes e acessórios. Reserve online sem pagar nada e experimente na loja.",
  });

  const goPage = (p: number) => {
    update({ pagina: p > 1 ? p : undefined }, { keepPage: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearAll = () => {
    setTerm("");
    setParams(new URLSearchParams(ordem !== "newest" ? { ordem } : {}), { replace: true });
  };

  const filters = (
    <div>
      <FilterGroup title="Categoria">
        <div className="flex flex-col gap-1">
          {[{ id: "", label: "Todas" }, ...categories.filter((c) => c.productCount > 0 || c.id === categoria).map((c) => ({ id: c.id, label: CATEGORY_COPY[c.type]?.label ?? c.name, count: c.productCount }))].map(
            (c) => {
              const active = categoria === c.id;
              return (
                <button
                  key={c.id || "all"}
                  type="button"
                  onClick={() => update({ categoria: c.id })}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    active ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-accent",
                  )}
                >
                  {c.label}
                  {"count" in c && <span className={cn("num text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>{c.count}</span>}
                </button>
              );
            },
          )}
        </div>
      </FilterGroup>
      {brands.length > 0 && (
        <FilterGroup title="Marca">
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => {
              const active = marca.toLowerCase() === b.toLowerCase();
              return (
                <button
                  key={b}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ marca: active ? undefined : b })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-gold",
                  )}
                >
                  {active && <Check className="h-3.5 w-3.5" />}
                  {b}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}
      {priceMax > priceMin && (
        <FilterGroup title="Faixa de preço">
          <PriceRange
            min={priceMin}
            max={priceMax}
            value={[min ?? priceMin, max ?? priceMax]}
            onCommit={([a, b]) => update({ min: a > priceMin ? a : undefined, max: b < priceMax ? b : undefined })}
          />
        </FilterGroup>
      )}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <section className="border-b border-border bg-card/50">
        <Container className="pb-6 pt-8 sm:pb-8 sm:pt-12">
          <nav aria-label="Trilha" className="mb-4 text-xs text-muted-foreground">
            <ol className="flex items-center gap-1.5">
              <li><Link to="/" className="hover:text-foreground hover:underline">Início</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link to="/loja" className="hover:text-foreground hover:underline">Loja</Link></li>
              {currentCat && (
                <>
                  <li aria-hidden="true">/</li>
                  <li aria-current="page" className="text-foreground">{CATEGORY_COPY[currentCat.type]?.label ?? currentCat.name}</li>
                </>
              )}
            </ol>
          </nav>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-[2.1rem] font-medium leading-tight text-primary sm:text-5xl">
                {q ? title : currentCat ? <>{title.split(" ").slice(0, -1).join(" ")} <Em>{title.split(" ").slice(-1)}</Em></> : <>Toda a <Em>coleção</Em></>}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {currentCat ? CATEGORY_COPY[currentCat.type]?.blurb + "." : "Reserve online, experimente na loja e pague só se amar."}
              </p>
            </div>
          </div>

          {/* Category chips */}
          <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-2">
              {[{ id: "", label: "Tudo" }, ...categories.filter((c) => c.productCount > 0 || c.id === categoria).map((c) => ({ id: c.id, label: CATEGORY_COPY[c.type]?.label ?? c.name }))].map((c) => {
                const active = categoria === c.id;
                return (
                  <button
                    key={c.id || "all"}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ categoria: c.id })}
                    className={cn(
                      "h-10 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-gold hover:bg-gold-soft",
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <Container className="pt-6 sm:pt-8">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="catalog-search" className="sr-only">Buscar na loja</label>
            <input
              id="catalog-search"
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar marca, modelo ou cor"
              className="h-12 w-full rounded-full border border-input bg-card pl-11 pr-10 text-[16px] shadow-xs placeholder:text-muted-foreground/70 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
            />
            {term && (
              <button onClick={() => setTerm("")} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full hover:bg-muted" aria-label="Limpar busca">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-input bg-card px-5 text-sm font-semibold sm:flex-none lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filtros
            {activeCount > 0 && <span className="num flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] text-gold-foreground">{activeCount}</span>}
          </button>
          <label className="relative flex-1 sm:flex-none">
            <span className="sr-only">Ordenar por</span>
            <select
              value={ordem}
              onChange={(e) => update({ ordem: e.target.value === "newest" ? undefined : e.target.value })}
              className="h-12 w-full appearance-none rounded-full border border-input bg-card pl-5 pr-10 text-sm font-semibold focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 sm:w-auto"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted-foreground" />
          </label>
        </div>

        {/* Active filters */}
        <div className="mt-4 flex min-h-[28px] flex-wrap items-center gap-2 text-sm" aria-live="polite">
          <span className="num text-muted-foreground">
            {isLoading ? "Carregando…" : `${total} ${total === 1 ? "produto" : "produtos"}`}
          </span>
          {marca && (
            <button onClick={() => update({ marca: undefined })} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold hover:bg-gold-soft">
              {marca} <X className="h-3 w-3" aria-label="remover" />
            </button>
          )}
          {(min != null || max != null) && (
            <button onClick={() => update({ min: undefined, max: undefined })} className="num inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold hover:bg-gold-soft">
              {formatCurrency(min ?? priceMin)} – {formatCurrency(max ?? priceMax)} <X className="h-3 w-3" aria-label="remover" />
            </button>
          )}
          {(activeCount > 0 || q) && (
            <button onClick={clearAll} className="text-xs font-semibold text-primary underline underline-offset-4">Limpar tudo</button>
          )}
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[250px_1fr]">
          <aside className="hidden lg:block" aria-label="Filtros">
            <div className="sticky top-28">{filters}</div>
          </aside>

          <div className={cn("min-w-0 transition-opacity", isFetching && !isLoading && "opacity-60")}>
            {isError ? (
              <ErrorBlock onRetry={() => refetch()} />
            ) : isLoading ? (
              <ProductGrid className="lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </ProductGrid>
            ) : data && data.data.length === 0 ? (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
                <p className="font-display text-2xl font-medium sm:text-3xl">Não achou? <Em>Chame a gente</Em></p>
                <p className="mt-2 max-w-md text-muted-foreground">Temos mais modelos na loja do que no site. Conte o que procura e a gente te mostra as opções.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <WhatsAppButton message={`Olá! Procurei no site${q ? ` por "${q}"` : ""}${marca ? ` da marca ${marca}` : ""} e não encontrei. Vocês têm opções na loja?`} size="default">
                    Perguntar no WhatsApp
                  </WhatsAppButton>
                  <Button variant="outline" className="h-11 rounded-full px-5" onClick={clearAll}>Limpar filtros</Button>
                </div>
              </div>
            ) : (
              <>
                <ProductGrid className="lg:grid-cols-3 xl:grid-cols-4">
                  {data?.data.map((p, i) => <ProductCard key={p.id} product={p} index={i} priority={i < 4} />)}
                </ProductGrid>
                {pages > 1 && (
                  <nav aria-label="Paginação" className="mt-12 flex items-center justify-center gap-2">
                    <button
                      onClick={() => goPage(pagina - 1)}
                      disabled={pagina <= 1}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card disabled:opacity-40"
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: pages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === pages || Math.abs(p - pagina) <= 1)
                      .map((p, i, arr) => (
                        <span key={p} className="flex items-center gap-2">
                          {i > 0 && arr[i - 1] !== p - 1 && <span className="text-muted-foreground">…</span>}
                          <button
                            onClick={() => goPage(p)}
                            aria-current={p === pagina ? "page" : undefined}
                            className={cn(
                              "num h-11 min-w-11 rounded-full px-3 text-sm font-semibold",
                              p === pagina ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:border-gold",
                            )}
                          >
                            {p}
                          </button>
                        </span>
                      ))}
                    <button
                      onClick={() => goPage(pagina + 1)}
                      disabled={pagina >= pages}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card disabled:opacity-40"
                      aria-label="Próxima página"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </nav>
                )}
                <div className="mt-14 flex flex-col items-center gap-3 rounded-3xl bg-accent/70 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
                  <p className="font-display text-xl">Não achou o que procura? <span className="text-muted-foreground">Temos mais modelos na loja.</span></p>
                  <WhatsAppButton message="Olá! Estou vendo a loja online e queria ver mais opções de modelos." size="default">
                    Chamar no WhatsApp
                  </WhatsAppButton>
                </div>
              </>
            )}
          </div>
        </div>
      </Container>

      <SlideOver
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        side="bottom"
        title="Filtros"
        description={`${total} ${total === 1 ? "produto encontrado" : "produtos encontrados"}`}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" className="h-12 flex-1 rounded-full" onClick={clearAll}>Limpar</Button>
            <Button className="h-12 flex-[2] rounded-full" onClick={() => setFiltersOpen(false)}>
              Ver {total} {total === 1 ? "produto" : "produtos"}
            </Button>
          </div>
        }
      >
        <div className="px-5 py-5">{filters}</div>
      </SlideOver>
    </div>
  );
}

