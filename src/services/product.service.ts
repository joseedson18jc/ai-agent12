import api from "./api";
import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  ProductFilters,
} from "@/types";

export const productService = {
  async getAll(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.search) params.set("search", filters.search);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.supplierId) params.set("supplierId", filters.supplierId);
      if (filters.isActive !== undefined)
        params.set("isActive", String(filters.isActive));
      if (filters.lowStock) params.set("lowStock", String(filters.lowStock));
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));
    }
    return api.get<PaginatedResponse<Product>>(
      `/products?${params.toString()}`
    );
  },

  async getById(id: string): Promise<ApiResponse<Product>> {
    return api.get<ApiResponse<Product>>(`/products/${id}`);
  },

  async create(data: Partial<Product>): Promise<ApiResponse<Product>> {
    return api.post<ApiResponse<Product>>("/products", data);
  },

  async update(
    id: string,
    data: Partial<Product>
  ): Promise<ApiResponse<Product>> {
    return api.put<ApiResponse<Product>>(`/products/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete<ApiResponse<void>>(`/products/${id}`);
  },

  async getLowStock(): Promise<ApiResponse<Product[]>> {
    return api.get<ApiResponse<Product[]>>("/products/low-stock");
  },

  async validatePrice(
    productId: string,
    price: number
  ): Promise<ApiResponse<{ valid: boolean; minPrice: number; margin: number }>> {
    return api.post<
      ApiResponse<{ valid: boolean; minPrice: number; margin: number }>
    >(`/products/${productId}/validate-price`, { price });
  },
};

export default productService;
