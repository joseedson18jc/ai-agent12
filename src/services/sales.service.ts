import api from "./api";
import type {
  ApiResponse,
  PaginatedResponse,
  SalesOrder,
  SalesOrderStatus,
  SalesFilters,
} from "@/types";

export const salesService = {
  async getAll(
    filters?: SalesFilters
  ): Promise<PaginatedResponse<SalesOrder>> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.status) params.set("status", filters.status);
      if (filters.sellerId) params.set("sellerId", filters.sellerId);
      if (filters.customerId) params.set("customerId", filters.customerId);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));
    }
    return api.get<PaginatedResponse<SalesOrder>>(
      `/sales?${params.toString()}`
    );
  },

  async getById(id: string): Promise<ApiResponse<SalesOrder>> {
    return api.get<ApiResponse<SalesOrder>>(`/sales/${id}`);
  },

  async create(data: Partial<SalesOrder>): Promise<ApiResponse<SalesOrder>> {
    return api.post<ApiResponse<SalesOrder>>("/sales", data);
  },

  async updateStatus(
    id: string,
    status: SalesOrderStatus
  ): Promise<ApiResponse<SalesOrder>> {
    return api.put<ApiResponse<SalesOrder>>(`/sales/${id}/status`, { status });
  },

  async cancel(
    id: string,
    reason: string
  ): Promise<ApiResponse<SalesOrder>> {
    return api.put<ApiResponse<SalesOrder>>(`/sales/${id}/cancel`, { reason });
  },

  async getPending(): Promise<ApiResponse<SalesOrder[]>> {
    return api.get<ApiResponse<SalesOrder[]>>("/sales/pending");
  },
};

export default salesService;
