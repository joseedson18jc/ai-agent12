import api from "./api";
import type { ApiEnvelope } from "./financial.service";

/* Laboratórios — verified against backend /laboratories and /lens-orders. */

export interface LaboratoryItem {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  contactName?: string | null;
  terms?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type LaboratoryPayload = {
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  contactName?: string;
  terms?: string;
  notes?: string;
};

export type LensOrderStatusCode = "ORDERED" | "IN_PRODUCTION" | "READY" | "RECEIVED" | "CANCELLED";

export interface LensOrderItem {
  id: string;
  laboratoryId: string;
  salesOrderId: string;
  status: LensOrderStatusCode;
  orderDate: string;
  expectedDelivery?: string | null;
  receivedDate?: string | null;
  cost: number;
  lensType?: string | null;
  salesOrder?: { id: string; orderNumber: number; customer?: { id: string; name: string } | null } | null;
  laboratory?: { id: string; name: string } | null;
}

export const laboratoryService = {
  list(params: { search?: string; page?: number; limit?: number } = {}): Promise<ApiEnvelope<LaboratoryItem[]>> {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    return api.get(`/laboratories?${q.toString()}`);
  },
  create(data: LaboratoryPayload): Promise<ApiEnvelope<LaboratoryItem>> {
    return api.post("/laboratories", data);
  },
  update(id: string, data: Partial<LaboratoryPayload>): Promise<ApiEnvelope<LaboratoryItem>> {
    return api.put(`/laboratories/${id}`, data);
  },
  remove(id: string): Promise<ApiEnvelope<{ message: string }>> {
    return api.delete(`/laboratories/${id}`);
  },
  listLensOrders(params: { laboratoryId?: string; status?: string; limit?: number } = {}): Promise<ApiEnvelope<LensOrderItem[]>> {
    const q = new URLSearchParams();
    if (params.laboratoryId) q.set("laboratoryId", params.laboratoryId);
    if (params.status) q.set("status", params.status);
    if (params.limit) q.set("limit", String(params.limit));
    return api.get(`/lens-orders?${q.toString()}`);
  },
};

export default laboratoryService;
