import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, Search, ShoppingBag, MapPin, Clock, Phone, Mail, Instagram, CalendarCheck, ArrowUpRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/imperio";
import { useBag } from "../context/BagContext";
import { useCategories, useStoreInfo } from "../lib/api";
import { useScrolled } from "../lib/hooks";
import {
  BRAND,
  NAV_ENTRIES,
  PAYMENT_METHODS,
  categoryHref,
  displayPhone,
  fullAddress,
  hoursLines,
  instagramHandle,
  instagramLink,
  mapsLink,
  pickCategory,
  telLink,
  whatsappLink,
  whatsappNumber,
} from "../lib/store";
import { Container, SlideOver, WhatsAppIcon } from "./kit";
import { SearchOverlay } from "./SearchOverlay";

function useNavLinks() {
  const { data: cats } = useCategories();
  return NAV_ENTRIES.map((e) => {
    const cat = pickCategory(cats, e.types);
    return { label: e.label, href: categoryHref(cat), id: cat?.id };
  });
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  const { data: store } = useStoreInfo();
  return (
    <Link to="/" className={cn("group flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} aria-label={`${BRAND} — página inicial`}>
      {store?.logo ? (
        <img src={store.logo} alt="" className="h-10 w-10 rounded-xl object-contain" />
      ) : (
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-gold/40", light ? "bg-white/5 text-gold" : "bg-primary text-gold")}>
          <BrandMark className="h-7 w-7" />
        </span>
      )}
      <span className="leading-none">
        <span className={cn("block font-display text-[1.28rem] font-semibold tracking-tight", light ? "text-white" : "text-primary")}>
          Óticas <em className="font-medium italic text-gold">Império</em>
        </span>
        <span className={cn("mt-1 hidden text-[9.5px] font-semibold uppercase tracking-[0.22em] min-[400px]:block", light ? "text-sidebar-foreground/60" : "text-muted-foreground")}>
          Óculos · Lentes · Exame
        </span>
      </span>
    </Link>
  );
}

export function AnnouncementBar() {
  const { data: store } = useStoreInfo();
  const wa = whatsappLink(store, "Olá! Vim pelo site e gostaria de atendimento.");
  return (
    <div className="ink-texture text-sidebar-foreground">
      <Container className="flex h-9 items-center justify-center gap-4 text-[12.5px] sm:justify-between">
        <Link to="/agendar?servico=exame" className="inline-flex items-center gap-2 truncate font-medium hover:text-white">
          <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-gold" />
          <span className="truncate">Exame de vista na loja — <span className="underline decoration-gold/60 underline-offset-4">agende online</span></span>
        </Link>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 font-medium hover:text-white sm:inline-flex">
            <WhatsAppIcon className="h-3.5 w-3.5 text-gold" /> WhatsApp {displayPhone(store?.whatsapp || store?.phone)}
          </a>
        )}
      </Container>
    </div>
  );
}

export function Header() {
  const bag = useBag();
  const links = useNavLinks();
  const scrolled = useScrolled(40);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const activeCat = new URLSearchParams(location.search).get("categoria");
  const { data: store } = useStoreInfo();

  const iconBtn =
    "relative flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-300",
          scrolled ? "border-border/80 bg-background/90 shadow-sm backdrop-blur-md" : "border-transparent bg-background",
        )}
      >
        <Container className="flex h-[68px] items-center gap-2 lg:h-20">
          <button className={cn(iconBtn, "-ml-2 lg:hidden")} onClick={() => setMenuOpen(true)} aria-label="Abrir menu" aria-expanded={menuOpen}>
            <Menu className="h-5 w-5" />
          </button>
          <Logo className="mr-auto lg:mr-10" />

          <nav aria-label="Principal" className="hidden flex-1 items-center gap-1 lg:flex">
            {links.map((l) => {
              const active = location.pathname === "/loja" && !!l.id && activeCat === l.id;
              return (
                <Link
                  key={l.label}
                  to={l.href}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[14.5px] font-medium transition-colors hover:text-primary",
                    active ? "text-primary" : "text-foreground/80",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {l.label}
                  {active && <span className="absolute inset-x-3.5 -bottom-0.5 h-px bg-gold" />}
                </Link>
              );
            })}
            <NavLink
              to="/loja"
              end
              className={({ isActive }) =>
                cn("rounded-full px-3.5 py-2 text-[14.5px] font-medium transition-colors hover:text-primary", isActive && !activeCat && location.search === "" ? "text-primary" : "text-foreground/80")
              }
            >
              Toda a loja
            </NavLink>
          </nav>

          <Link
            to="/agendar"
            className="mr-1 hidden h-11 items-center gap-2 rounded-full border border-primary/15 bg-card px-4 text-sm font-semibold text-primary transition-colors hover:border-gold hover:bg-gold-soft md:inline-flex"
          >
            <CalendarCheck className="h-4 w-4 text-gold" /> Agendar exame
          </Link>
          <button className={iconBtn} onClick={() => setSearchOpen(true)} aria-label="Buscar produtos">
            <Search className="h-5 w-5" />
          </button>
          <button className={cn(iconBtn, "-mr-2 lg:mr-0")} onClick={bag.open} aria-label={`Abrir sacola, ${bag.count} ${bag.count === 1 ? "item" : "itens"}`}>
            <ShoppingBag className="h-5 w-5" />
            {bag.count > 0 && (
              <span key={bag.count} className="num absolute right-1 top-1 flex h-[18px] min-w-[18px] animate-in zoom-in-50 items-center justify-center rounded-full bg-gold px-1 text-[10.5px] font-bold text-gold-foreground ring-2 ring-background duration-300">
                {bag.count}
              </span>
            )}
          </button>
        </Container>
      </header>

      <SlideOver open={menuOpen} onOpenChange={setMenuOpen} side="left" title={<span className="font-display">Menu</span>}>
        <nav aria-label="Menu" className="flex flex-col px-3 py-3">
          {[...links, { label: "Toda a loja", href: "/loja", id: undefined }].map((l) => (
            <Link
              key={l.label}
              to={l.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-3.5 font-display text-xl text-foreground transition-colors hover:bg-accent"
            >
              {l.label} <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          <div className="gold-rule mx-3 my-4" />
          <Link to="/agendar" onClick={() => setMenuOpen(false)} className="mx-1 flex items-center gap-3 rounded-2xl bg-primary px-4 py-4 text-primary-foreground">
            <CalendarCheck className="h-5 w-5 text-gold" />
            <span>
              <span className="block font-semibold">Agendar exame de vista</span>
              <span className="text-xs text-primary-foreground/70">Escolha o dia, a loja confirma</span>
            </span>
          </Link>
          {whatsappNumber(store) && (
            <a
              href={whatsappLink(store, "Olá! Vim pelo site e gostaria de atendimento.")!}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4"
            >
              <WhatsAppIcon className="h-5 w-5 text-success" />
              <span className="font-semibold">Falar no WhatsApp</span>
            </a>
          )}
          <Link to="/sacola" onClick={() => setMenuOpen(false)} className="mx-1 mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span className="font-semibold">Minha sacola {bag.count > 0 && <span className="num text-muted-foreground">({bag.count})</span>}</span>
          </Link>
        </nav>
      </SlideOver>
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

export function Footer() {
  const { data: store } = useStoreInfo();
  const links = useNavLinks();
  const hours = hoursLines(store);
  const addr = fullAddress(store);
  const maps = mapsLink(store);
  const wa = whatsappLink(store, "Olá! Vim pelo site e gostaria de atendimento.");
  const ig = instagramLink(store);
  const tel = telLink(store?.phone);
  const year = new Date().getFullYear();

  return (
    <footer className="ink-texture mt-24 text-sidebar-foreground" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">Informações da loja</h2>
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr_1.2fr] lg:py-20">
        <div>
          <Logo light />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-sidebar-foreground/70">
            Óculos de grau e de sol, lentes oftálmicas e de contato, com atendimento de perto. Reserve online e experimente na loja.
          </p>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-success px-5 text-sm font-semibold text-white transition-colors hover:bg-success/90">
              <WhatsAppIcon className="h-4 w-4" /> Chamar no WhatsApp
            </a>
          )}
        </div>

        <div>
          <p className="eyebrow !text-gold">Loja</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {links.map((l) => (
              <li key={l.label}><Link to={l.href} className="hover:text-white hover:underline underline-offset-4">{l.label}</Link></li>
            ))}
            <li><Link to="/loja" className="hover:text-white hover:underline underline-offset-4">Toda a coleção</Link></li>
            <li><Link to="/agendar" className="hover:text-white hover:underline underline-offset-4">Agendar exame de vista</Link></li>
            <li><Link to="/sacola" className="hover:text-white hover:underline underline-offset-4">Minha sacola</Link></li>
            <li><Link to="/#contato" className="hover:text-white hover:underline underline-offset-4">Fale conosco</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow !text-gold">Visite</p>
          <address className="mt-4 space-y-4 text-sm not-italic">
            {addr && (
              <p className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>
                  {store?.name && <span className="block font-semibold text-white">{store.name}</span>}
                  {addr}
                  {maps && (
                    <a href={maps} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 font-semibold text-gold hover:underline underline-offset-4">
                      Ver no mapa <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </span>
              </p>
            )}
            <div className="flex gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {hours.length ? (
                <ul className="space-y-0.5">{hours.map((h) => <li key={h}>{h}</li>)}</ul>
              ) : (
                <span>Consulte horários pelo WhatsApp</span>
              )}
            </div>
          </address>
        </div>

        <div>
          <p className="eyebrow !text-gold">Contato</p>
          <ul className="mt-4 space-y-3 text-sm">
            {tel && store?.phone && (
              <li><a href={tel} className="flex items-center gap-2.5 hover:text-white"><Phone className="h-4 w-4 text-gold" /> {displayPhone(store.phone)}</a></li>
            )}
            {wa && (
              <li><a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:text-white"><WhatsAppIcon className="h-4 w-4 text-gold" /> WhatsApp {displayPhone(store?.whatsapp || store?.phone)}</a></li>
            )}
            {store?.email && (
              <li><a href={`mailto:${store.email}`} className="flex items-center gap-2.5 break-all hover:text-white"><Mail className="h-4 w-4 shrink-0 text-gold" /> {store.email}</a></li>
            )}
            {ig && (
              <li><a href={ig} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:text-white"><Instagram className="h-4 w-4 text-gold" /> {instagramHandle(store)}</a></li>
            )}
          </ul>
          <p className="eyebrow mt-7 !text-gold">Pagamento na loja</p>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Formas de pagamento aceitas na loja">
            {PAYMENT_METHODS.map((m) => (
              <li key={m} className="rounded-full border border-white/15 px-2.5 py-1 text-[11.5px] font-medium">{m}</li>
            ))}
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-3 py-6 pb-24 text-xs text-sidebar-foreground/55 sm:flex-row sm:items-center sm:justify-between sm:pb-6">
          <p>© {year} {BRAND}. Preços e disponibilidade sujeitos a confirmação na loja.</p>
          <Link to="/login" className="hover:text-sidebar-foreground">Área da equipe</Link>
        </Container>
      </div>
    </footer>
  );
}

export function WhatsAppFab({ hidden }: { hidden?: boolean }) {
  const { data: store } = useStoreInfo();
  const location = useLocation();
  const href = whatsappLink(store, `Olá! Estou no site da ${BRAND} e gostaria de ajuda. (${window.location.origin}${location.pathname})`);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar no WhatsApp"
      className={cn(
        "group fixed right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-success pl-4 pr-4 text-white shadow-xl ring-4 ring-background/60 transition-all hover:bg-success/90 focus-visible:outline-none focus-visible:ring-ring sm:right-6",
        "bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))] sm:bottom-6",
        hidden && "max-lg:pointer-events-none max-lg:translate-y-24 max-lg:opacity-0",
      )}
    >
      <WhatsAppIcon className="h-6 w-6" />
      <span className="hidden pr-1 text-sm font-semibold sm:inline">Fale com a gente</span>
    </a>
  );
}
