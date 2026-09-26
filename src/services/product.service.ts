import api from "./api";
import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  ProductFilters,
} from "@/types";

/** Stock filter understood by GET /products?stock= */
export type ProductStockFilter = "in_stock" | "low" | "out";
/** Sort keys understood by GET /products?sort= */
export type ProductSort = "name" | "recent" | "stock" | "margin" | "price";

/** Catalogue-wide figures returned alongside every product list page. */
export interface ProductSummary {
  products: number;
  units: number;
  costValue: number;
  saleValue: number;
  lowStock: number;
  outOfStock: number;
  avgMargin: number;
  /** Products whose selling price is below their stored minimum price */
  belowMinimum: number;
  /** Priced products with simple margin under 20% */
  lowMargin: number;
  brands: string[];
}

/** Real shape of GET /products: `{ success, data, pagination, summary }`. */
export interface ProductListResponse {
  success: boolean;
  data: Product[];
  pagination?: { page: number; limit: number; total: number };
  summary?: ProductSummary;
}

export interface ProductListParams {
  search?: string;
  categoryId?: string;
  brand?: string;
  stock?: ProductStockFilter;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

/**
 * Body accepted by POST/PUT /products (backend Zod schema in productController.ts).
 * `null` clears an optional field on update.
 */
export interface ProductPayload {
  name: string;
  categoryId: string;
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  material?: string;
  supplierId?: string | null;
  barcode?: string | null;
  photo?: string | null;
  /** Texto exibido na vitrine do site (null limpa). */
  description?: string | null;
  /** Exibir o produto no site público. */
  showOnline?: boolean;
  stock?: number;
  minStock?: number;
  costPrice: number;
  taxFreight?: number;
  desiredMarkup?: number;
  sellingPrice?: number;
  minimumPrice?: number;
}

export interface ProductCategoryOption {
  id: string;
  name: string;
  type: string;
  defaultMarkup: number;
  _count?: { products: number };
}

export const productService = {
  /** Legacy wrapper kept for other callers — prefer `list`. */
  async getAll(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.search) params.set("search", filters.search);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.brand) params.set("brand", filters.brand);
      if (filters.lowStock) params.set("stock", "low");
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));
    }
    return api.get<PaginatedResponse<Product>>(`/products?${params.toString()}`);
  },

  async list(p: ProductListParams = {}): Promise<ProductListResponse> {
    const params = new URLSearchParams();
    if (p.search?.trim()) params.set("search", p.search.trim());
    if (p.categoryId) params.set("categoryId", p.categoryId);
    if (p.brand) params.set("brand", p.brand);
    if (p.stock) params.set("stock", p.stock);
    if (p.sort) params.set("sort", p.sort);
    if (p.page) params.set("page", String(p.page));
    if (p.limit) params.set("limit", String(p.limit));
    return api.get<ProductListResponse>(`/products?${params.toString()}`);
  },

  async getCategories(): Promise<ProductCategoryOption[]> {
    const res = await api.get<ApiResponse<ProductCategoryOption[]>>("/categories");
    return res.data || [];
  },

  async getById(id: string): Promise<ApiResponse<Product>> {
    return api.get<ApiResponse<Product>>(`/products/${id}`);
  },

  async create(data: ProductPayload | Partial<Product>): Promise<ApiResponse<Product>> {
    return api.post<ApiResponse<Product>>("/products", data);
  },

  async update(id: string, data: Partial<ProductPayload> | Partial<Product>): Promise<ApiResponse<Product>> {
    return api.put<ApiResponse<Product>>(`/products/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete<ApiResponse<{ message: string }>>(`/products/${id}`);
  },

  async getLowStock(): Promise<ApiResponse<Product[]>> {
    return api.get<ApiResponse<Product[]>>("/products/low-stock");
  },

  /** Backend returns `{ valid, minimumPrice, sellingPrice, requestedPrice, difference }`. */
  async validatePrice(
    productId: string,
    price: number
  ): Promise<
    ApiResponse<{ valid: boolean; minimumPrice: number; sellingPrice: number; requestedPrice: number; difference: number }>
  > {
    return api.post(`/products/validate-price`, { productId, price });
  },
};

export default productService;
