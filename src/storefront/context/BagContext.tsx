import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "../lib/types";

export const BAG_KEY = "imperio-bag";
export const MAX_QTY = 10;

export interface BagItem {
  productId: string;
  quantity: number;
  /** Snapshot for instant rendering; refreshed from the API on the bag. */
  product: Product;
}

interface BagContextValue {
  items: BagItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (v: boolean) => void;
  add: (product: Product, quantity?: number, opts?: { openDrawer?: boolean }) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  /** Replace snapshots with fresh data and drop products that are gone. Returns removed names. */
  sync: (fresh: Product[]) => string[];
  has: (productId: string) => boolean;
}

const BagContext = createContext<BagContextValue | null>(null);

function load(): BagItem[] {
  try {
    const raw = localStorage.getItem(BAG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is BagItem =>
        i && typeof i.productId === "string" && typeof i.quantity === "number" && i.product && typeof i.product.name === "string",
    );
  } catch {
    return [];
  }
}

export function BagProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BagItem[]>(load);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(BAG_KEY, JSON.stringify(items));
    } catch {
      /* storage full or blocked — the bag still works for this visit */
    }
  }, [items]);

  // Keep several tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === BAG_KEY) setItems(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((product: Product, quantity = 1, opts: { openDrawer?: boolean } = {}) => {
    setItems((prev) => {
      const found = prev.find((i) => i.productId === product.id);
      if (found) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, product, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i,
        );
      }
      return [...prev, { productId: product.id, quantity: Math.min(MAX_QTY, quantity), product }];
    });
    if (opts.openDrawer !== false) setOpen(true);
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const q = Math.max(1, Math.min(MAX_QTY, Math.round(quantity) || 1));
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: q } : i)));
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const sync = useCallback(
    (fresh: Product[]) => {
      const byId = new Map(fresh.map((p) => [p.id, p]));
      const removed = items.filter((i) => !byId.get(i.productId)?.inStock).map((i) => i.product.name);
      setItems((prev) => {
        const next = prev
          .filter((i) => byId.get(i.productId)?.inStock)
          .map((i) => ({ ...i, product: byId.get(i.productId)! }));
        const changed =
          next.length !== prev.length ||
          next.some((n, idx) => JSON.stringify(n.product) !== JSON.stringify(prev[idx]?.product));
        return changed ? next : prev;
      });
      return removed;
    },
    [items],
  );

  const value = useMemo<BagContextValue>(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = Math.round(items.reduce((s, i) => s + i.product.sellingPrice * i.quantity, 0) * 100) / 100;
    return {
      items,
      count,
      subtotal,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      setOpen,
      add,
      setQuantity,
      remove,
      clear,
      sync,
      has: (id: string) => items.some((i) => i.productId === id),
    };
  }, [items, isOpen, add, setQuantity, remove, clear, sync]);

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>;
}

export function useBag() {
  const ctx = useContext(BagContext);
  if (!ctx) throw new Error("useBag must be used inside <BagProvider>");
  return ctx;
}
