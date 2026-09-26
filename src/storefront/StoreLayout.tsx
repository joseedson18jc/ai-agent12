import { useEffect } from "react";
import { Outlet, useLocation, matchPath } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { BagProvider } from "./context/BagContext";
import { AnnouncementBar, Footer, Header, WhatsAppFab } from "./components/Chrome";
import { BagDrawer } from "./components/BagDrawer";
import { useStoreInfo } from "./lib/api";
import { useJsonLd } from "./lib/seo";
import { BRAND, PAYMENT_METHODS, hoursLines, instagramLink, siteUrl } from "./lib/store";

const ITALIC_FONT_ID = "storefront-fraunces-italic";

/** Fraunces italic is only used by the storefront's editorial headlines. */
function useItalicDisplayFont() {
  useEffect(() => {
    if (document.getElementById(ITALIC_FONT_ID)) return;
    const link = document.createElement("link");
    link.id = ITALIC_FONT_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,400;1,9..144,500;1,9..144,600&display=swap";
    document.head.appendChild(link);
  }, []);
}

/** The storefront is always light, even if a staff member left the CRM in dark mode. */
function useForceLight() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
    };
  }, []);
}

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      let tries = 0;
      const find = () => {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        else if (tries++ < 20) setTimeout(find, 100);
      };
      find();
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

function StoreJsonLd() {
  const { data: store } = useStoreInfo();
  const hours = hoursLines(store);
  const ig = instagramLink(store);
  useJsonLd(
    "store",
    store
      ? {
          "@context": "https://schema.org",
          "@type": "Optician",
          name: store.name || BRAND,
          url: siteUrl("/"),
          ...(store.logo && /^https?:/.test(store.logo) ? { logo: store.logo, image: store.logo } : {}),
          ...(store.phone ? { telephone: `+55${store.phone.replace(/\D/g, "")}` } : {}),
          ...(store.email ? { email: store.email } : {}),
          ...(store.address
            ? {
                address: {
                  "@type": "PostalAddress",
                  streetAddress: store.address,
                  addressLocality: store.city || undefined,
                  addressRegion: store.state || undefined,
                  postalCode: store.zipCode || undefined,
                  addressCountry: "BR",
                },
              }
            : {}),
          ...(hours.length ? { openingHours: hours } : {}),
          ...(ig ? { sameAs: [ig] } : {}),
          paymentAccepted: PAYMENT_METHODS.join(", "),
          currenciesAccepted: "BRL",
        }
      : null,
  );
  return null;
}

export default function StoreLayout() {
  useItalicDisplayFont();
  useForceLight();
  const { pathname } = useLocation();
  // The product page has its own sticky "Reservar" bar on phones.
  const onProduct = !!matchPath("/loja/:id", pathname);

  return (
    <MotionConfig reducedMotion="user">
      <BagProvider>
        <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
          <a
            href="#conteudo"
            className="sr-only z-[60] rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Pular para o conteúdo
          </a>
          <AnnouncementBar />
          <Header />
          <main id="conteudo" className="flex-1" tabIndex={-1}>
            <Outlet />
          </main>
          <Footer />
          <WhatsAppFab hidden={onProduct} />
          <BagDrawer />
          <ScrollManager />
          <StoreJsonLd />
        </div>
      </BagProvider>
    </MotionConfig>
  );
}
