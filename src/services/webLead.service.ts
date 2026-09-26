import api from "./api";
import type { ApiEnvelope } from "./financial.service";

/* Pedidos feitos no site público (reservas, agendamentos, mensagens) — /api/web-leads. */

export type WebLeadType = "RESERVATION" | "APPOINTMENT" | "CONTACT";
export type WebLeadStatus = "NEW" | "CONTACTED" | "CONVERTED" | "DISCARDED";

export interface WebLeadItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface WebLead {
  id: string;
  type: WebLeadType;
  status: WebLeadStatus;
  name: string;
  /** Digits only. */
  phone: string;
  email?: string | null;
  message?: string | null;
  /** ISO datetime at local noon. */
  preferredDate?: string | null;
  preferredTime?: string | null;
  service?: string | null;
  items?: WebLeadItem[] | null;
  total?: number | null;
  customerId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebLeadStats {
  byStatus: Record<WebLeadStatus, number>;
  byType: Record<WebLeadType, number>;
  last30: number;
  newCount: number;
}

export interface WebLeadListParams {
  status?: WebLeadStatus;
  type?: WebLeadType;
  search?: string;
  page?: number;
  limit?: number;
}

export const webLeadService = {
  list(p: WebLeadListParams = {}): Promise<ApiEnvelope<WebLead[]>> {
    const params = new URLSearchParams();
    if (p.status) params.set("status", p.status);
    if (p.type) params.set("type", p.type);
    if (p.search?.trim()) params.set("search", p.search.trim());
    if (p.page) params.set("page", String(p.page));
    if (p.limit) params.set("limit", String(p.limit));
    return api.get(`/web-leads?${params.toString()}`);
  },
  stats(): Promise<ApiEnvelope<WebLeadStats>> {
    return api.get("/web-leads/stats");
  },
  update(
    id: string,
    data: Partial<{ status: WebLeadStatus; notes: string | null; customerId: string | null }>,
  ): Promise<ApiEnvelope<WebLead>> {
    return api.put(`/web-leads/${id}`, data);
  },
  remove(id: string): Promise<ApiEnvelope<{ message: string }>> {
    return api.delete(`/web-leads/${id}`);
  },
};

/** Shared query key so Sidebar, top bar and pages share one poll. */
export const WEB_LEAD_STATS_KEY = ["web-leads", "stats"] as const;

export default webLeadService;
