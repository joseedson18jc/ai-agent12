import api from "./api";
import type { ApiResponse, PaginatedResponse, Customer } from "@/types";

export const customerService = {
  async getAll(
    search?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Customer>> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return api.get<PaginatedResponse<Customer>>(
      `/customers?${params.toString()}`
    );
  },

  async getById(id: string): Promise<ApiResponse<Customer>> {
    return api.get<ApiResponse<Customer>>(`/customers/${id}`);
  },

  async create(
    data: Partial<Customer>
  ): Promise<ApiResponse<Customer>> {
    return api.post<ApiResponse<Customer>>("/customers", data);
  },

  async update(
    id: string,
    data: Partial<Customer>
  ): Promise<ApiResponse<Customer>> {
    return api.put<ApiResponse<Customer>>(`/customers/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<ApiResponse<void>>(`/customers/${id}`);
  },

  async getBirthdays(): Promise<ApiResponse<Customer[]>> {
    return api.get<ApiResponse<Customer[]>>("/customers/birthdays");
  },
};

export default customerService;
