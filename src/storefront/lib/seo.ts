import { useEffect } from "react";
import { BRAND } from "./store";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Sets the document title + description (and their Open Graph twins) for the current page. */
export function useSeo({ title, description }: { title?: string; description?: string }) {
  useEffect(() => {
    const full = title ? `${title} · ${BRAND}` : `${BRAND} · Óculos, lentes e exame de vista`;
    document.title = full;
    setMeta("og:title", full, "property");
    if (description) {
      setMeta("description", description);
      setMeta("og:description", description, "property");
    }
  }, [title, description]);
}

/** Injects a JSON-LD block into <head> while mounted. */
export function useJsonLd(id: string, data: object | null | undefined) {
  const json = data ? JSON.stringify(data) : "";
  useEffect(() => {
    if (!json) return;
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = `ld-${id}`;
    el.text = json;
    document.getElementById(el.id)?.remove();
    document.head.appendChild(el);
    return () => el.remove();
  }, [id, json]);
}
