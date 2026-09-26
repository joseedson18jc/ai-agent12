import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { SlideOver, Container } from "./kit";
import { ProductVisual } from "./ProductCard";
import { useCategories, useProducts } from "../lib/api";
import { useDebounced } from "../lib/hooks";
import { CATEGORY_COPY, sortCategories } from "../lib/store";

export function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [term, setTerm] = useState("");
  const q = useDebounced(term.trim(), 250);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: cats } = useCategories();
  const results = useProducts({ search: q, limit: 6 }, { enabled: open && q.length >= 2 });

  useEffect(() => {
    if (!open) setTerm("");
  }, [open]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <SlideOver open={open} onOpenChange={onOpenChange} side="top" title="Buscar na loja" hideHeader className="pb-2">
      <Container className="py-5 sm:py-8">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (term.trim()) go(`/loja?q=${encodeURIComponent(term.trim())}`);
          }}
          className="flex items-center gap-3 border-b-2 border-primary pb-3 pr-12"
        >
          <Search className="h-6 w-6 shrink-0 text-gold" aria-hidden="true" />
          <label htmlFor="store-search" className="sr-only">Buscar produtos</label>
          <input
            id="store-search"
            ref={inputRef}
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Busque por marca, modelo ou cor…"
            className="w-full min-w-0 bg-transparent font-display text-2xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none sm:text-3xl"
            autoComplete="off"
            enterKeyHint="search"
          />
          {results.isFetching && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" aria-label="Buscando" />}
        </form>

        <div className="mt-6" aria-live="polite">
          {q.length < 2 ? (
            <div>
              <p className="eyebrow mb-3">Explore</p>
              <div className="flex flex-wrap gap-2">
                {sortCategories(cats || [])
                  .filter((c) => c.productCount > 0)
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => go(`/loja?categoria=${c.id}`)}
                      className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-gold hover:bg-gold-soft"
                    >
                      {CATEGORY_COPY[c.type]?.label ?? c.name}
                    </button>
                  ))}
                {["Ray-Ban", "Oakley", "Aviador", "Preto", "Dourado"].map((s) => (
                  <button key={s} onClick={() => setTerm(s)} className="rounded-full px-4 py-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : results.data && results.data.data.length === 0 && !results.isFetching ? (
            <p className="text-muted-foreground">
              Nada encontrado para “{q}”. Tente outra palavra — ou{" "}
              <button className="font-semibold text-primary underline underline-offset-4" onClick={() => go("/loja")}>veja toda a coleção</button>.
            </p>
          ) : (
            <>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(results.data?.data || []).map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/loja/${p.id}`}
                      onClick={() => onOpenChange(false)}
                      className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    >
                      <ProductVisual product={p} className="h-16 w-20 shrink-0 rounded-xl" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <p className="num text-sm text-muted-foreground">{formatCurrency(p.sellingPrice)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {!!results.data?.pagination.total && (
                <button
                  onClick={() => go(`/loja?q=${encodeURIComponent(q)}`)}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Ver {results.data.pagination.total} {results.data.pagination.total === 1 ? "resultado" : "resultados"} <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </Container>
    </SlideOver>
  );
}
