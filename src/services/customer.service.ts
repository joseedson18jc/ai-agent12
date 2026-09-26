import api from "./api";
import type { ApiResponse, PaginatedResponse, Customer, CustomerStatus } from "@/types";

/** Última compra resumida (incluída pela listagem do backend). */
export interface CustomerLastOrder {
  id: string;
  date: string;
  total: number;
}

export type CustomerListItem = Customer & { salesOrders?: CustomerLastOrder[] };

export interface CustomerListParams {
  search?: string;
  status?: CustomerStatus | "";
  city?: string;
  /** ISO date — apenas clientes cadastrados a partir desta data */
  createdFrom?: string;
  page?: number;
  limit?: number;
}

export interface CustomerListResult {
  data: CustomerListItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Corpo aceito pelo Zod do backend (customerController.createSchema).
 * `null` limpa o campo na edição; `undefined` o omite.
 */
export interface CustomerPayload {
  name: string;
  phone: string;
  cpf?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  birthDate?: string | null;
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  photo?: string | null;
  notes?: string | null;
  status?: CustomerStatus;
}

interface BackendList<T> {
  success: boolean;
  data: T[];
  pagination?: { page: number; limit: number; total: number };
}

export const customerService = {
  /** Listagem paginada no servidor (total real vem de `pagination.total`). */
  async list(params: CustomerListParams = {}): Promise<CustomerListResult> {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.status) qs.set("status", params.status);
    if (params.city) qs.set("city", params.city);
    if (params.createdFrom) qs.set("createdFrom", params.createdFrom);
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    const res = await api.get<BackendList<CustomerListItem>>(`/customers?${qs.toString()}`);
    return {
      data: res.data ?? [],
      total: res.pagination?.total ?? res.data?.length ?? 0,
      page: res.pagination?.page ?? page,
      limit: res.pagination?.limit ?? limit,
    };
  },

  /** Mantido para chamadores existentes (ex.: busca global). */
  async getAll(
    search?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Customer>> {
    const r = await customerService.list({ search, page, limit });
    return {
      success: true,
      data: r.data,
      total: r.total,
      page: r.page,
      limit: r.limit,
      totalPages: Math.max(1, Math.ceil(r.total / r.limit)),
    };
  },

  async getById(id: string): Promise<ApiResponse<Customer>> {
    return api.get<ApiResponse<Customer>>(`/customers/${id}`);
  },

  async create(data: CustomerPayload | Partial<Customer>): Promise<ApiResponse<Customer>> {
    return api.post<ApiResponse<Customer>>("/customers", data);
  },

  async update(
    id: string,
    data: Partial<CustomerPayload> | Partial<Customer>
  ): Promise<ApiResponse<Customer>> {
    return api.put<ApiResponse<Customer>>(`/customers/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<ApiResponse<void>>(`/customers/${id}`);
  },

  async getBirthdays(): Promise<ApiResponse<Customer[]>> {
    return api.get<ApiResponse<Customer[]>>("/customers/birthdays/month");
  },
};

/** Normaliza telefone BR para o formato do wa.me (55 + DDD + número). */
export function toWhatsAppNumber(phone?: string | null): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (!d) return null;
  d = d.replace(/^0+/, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d.length >= 8 ? d : null;
}

export function whatsAppLink(phone?: string | null, text?: string): string | null {
  const n = toWhatsAppNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export default customerService;
