import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Clock,
  Eye,
  HandHeart,
  MapPin,
  CreditCard,
  Store,
  Wrench,
  Layers,
  Droplets,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { rise } from "@/components/imperio";
import { Container, Em, ErrorBlock, SectionHeading, WhatsAppButton } from "../components/kit";
import { ProductArt } from "../components/ProductArt";
import { ProductCard, ProductCardSkeleton, ProductGrid, ProductVisual, SAND_BG } from "../components/ProductCard";
import { FaceShapeGuide } from "../components/FaceShapeGuide";
import { ContactForm } from "../components/forms";
import { Reveal } from "../components/Reveal";
import { useCategories, useProducts, useStoreInfo } from "../lib/api";
import { useSeo } from "../lib/seo";
import {
  BRAND,
  CATEGORY_COPY,
  PAYMENT_METHODS,
  categoryHref,
  fullAddress,
  hoursLines,
  mapsLink,
  sortCategories,
} from "../lib/store";

const LENS_BRANDS = /zeiss|essilor|hoya|transitions|varilux|kodak|rodenstock|crizal/i;

function Hero() {
  const { data: store } = useStoreInfo();
  const { data: newest } = useProducts({ sort: "newest", limit: 48 });
  const featured =
    newest?.data.find((p) => ["FRAMES_PRESCRIPTION", "SUNGLASSES_READY", "FRAMES_SUN"].includes(p.category.type)) ?? newest?.data[0];

  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--gold-soft)) 0%, transparent 70%)" }}
      />
      <Container className="relative grid items-center gap-10 pb-14 pt-8 sm:pt-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-24 lg:pt-16">
        <div>
          <p {...rise(0)} className={cn(rise(0).className, "eyebrow flex items-center gap-2 !text-gold")}>
            <span className="h-px w-8 bg-gold" aria-hidden="true" />
            {store?.city ? `Ótica em ${store.city}` : "Ótica de confiança"}
          </p>
          <h1
            id="hero-title"
            {...rise(1)}
            className={cn(rise(1).className, "mt-5 font-display text-[2.9rem] font-medium leading-[0.98] tracking-[-0.02em] text-primary sm:text-[4.2rem] lg:text-[5.1rem]")}
          >
            {store?.siteHeadline ? (
              store.siteHeadline
            ) : (
              <>
                Enxergue bem.
                <br />
                <Em>Seja visto</Em> melhor.
              </>
            )}
          </h1>
          <p {...rise(2)} className={cn(rise(2).className, "mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground sm:text-lg")}>
            Armações, óculos de sol e lentes das marcas que você confia — com exame de vista e atendimento de perto.
            Reserve online sem pagar nada e experimente na loja.
          </p>
          <div {...rise(3)} className={cn(rise(3).className, "mt-8 flex flex-col gap-3 sm:flex-row")}>
            <Link
              to="/loja"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl active:scale-[0.98]"
            >
              Ver coleção <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/agendar?servico=exame"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-primary/20 bg-card px-7 text-[15px] font-semibold text-primary transition-all hover:border-gold hover:bg-gold-soft active:scale-[0.98]"
            >
              <CalendarCheck className="h-4 w-4 text-gold" /> Agendar exame de vista
            </Link>
          </div>
          <p {...rise(4)} className={cn(rise(4).className, "mt-5 flex items-center gap-2 text-sm text-muted-foreground")}>
            <ShieldCheck className="h-4 w-4 text-success" /> Reserva sem compromisso · você paga só na loja
          </p>
        </div>

        <div {...rise(3)} className={cn(rise(3).className, "relative mx-auto w-full max-w-[520px]")}>
          <div className="ink-texture relative aspect-[5/5.4] overflow-hidden rounded-b-[2rem] rounded-t-[999px] shadow-2xl ring-1 ring-gold/20 sm:aspect-[5/5.6]">
            <div className="absolute inset-x-10 top-[16%] h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" aria-hidden="true" />
            <ProductArt type="FRAMES_PRESCRIPTION" name="round" line decorative className="absolute inset-x-0 top-[22%] mx-auto w-[92%]" />
            <p className="absolute inset-x-0 bottom-[20%] text-center font-display text-lg italic text-gold/80 sm:text-xl">
              feito para o seu rosto
            </p>
            <div className="absolute inset-x-10 bottom-[14%] h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" aria-hidden="true" />
          </div>
          {featured ? (
            <Link
              to={`/loja/${featured.id}`}
              className="group absolute -bottom-6 left-0 flex w-[78%] max-w-[300px] items-center gap-3 rounded-2xl border border-border bg-card p-2.5 pr-4 shadow-xl transition-transform hover:-translate-y-1 sm:-left-8"
            >
              <ProductVisual product={featured} className="h-16 w-20 shrink-0 rounded-xl" eager />
              <span className="min-w-0">
                <span className="eyebrow block !text-[9.5px] !text-gold">Chegou agora</span>
                <span className="block truncate text-sm font-semibold">{featured.name}</span>
                <span className="num text-sm text-muted-foreground">{formatCurrency(featured.sellingPrice)}</span>
              </span>
              <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </Link>
          ) : null}
          <div className="absolute -right-2 top-10 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-lg sm:block">
            <p className="flex items-center gap-2 text-sm font-semibold"><Eye className="h-4 w-4 text-gold" /> Exame de vista</p>
            <p className="text-xs text-muted-foreground">na loja, com hora marcada</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function TrustStrip() {
  const { data } = useProducts({ limit: 1 });
  const lensBrands = (data?.facets.brands || []).filter((b) => LENS_BRANDS.test(b)).slice(0, 3);
  const items = [
    { icon: HandHeart, title: "Atendimento personalizado", text: "Ajuda de verdade para escolher" },
    {
      icon: Layers,
      title: lensBrands.length ? `Lentes ${lensBrands.join(", ").replace(/, ([^,]*)$/, " e $1")}` : "Lentes de marcas líderes",
      text: "Marcas que você conhece",
    },
    { icon: Store, title: "Reserve online, retire na loja", text: "Sem pagar nada agora" },
    { icon: CreditCard, title: "PIX, cartão ou crediário", text: "Pagamento na loja" },
  ];
  return (
    <section aria-label="Por que comprar com a gente" className="border-y border-border bg-card/70">
      <Container>
        <ul className="grid grid-cols-2 divide-border lg:grid-cols-4 lg:divide-x">
          {items.map((it) => (
            <li key={it.title} className="flex items-start gap-3 px-1 py-5 sm:px-4 lg:px-6 lg:py-7">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-foreground">
                <it.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold leading-snug sm:text-sm">{it.title}</span>
                <span className="block text-xs text-muted-foreground">{it.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function CategoryTiles() {
  const { data: cats, isLoading, isError, refetch } = useCategories();
  const list = sortCategories(cats || []).filter((c) => c.productCount > 0);
  const featuredLayout = list.length === 5;

  return (
    <section className="py-16 sm:py-24" aria-labelledby="cats-title">
      <Container>
        <SectionHeading
          id="cats-title"
          eyebrow="Coleção"
          title={<>Encontre o seu <Em>próximo par</Em></>}
          description="Do óculos de todo dia às lentes que fazem diferença na sua rotina."
          action={
            <Link to="/loja" className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Ver toda a loja <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        {isError ? (
          <ErrorBlock onRetry={() => refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-6">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-[4/4.2] rounded-3xl lg:col-span-2" />)
              : list.map((c, i) => {
                  const big = featuredLayout && i < 2;
                  return (
                    <Reveal
                      key={c.id}
                      delay={i * 0.05}
                      className={cn(big ? (i === 0 ? "col-span-2 md:col-span-3" : "md:col-span-3") : "lg:col-span-2", !featuredLayout && "lg:col-span-2")}
                    >
                      <Link
                        to={categoryHref(c)}
                        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={SAND_BG}
                      >
                        <div className={cn("relative", big ? (i === 0 ? "aspect-[16/9]" : "aspect-[4/3] md:aspect-[16/9]") : "aspect-[4/3]")}>
                          <ProductArt
                            type={c.type}
                            name={c.type === "SUNGLASSES_READY" ? "aviador" : c.type === "ACCESSORIES" ? "estojo" : c.type === "OPHTHALMIC_LENSES" ? "progressiva" : "rb"}
                            color={c.type === "FRAMES_PRESCRIPTION" ? "havana" : c.type === "SUNGLASSES_READY" ? "dourado/verde g15" : "azul"}
                            material={c.type === "SUNGLASSES_READY" ? "metal" : "acetato"}
                            decorative
                            className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.05]"
                          />
                        </div>
                        <div className="flex items-end justify-between gap-2 p-4 pt-0 sm:p-5 sm:pt-0">
                          <div className="min-w-0">
                            <h3 className={cn("font-display font-medium leading-tight text-primary", big && i === 0 ? "text-2xl sm:text-3xl" : big ? "text-lg sm:text-xl md:text-3xl" : "text-lg sm:text-xl")}>
                              {CATEGORY_COPY[c.type]?.label ?? c.name}
                            </h3>
                            <p className="mt-1 hidden text-sm text-muted-foreground sm:block">{CATEGORY_COPY[c.type]?.blurb}</p>
                            <p className="num mt-1 text-xs font-semibold text-muted-foreground">
                              {c.productCount} {c.productCount === 1 ? "opção" : "opções"}
                            </p>
                          </div>
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </Link>
                    </Reveal>
                  );
                })}
          </div>
        )}
      </Container>
    </section>
  );
}

function NewArrivals() {
  const { data, isLoading, isError, refetch } = useProducts({ sort: "newest", limit: 8 });
  return (
    <section className="pb-16 sm:pb-24" aria-labelledby="new-title">
      <Container>
        <SectionHeading
          id="new-title"
          eyebrow="Novidades"
          title={<>Acabou de <Em>chegar</Em></>}
          action={
            <Link to="/loja?ordem=newest" className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Ver todas as novidades <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        {isError ? (
          <ErrorBlock onRetry={() => refetch()} />
        ) : (
          <ProductGrid>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : data?.data.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </ProductGrid>
        )}
      </Container>
    </section>
  );
}

const HOME_SERVICES = [
  { icon: Eye, title: "Exame de vista", text: "Avaliação na loja para você sair com a receita em dia.", slug: "exame", cta: "Agendar exame" },
  { icon: Layers, title: "Lentes sob medida e multifocais", text: "A lente certa para sua receita, rotina e telas — explicada sem complicação.", slug: "consultoria", cta: "Quero orientação" },
  { icon: Wrench, title: "Ajustes e manutenção", text: "Óculos escorregando ou torto? A gente ajusta e revisa para você.", slug: "ajuste", cta: "Agendar ajuste" },
  { icon: Droplets, title: "Lentes de contato", text: "Adaptação e orientação para usar com conforto e segurança.", slug: "lentes-de-contato", cta: "Agendar adaptação" },
];

function Services() {
  return (
    <section className="ink-texture py-16 text-sidebar-foreground sm:py-24" aria-labelledby="services-title">
      <Container>
        <SectionHeading
          id="services-title"
          dark
          eyebrow="Serviços"
          title={<>Cuidado com a sua visão, <Em>do exame ao ajuste</Em></>}
          description="Agende online em menos de um minuto. A loja confirma o horário pelo WhatsApp."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_SERVICES.map((s, i) => (
            <Reveal key={s.slug} delay={i * 0.06}>
              <Link
                to={`/agendar?servico=${s.slug}`}
                className="group flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-all hover:-translate-y-1 hover:border-gold/40 hover:bg-white/[0.07]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/30">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-6 font-display text-xl font-medium text-white">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-sidebar-foreground/70">{s.text}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold">
                  {s.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Escolha online", text: "Navegue pela coleção e separe na sacola os modelos que quer experimentar." },
    { n: "02", title: "Reserve sem pagar nada", text: "Deixe seu nome e WhatsApp. A gente separa as peças e confirma com você." },
    { n: "03", title: "Experimente e retire na loja", text: "Prove com calma, tire dúvidas e pague só se amar — PIX, cartão ou crediário." },
  ];
  return (
    <section className="py-16 sm:py-24" aria-labelledby="how-title">
      <Container>
        <SectionHeading id="how-title" eyebrow="Como funciona" align="center" title={<>Reserve hoje, <Em>experimente</Em> com calma</>} />
        <ol className="relative grid gap-6 md:grid-cols-3 md:gap-8">
          <div className="absolute left-[16%] right-[16%] top-9 hidden h-px bg-gradient-to-r from-gold/0 via-gold/50 to-gold/0 md:block" aria-hidden="true" />
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <li className="relative flex gap-5 md:flex-col md:items-center md:text-center">
                <span className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border border-gold/40 bg-background font-display text-2xl italic text-gold shadow-sm">
                  {s.n}
                </span>
                <div>
                  <h3 className="font-display text-xl font-medium md:mt-4">{s.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground md:mx-auto md:max-w-xs">{s.text}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
        <div className="mt-10 flex justify-center">
          <Link to="/loja" className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            Começar a escolher <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

function FaceGuideSection() {
  return (
    <section className="border-y border-border bg-card/60 py-16 sm:py-24" aria-labelledby="face-title">
      <Container>
        <SectionHeading
          id="face-title"
          eyebrow="Guia rápido"
          title={<>Qual armação <Em>combina</Em> com você?</>}
          description="Escolha o formato do seu rosto e veja os estilos que costumam valorizar seus traços."
        />
        <FaceShapeGuide />
      </Container>
    </section>
  );
}

function Brands() {
  const { data } = useProducts({ limit: 1 });
  const brands = (data?.facets.brands || []).filter((b) => !/imp[eé]rio/i.test(b));
  if (!brands.length) return null;
  return (
    <section className="py-14 sm:py-20" aria-labelledby="brands-title">
      <Container>
        <h2 id="brands-title" className="eyebrow text-center">Marcas na loja</h2>
        <ul className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-10">
          {brands.map((b) => (
            <li key={b}>
              <Link
                to={`/loja?marca=${encodeURIComponent(b)}`}
                className="font-display text-xl text-primary/55 transition-colors hover:text-primary sm:text-[1.7rem]"
              >
                {b}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

const FAQ = [
  {
    q: "Como funciona a reserva online? Preciso pagar algo?",
    a: "Você escolhe os modelos, deixa seu nome e WhatsApp e a gente separa tudo na loja. Nada é cobrado no site — você só paga se gostar, na hora de retirar.",
  },
  {
    q: "Quanto tempo demoram as lentes de grau?",
    a: "Depende do tipo de lente e da sua receita. Lentes mais simples costumam ficar prontas antes; multifocais e tratamentos especiais são produzidos em laboratório e podem levar mais tempo. Informamos o prazo certinho no seu orçamento.",
  },
  {
    q: "Vocês fazem exame de vista?",
    a: "Sim, na loja e com hora marcada. Agende pelo site escolhendo o dia e o período de sua preferência — a equipe confirma o horário pelo WhatsApp.",
  },
  {
    q: "Posso trazer minha própria receita?",
    a: "Pode, sim. Traga a receita (ou uma foto dela) e a gente ajuda a escolher a armação e a lente ideais para o seu grau.",
  },
  {
    q: "Quais são as formas de pagamento?",
    a: `Na loja aceitamos ${PAYMENT_METHODS.slice(0, -1).join(", ").toLowerCase().replace("pix", "PIX")} e ${PAYMENT_METHODS.at(-1)!.toLowerCase()}. Consulte as condições de parcelamento com a nossa equipe.`,
  },
  {
    q: "Vocês entregam? Como funciona a troca?",
    a: "No momento a retirada é feita na loja — assim você experimenta e a gente confere o ajuste no seu rosto. Para condições de troca, fale com a gente pelo WhatsApp.",
  },
];

function Faq() {
  return (
    <section className="py-16 sm:py-24" aria-labelledby="faq-title">
      <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.3fr] lg:gap-16">
        <div>
          <SectionHeading id="faq-title" eyebrow="Dúvidas" title={<>Perguntas <Em>frequentes</Em></>} className="!mb-6" />
          <p className="text-muted-foreground">Não achou sua resposta? A gente responde rapidinho.</p>
          <WhatsAppButton message="Olá! Tenho uma dúvida sobre" className="mt-6" size="default">
            Perguntar no WhatsApp
          </WhatsAppButton>
        </div>
        <Accordion type="single" collapsible className="border-t border-border">
          {FAQ.map((f, i) => (
            <AccordionItem key={i} value={`q${i}`} className="border-border">
              <AccordionTrigger className="py-5 text-left font-display text-lg font-medium hover:no-underline sm:text-xl [&>svg]:text-gold">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pr-8 text-[15px] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
}

function MapCard({ href }: { href: string | null }) {
  const inner = (
    <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-border" style={SAND_BG}>
      <svg viewBox="0 0 400 250" className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <g stroke="hsl(var(--card))" strokeLinecap="round" fill="none">
          <path d="M -10 70 C 90 60 180 90 410 60" strokeWidth="14" />
          <path d="M -10 190 C 120 170 260 200 410 170" strokeWidth="10" />
          <path d="M 120 -10 C 130 80 110 160 140 260" strokeWidth="12" />
          <path d="M 290 -10 C 280 90 300 170 270 260" strokeWidth="8" />
          <path d="M 0 130 L 400 120" strokeWidth="6" />
        </g>
        <g stroke="hsl(var(--border))" strokeWidth="1" fill="none">
          <path d="M -10 70 C 90 60 180 90 410 60" />
          <path d="M 120 -10 C 130 80 110 160 140 260" />
        </g>
        <circle cx="205" cy="126" r="34" fill="hsl(var(--gold) / 0.15)" />
        <circle cx="205" cy="126" r="18" fill="hsl(var(--gold) / 0.25)" />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[85%]">
        <MapPin className="h-10 w-10 fill-primary text-gold drop-shadow-md" />
      </div>
      {href && (
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-semibold text-primary shadow-md">
          Abrir no Google Maps <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Ver a loja no Google Maps" className="block transition-transform hover:-translate-y-0.5">
      {inner}
    </a>
  ) : (
    inner
  );
}

function Visit() {
  const { data: store } = useStoreInfo();
  const hours = hoursLines(store);
  const addr = fullAddress(store);
  const maps = mapsLink(store);
  return (
    <section id="contato" className="scroll-mt-24 pb-4 pt-16 sm:pt-24" aria-labelledby="visit-title">
      <Container className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <SectionHeading id="visit-title" eyebrow="Visite a loja" title={<>Venha <Em>experimentar</Em></>} className="!mb-6" />
          <MapCard href={maps} />
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            {addr && (
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                <div>
                  <dt className="text-sm font-semibold">{store?.name || BRAND}</dt>
                  <dd className="text-sm text-muted-foreground">{addr}</dd>
                  {maps && (
                    <dd>
                      <a href={maps} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                        Como chegar <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </dd>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div>
                <dt className="text-sm font-semibold">Horário</dt>
                {hours.length ? (
                  hours.map((h) => (
                    <dd key={h} className="text-sm text-muted-foreground">{h}</dd>
                  ))
                ) : (
                  <dd className="text-sm text-muted-foreground">Consulte horários pelo WhatsApp</dd>
                )}
              </div>
            </div>
          </dl>
          <div className="mt-7 flex flex-wrap gap-3">
            <WhatsAppButton message="Olá! Quero visitar a loja. Podem me ajudar?" size="default">Chamar no WhatsApp</WhatsAppButton>
            <Link to="/agendar" className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold hover:border-gold hover:bg-gold-soft">
              <CalendarCheck className="h-4 w-4 text-gold" /> Agendar horário
            </Link>
          </div>
        </div>
        <div className="lg:pt-[92px]">
          <ContactForm />
        </div>
      </Container>
    </section>
  );
}

export default function Home() {
  const { data: store } = useStoreInfo();
  useSeo({
    title: undefined,
    description: `${BRAND}${store?.city ? ` em ${store.city}` : ""}: óculos de grau e de sol, lentes oftálmicas e de contato. Reserve online sem pagar nada, experimente na loja e agende seu exame de vista.`,
  });

  return (
    <>
      <Hero />
      <TrustStrip />
      <CategoryTiles />
      <NewArrivals />
      <Services />
      <HowItWorks />
      <FaceGuideSection />
      <Brands />
      <Faq />
      <Visit />
    </>
  );
}
