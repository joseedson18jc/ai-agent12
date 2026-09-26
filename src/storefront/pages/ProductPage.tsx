import { Link, useParams } from "react-router-dom";
import { ArrowRight, CalendarCheck, Check, HelpCircle, ShieldCheck, ShoppingBag, Store, Ruler, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ApiError } from "@/services/api";
import { Container, Em, ErrorBlock, SectionHeading, WhatsAppButton, WhatsAppIcon } from "../components/kit";
import { ProductCard, ProductGrid, ProductVisual } from "../components/ProductCard";
import { useBag } from "../context/BagContext";
import { useProduct, useStoreInfo } from "../lib/api";
import { useJsonLd, useSeo } from "../lib/seo";
import { BRAND, CATEGORY_COPY, isFrameType, isSunType, siteUrl, whatsappLink } from "../lib/store";
import type { Product } from "../lib/types";

function SizeHelp({ size }: { size: string }) {
  const m = size.match(/(\d{2})\s*[-x/□ ]\s*(\d{2})\s*[-x/ ]\s*(\d{3})/);
  return (
    <Popover>
      <PopoverTrigger
        className="ml-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="O que significam esses números?"
      >
        <HelpCircle className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent className="w-80 rounded-2xl p-5" align="start">
        <p className="font-display text-lg font-medium">Como ler o tamanho</p>
        <p className="mt-1 text-xs text-muted-foreground">Medidas em milímetros, gravadas na parte interna da haste.</p>
        <dl className="mt-4 space-y-2.5 text-sm">
          {[
            [m?.[1] ?? "52", "Largura de cada lente (aro)"],
            [m?.[2] ?? "18", "Ponte — distância entre as lentes"],
            [m?.[3] ?? "140", "Comprimento da haste"],
          ].map(([n, label]) => (
            <div key={label} className="flex items-center gap-3">
              <dt className="num flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-gold-soft font-display text-base font-semibold text-gold-foreground">{n}</dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">Dica: compare com um óculos que já veste bem em você.</p>
      </PopoverContent>
    </Popover>
  );
}

function Availability({ product }: { product: Product }) {
  if (!product.inStock)
    return (
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-muted-foreground" /> Esgotado no momento
      </p>
    );
  if (product.lowStock)
    return (
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-warning">
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-60 motion-reduce:animate-none" /><span className="relative h-2 w-2 rounded-full bg-warning" /></span>
        Últimas unidades na loja
      </p>
    );
  return (
    <p className="inline-flex items-center gap-2 text-sm font-semibold text-success">
      <span className="h-2 w-2 rounded-full bg-success" /> Disponível na loja
    </p>
  );
}

function ProductSkeleton() {
  return (
    <Container className="grid gap-8 py-8 lg:grid-cols-2 lg:gap-14 lg:py-12">
      <Skeleton className="aspect-square rounded-3xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-14 w-full rounded-full" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </Container>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error, refetch } = useProduct(id);
  const { data: store } = useStoreInfo();
  const bag = useBag();
  const product = data?.product;
  const typeLabel = product ? CATEGORY_COPY[product.category.type]?.label ?? product.category.name : "";

  useSeo({
    title: product ? `${product.name}${product.brand ? ` · ${product.brand}` : ""}` : isError ? "Produto não encontrado" : "Carregando…",
    description: product
      ? `${product.name}${product.color ? ` na cor ${product.color}` : ""} por ${formatCurrency(product.sellingPrice)}. Reserve online sem pagar nada e experimente na ${BRAND}.`
      : undefined,
  });

  useJsonLd(
    "product",
    product
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          sku: product.id,
          ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
          ...(product.model ? { model: product.model } : {}),
          ...(product.color ? { color: product.color } : {}),
          ...(product.material ? { material: product.material } : {}),
          ...(product.description ? { description: product.description } : {}),
          ...(product.photo && /^https?:/.test(product.photo) ? { image: product.photo } : {}),
          category: product.category.name,
          offers: {
            "@type": "Offer",
            price: product.sellingPrice.toFixed(2),
            priceCurrency: "BRL",
            availability: product.inStock ? "https://schema.org/InStoreOnly" : "https://schema.org/OutOfStock",
            url: siteUrl(`/loja/${product.id}`),
            seller: { "@type": "Optician", name: store?.name || BRAND },
          },
        }
      : null,
  );

  if (isLoading) return <ProductSkeleton />;

  if (isError || !product) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <Container className="py-16">
        {notFound ? (
          <div className="mx-auto max-w-lg text-center">
            <p className="eyebrow !text-gold">Ops</p>
            <h1 className="mt-3 font-display text-4xl font-medium">Esse modelo <Em>saiu da vitrine</Em></h1>
            <p className="mt-3 text-muted-foreground">Ele pode ter sido vendido ou retirado do site. Veja outras opções ou pergunte na loja.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/loja" className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground">Ver coleção <ArrowRight className="h-4 w-4" /></Link>
              <WhatsAppButton message="Olá! Vi um modelo no site que não aparece mais. Ainda tem na loja?" size="lg">Perguntar</WhatsAppButton>
            </div>
          </div>
        ) : (
          <ErrorBlock onRetry={() => refetch()} />
        )}
      </Container>
    );
  }

  const inBag = bag.has(product.id);
  const url = siteUrl(`/loja/${product.id}`);
  const buyMsg = `Olá! Tenho interesse no ${product.name}${product.color ? ` (${product.color})` : ""} — ${formatCurrency(product.sellingPrice)}. ${url}`;
  const notifyMsg = `Olá! O ${product.name} está esgotado no site. Podem me avisar quando chegar? ${url}`;
  const frame = isFrameType(product.category.type);
  const sun = isSunType(product.category.type);

  const specs: [string, React.ReactNode][] = [
    ["Marca", product.brand],
    ["Modelo", product.model],
    ["Cor", product.color],
    ["Tamanho / aro", product.size ? <span className="inline-flex items-center">{product.size}{/\d{2}.*\d{2}.*\d{3}/.test(product.size) && <SizeHelp size={product.size} />}</span> : null],
    ["Material", product.material],
    ["Categoria", typeLabel],
  ].filter(([, v]) => !!v) as [string, React.ReactNode][];

  const reserve = () => bag.add(product);

  return (
    <>
      <Container className="pt-5 sm:pt-8">
        <nav aria-label="Trilha" className="text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-foreground hover:underline">Início</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/loja" className="hover:text-foreground hover:underline">Loja</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to={`/loja?categoria=${product.category.id}`} className="hover:text-foreground hover:underline">{typeLabel}</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="max-w-[16rem] truncate text-foreground">{product.name}</li>
          </ol>
        </nav>
      </Container>

      <Container className="grid gap-8 pb-10 pt-5 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-16 lg:pt-8">
        {/* Gallery */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative animate-rise overflow-hidden rounded-[2rem] border border-border/70 shadow-sm">
            <ProductVisual product={product} eager className="aspect-[5/4] sm:aspect-[5/4.4]" imgClassName="p-6 sm:p-10" />
            <div className="absolute left-4 top-4 rounded-full bg-card/90 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur">{typeLabel}</div>
          </div>
          {!product.photo && (
            <p className="mt-3 text-center text-xs text-muted-foreground">Ilustração do estilo. Veja a peça real na loja ou peça fotos pelo WhatsApp.</p>
          )}
        </div>

        {/* Details */}
        <div className="animate-rise [animation-delay:80ms]">
          {product.brand && <p className="eyebrow !text-gold">{product.brand}{product.model ? ` · ${product.model}` : ""}</p>}
          <h1 className="mt-2 font-display text-[2.1rem] font-medium leading-[1.05] tracking-tight text-primary sm:text-5xl">{product.name}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="num font-display text-3xl font-semibold sm:text-[2.2rem]">{formatCurrency(product.sellingPrice)}</p>
            <Availability product={product} />
          </div>
          {sun && <p className="mt-2 text-sm text-muted-foreground">Óculos de sol pronto para usar.</p>}

          <div className="mt-7 flex flex-col gap-3">
            {product.inStock ? (
              <>
                <button
                  onClick={reserve}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-7 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                  {inBag ? <Check className="h-5 w-5 text-gold" /> : <ShoppingBag className="h-5 w-5" />}
                  {inBag ? "Na sacola — reservar mais um" : "Reservar para experimentar"}
                </button>
                <WhatsAppButton message={buyMsg} variant="outline" className="h-14">Comprar pelo WhatsApp</WhatsAppButton>
              </>
            ) : (
              <WhatsAppButton message={notifyMsg} className="h-14">Esgotado — avise-me no WhatsApp</WhatsAppButton>
            )}
          </div>

          <ul className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 text-sm sm:grid-cols-2">
            <li className="flex items-start gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> <span><b className="font-semibold">Nada é cobrado agora.</b> Você paga só na loja.</span></li>
            <li className="flex items-start gap-2.5"><Store className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> <span>Experimente com calma e retire na loja.</span></li>
          </ul>

          {frame && (
            <Link
              to="/agendar?servico=exame"
              className="group mt-4 flex items-center gap-4 rounded-2xl bg-gold-soft p-4 transition-colors hover:bg-gold/20"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-gold-foreground"><Eye className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gold-foreground">Precisa de lentes de grau?</span>
                <span className="block text-sm text-gold-foreground/80">Agende seu exame de vista na loja.</span>
              </span>
              <ArrowRight className="h-4 w-4 text-gold-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          )}
          {product.category.type === "OPHTHALMIC_LENSES" && (
            <Link to="/agendar?servico=consultoria" className="group mt-4 flex items-center gap-4 rounded-2xl bg-gold-soft p-4 transition-colors hover:bg-gold/20">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-gold-foreground"><CalendarCheck className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1 text-sm text-gold-foreground">
                <span className="block font-semibold">Lentes são feitas a partir da sua receita</span>
                Traga a receita ou agende um exame — o valor final depende do seu grau e da armação.
              </span>
              <ArrowRight className="h-4 w-4 text-gold-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          )}
          {product.category.type === "CONTACT_LENSES" && (
            <Link to="/agendar?servico=lentes-de-contato" className="group mt-4 flex items-center gap-4 rounded-2xl bg-gold-soft p-4 transition-colors hover:bg-gold/20">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-gold-foreground"><CalendarCheck className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1 text-sm text-gold-foreground">
                <span className="block font-semibold">Primeira vez com lentes de contato?</span>
                Agende uma adaptação e aprenda a usar com conforto.
              </span>
              <ArrowRight className="h-4 w-4 text-gold-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          )}

          {product.description && (
            <section className="mt-9" aria-labelledby="desc-title">
              <h2 id="desc-title" className="font-display text-xl font-medium">Sobre o produto</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-muted-foreground">{product.description}</p>
            </section>
          )}

          {specs.length > 0 && (
            <section className="mt-9" aria-labelledby="specs-title">
              <h2 id="specs-title" className="flex items-center gap-2 font-display text-xl font-medium"><Ruler className="h-4 w-4 text-gold" /> Detalhes</h2>
              <dl className="mt-3 divide-y divide-border border-y border-border">
                {specs.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[120px_1fr] items-center gap-4 py-3 text-sm sm:grid-cols-[150px_1fr]">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </Container>

      {data.related.length > 0 && (
        <section className="border-t border-border bg-card/50 py-14 sm:py-20" aria-labelledby="related-title">
          <Container>
            <SectionHeading
              id="related-title"
              eyebrow="Você também pode gostar"
              title={<>Mais em <Em>{typeLabel.toLowerCase()}</Em></>}
              action={
                <Link to={`/loja?categoria=${product.category.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  Ver todos <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            <ProductGrid>
              {data.related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </ProductGrid>
          </Container>
        </section>
      )}

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_hsl(var(--primary)/0.25)] backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{product.name}</p>
            <p className="num font-display text-lg font-semibold leading-tight">{formatCurrency(product.sellingPrice)}</p>
          </div>
          {whatsappLink(store, product.inStock ? buyMsg : notifyMsg) && (
            <a
              href={whatsappLink(store, product.inStock ? buyMsg : notifyMsg)!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-success/40 text-success"
              aria-label={product.inStock ? "Comprar pelo WhatsApp" : "Avise-me no WhatsApp"}
            >
              <WhatsAppIcon className="h-5 w-5" />
            </a>
          )}
          {product.inStock ? (
            <button onClick={reserve} className={cn("inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground active:scale-[0.98]")}>
              <ShoppingBag className="h-4 w-4" /> Reservar
            </button>
          ) : (
            <span className="rounded-full bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">Esgotado</span>
          )}
        </div>
      </div>
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </>
  );
}
