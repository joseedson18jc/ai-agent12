import api from "./api";
import type { ApiEnvelope } from "./financial.service";

/* Fornecedores — verified against backend /suppliers (supplierController zod schema). */

export interface SupplierItem {
  id: string;
  name: string;
  cnpj?: string | null;
  contactName?: string | null;
  contactRole?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  category?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  createdAt: string;
  products?: { id: string; name: string }[];
}

/** Strings are optional; send "" to clear a text field. cnpj: null clears it (unique column). */
export type SupplierPayload = Partial<Omit<SupplierItem, "id" | "createdAt" | "products" | "cnpj">> & {
  name: string;
  cnpj?: string | null;
};

export const supplierService = {
  list(params: { search?: string; page?: number; limit?: number } = {}): Promise<ApiEnvelope<SupplierItem[]>> {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    return api.get(`/suppliers?${q.toString()}`);
  },
  getById(id: string): Promise<ApiEnvelope<SupplierItem>> {
    return api.get(`/suppliers/${id}`);
  },
  create(data: SupplierPayload): Promise<ApiEnvelope<SupplierItem>> {
    return api.post("/suppliers", data);
  },
  update(id: string, data: Partial<SupplierPayload>): Promise<ApiEnvelope<SupplierItem>> {
    return api.put(`/suppliers/${id}`, data);
  },
  remove(id: string): Promise<ApiEnvelope<{ message: string }>> {
    return api.delete(`/suppliers/${id}`);
  },
};

export default supplierService;
