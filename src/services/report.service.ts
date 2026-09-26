import api from "./api";
import type { ApiResponse, ReportFilters } from "@/types";

/* Shapes returned by backend/src/services/reportService.ts. Keep in sync. */

export interface ReportSaleOrder {
  id: string;
  orderNumber: number;
  date: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  estimatedProfit: number;
  status: string;
  customer?: { id: string; name: string } | null;
  seller?: { id: string; name: string } | null;
  items: {
    id: string;
    description?: string | null;
    quantity: number;
    subtotal: number;
    product?: { id: string; name: string; category?: { id: string; name: string } | null } | null;
  }[];
  payments: { id: string; method: string; amount: number }[];
}

export interface SalesReportData {
  period: { startDate: string; endDate: string };
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalProfit: number;
    totalDiscount: number;
    averageTicket: number;
  };
  byPaymentMethod: Record<string, { count: number; total: number }>;
  bySeller: { name: string; count: number; total: number }[];
  orders: ReportSaleOrder[];
}

export interface FinancialReportData {
  period: { startDate: string; endDate: string };
  dre: {
    receita_bruta: number;
    descontos: number;
    receita_liquida: number;
    custo_mercadoria: number;
    lucro_bruto: number;
    despesas_operacionais: number;
    resultado_liquido: number;
  };
  cashFlow: { inflows: number; installmentsReceived: number; outflows: number; netCashFlow: number };
  receivables: { pending: number; pendingCount: number };
  payables: { pending: number; pendingCount: number };
}

export interface StockProduct {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  barcode?: string | null;
  stock: number;
  minStock: number;
  costPrice: number;
  totalCost: number;
  sellingPrice: number;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}

export interface StockReportData {
  summary: {
    totalProducts: number;
    totalItems: number;
    totalCostValue: number;
    totalSellingValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  byCategory: { name: string; count: number; totalStock: number; totalValue: number }[];
  lowStock: StockProduct[];
  outOfStock: StockProduct[];
  products: StockProduct[];
}

export interface CustomerReportData {
  newCustomers: {
    count: number;
    customers: { id: string; name: string; phone?: string | null; createdAt: string }[];
  };
  topCustomers: { id: string; name: string; phone?: string | null; totalSpent: number; orderCount: number }[];
  debtors: { customer: { id: string; name: string; phone?: string | null }; totalOwed: number; installments: number }[];
}

/**
 * The backend parses dates with `new Date(value)` and applies startOfDay/endOfDay in the
 * server timezone. A bare "yyyy-MM-dd" is parsed as UTC midnight, which shifts to the
 * previous day on servers behind UTC — send a local wall-clock time instead.
 */
function periodParams(filters: ReportFilters) {
  const params = new URLSearchParams();
  const d = (v: string, time: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T${time}` : v);
  params.set("startDate", d(filters.startDate, "00:00:00"));
  params.set("endDate", d(filters.endDate, "12:00:00"));
  return params;
}

export const reportService = {
  async getSalesReport(filters: ReportFilters & { paymentMethod?: string }): Promise<ApiResponse<SalesReportData>> {
    const params = periodParams(filters);
    if (filters.sellerId) params.set("sellerId", filters.sellerId);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
    return api.get<ApiResponse<SalesReportData>>(`/reports/sales?${params.toString()}`);
  },

  async getFinancialReport(filters: ReportFilters): Promise<ApiResponse<FinancialReportData>> {
    return api.get<ApiResponse<FinancialReportData>>(`/reports/financial?${periodParams(filters).toString()}`);
  },

  async getStockReport(): Promise<ApiResponse<StockReportData>> {
    return api.get<ApiResponse<StockReportData>>("/reports/stock");
  },

  async getCustomerReport(filters: ReportFilters): Promise<ApiResponse<CustomerReportData>> {
    return api.get<ApiResponse<CustomerReportData>>(`/reports/customers?${periodParams(filters).toString()}`);
  },
};

export default reportService;
