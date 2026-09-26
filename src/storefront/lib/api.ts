import { useMutation, useQuery, keepPreviousData } from "@tanstack/react-query";
import { api, ApiError } from "@/services/api";
import type {
  LeadPayload,
  LeadResult,
  Product,
  ProductListResponse,
  PublicCategory,
  StoreInfo,
} from "./types";

const BASE = "/public";

export function useStoreInfo() {
  return useQuery({
    queryKey: ["public", "store"],
    queryFn: async () => (await api.get<{ data: StoreInfo | null }>(`${BASE}/store`)).data,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["public", "categories"],
    queryFn: async () => (await api.get<{ data: PublicCategory[] }>(`${BASE}/categories`)).data,
    staleTime: 5 * 60 * 1000,
  });
}

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export function buildQuery(params: Record<string, string | number | undefined | null>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function useProducts(q: ProductQuery, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["public", "products", q],
    queryFn: () =>
      api.get<ProductListResponse>(
        `${BASE}/products${buildQuery({
          search: q.search,
          categoryId: q.categoryId,
          brand: q.brand,
          minPrice: q.minPrice,
          maxPrice: q.maxPrice,
          sort: q.sort,
          page: q.page,
          limit: q.limit,
        })}`,
      ),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["public", "product", id],
    queryFn: async () =>
      (await api.get<{ data: { product: Product; related: Product[] } }>(`${BASE}/products/${id}`)).data,
    enabled: !!id,
    staleTime: 60 * 1000,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });
}

export function useProductsByIds(ids: string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["public", "products-by-ids", key],
    queryFn: async () => (await api.get<{ data: Product[] }>(`${BASE}/products?ids=${key}`)).data,
    enabled: ids.length > 0,
    staleTime: 30 * 1000,
  });
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  phone: "WhatsApp",
  email: "E-mail",
  message: "Mensagem",
  preferredDate: "Data",
  preferredTime: "Horário",
  service: "Serviço",
  items: "Itens",
};

/** Turns "phone: Informe um telefone com DDD; email: E-mail inválido" into friendly copy. */
export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return "Recebemos muitos pedidos deste aparelho. Tente de novo mais tarde ou fale com a gente no WhatsApp.";
    if (err.status >= 500) return "Nosso sistema está instável agora. Tente de novo em instantes ou chame no WhatsApp.";
    return err.message
      .split(";")
      .map((part) => {
        const [field, ...rest] = part.split(":");
        const label = FIELD_LABELS[field.trim().split(".")[0]];
        return label && rest.length ? rest.join(":").trim() : part.trim();
      })
      .filter(Boolean)
      .join(" · ");
  }
  if (err instanceof TypeError) return "Sem conexão com a loja agora. Confira sua internet ou chame no WhatsApp.";
  return "Não foi possível enviar. Tente de novo ou chame no WhatsApp.";
}

export function useCreateLead() {
  return useMutation({
    mutationFn: async (payload: LeadPayload) =>
      (await api.post<{ data: LeadResult }>(`${BASE}/leads`, { ...payload, website: payload.website ?? "" })).data,
  });
}
