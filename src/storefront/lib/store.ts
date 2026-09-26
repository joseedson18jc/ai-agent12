import { formatPhone } from "@/utils/formatters";
import type { CategoryType, PublicCategory, StoreInfo } from "./types";

export const BRAND = "Óticas Império";

export const PAYMENT_METHODS = ["PIX", "Cartão de crédito", "Cartão de débito", "Dinheiro", "Crediário"];

const digits = (v?: string | null) => (v || "").replace(/\D/g, "");

/** WhatsApp number in international format (55 + DDD + número), or null. */
export function whatsappNumber(store?: StoreInfo | null): string | null {
  const d = digits(store?.whatsapp) || digits(store?.phone);
  if (d.length < 10) return null;
  return d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
}

export function whatsappLink(store: StoreInfo | null | undefined, message: string): string | null {
  const n = whatsappNumber(store);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

export function displayPhone(v?: string | null) {
  const d = digits(v);
  return d ? formatPhone(d.length > 11 && d.startsWith("55") ? d.slice(2) : d) : "";
}

export function telLink(v?: string | null) {
  const d = digits(v);
  return d ? `tel:+${d.startsWith("55") && d.length >= 12 ? d : `55${d}`}` : null;
}

export function fullAddress(store?: StoreInfo | null) {
  if (!store) return "";
  const cityState = [store.city, store.state].filter(Boolean).join(" - ");
  return [store.address, cityState, store.zipCode].filter(Boolean).join(", ");
}

export function mapsLink(store?: StoreInfo | null) {
  const addr = fullAddress(store);
  if (!addr) return null;
  const q = [store?.name, addr].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function instagramLink(store?: StoreInfo | null) {
  const raw = store?.instagram?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://instagram.com/${raw.replace(/^@/, "").replace(/^instagram\.com\//i, "")}`;
}

export function instagramHandle(store?: StoreInfo | null) {
  const raw = store?.instagram?.trim();
  if (!raw) return null;
  const m = raw.match(/instagram\.com\/([^/?#]+)/i);
  return `@${(m ? m[1] : raw).replace(/^@/, "")}`;
}

export function hoursLines(store?: StoreInfo | null): string[] {
  return (store?.openingHours || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function siteUrl(path = "") {
  return typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
}

/* ── Categories ───────────────────────────────────────────── */

export const CATEGORY_COPY: Record<CategoryType, { label: string; blurb: string; order: number }> = {
  FRAMES_PRESCRIPTION: { label: "Óculos de grau", blurb: "Armações para montar com as suas lentes", order: 1 },
  SUNGLASSES_READY: { label: "Óculos de sol", blurb: "Proteção UV com estilo, prontos para levar", order: 2 },
  FRAMES_SUN: { label: "Armações solares", blurb: "Solares que aceitam lentes com grau", order: 3 },
  OPHTHALMIC_LENSES: { label: "Lentes de grau", blurb: "Monofocais, multifocais e tratamentos", order: 4 },
  CONTACT_LENSES: { label: "Lentes de contato", blurb: "Caixas das principais marcas", order: 5 },
  ACCESSORIES: { label: "Acessórios", blurb: "Estojos, cordões e limpeza", order: 6 },
};

export const isFrameType = (t?: CategoryType) => t === "FRAMES_PRESCRIPTION" || t === "FRAMES_SUN";
export const isSunType = (t?: CategoryType) => t === "FRAMES_SUN" || t === "SUNGLASSES_READY";

export function sortCategories(cats: PublicCategory[]) {
  return [...cats].sort((a, b) => (CATEGORY_COPY[a.type]?.order ?? 9) - (CATEGORY_COPY[b.type]?.order ?? 9));
}

/** Best category for a nav entry: the one of the given types with most products. */
export function pickCategory(cats: PublicCategory[] | undefined, types: CategoryType[]) {
  const list = (cats || []).filter((c) => types.includes(c.type));
  if (!list.length) return undefined;
  return [...list].sort((a, b) => b.productCount - a.productCount)[0];
}

export const NAV_ENTRIES: { label: string; types: CategoryType[] }[] = [
  { label: "Óculos de grau", types: ["FRAMES_PRESCRIPTION"] },
  { label: "Óculos de sol", types: ["SUNGLASSES_READY", "FRAMES_SUN"] },
  { label: "Lentes de contato", types: ["CONTACT_LENSES"] },
  { label: "Acessórios", types: ["ACCESSORIES"] },
];

export function categoryHref(cat?: PublicCategory) {
  return cat ? `/loja?categoria=${cat.id}` : "/loja";
}

/* ── Services (agendamento) ───────────────────────────────── */

export type ServiceSlug = "exame" | "ajuste" | "lentes-de-contato" | "consultoria";

export const SERVICES: { slug: ServiceSlug; title: string; short: string; description: string; duration: string }[] = [
  {
    slug: "exame",
    title: "Exame de vista",
    short: "Exame de vista",
    description: "Avaliação da sua visão na loja para você sair com a receita certa para os seus óculos.",
    duration: "Com hora marcada",
  },
  {
    slug: "ajuste",
    title: "Ajuste e manutenção de óculos",
    short: "Ajuste/manutenção",
    description: "Óculos escorregando, torto ou apertando? Traga para a gente ajustar e revisar.",
    duration: "Rápido, na hora",
  },
  {
    slug: "lentes-de-contato",
    title: "Adaptação de lentes de contato",
    short: "Lentes de contato",
    description: "Orientação para escolher, colocar, tirar e cuidar das suas lentes de contato.",
    duration: "Com hora marcada",
  },
  {
    slug: "consultoria",
    title: "Consultoria de armação e lentes",
    short: "Consultoria de estilo",
    description: "Ajuda para escolher a armação que valoriza seu rosto e a lente ideal para a sua rotina.",
    duration: "Sem compromisso",
  },
];

export const serviceBySlug = (slug?: string | null) => SERVICES.find((s) => s.slug === slug);
