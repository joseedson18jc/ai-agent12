import api from "./api";
import type { ApiResponse, ReportFilters } from "@/types";

interface SalesReportData {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  salesByDay: { date: string; total: number; count: number }[];
  salesBySeller: { sellerId: string; sellerName: string; total: number; count: number }[];
  salesByCategory: { categoryId: string; categoryName: string; total: number; count: number }[];
  salesByPaymentMethod: { method: string; total: number; count: number }[];
}

interface FinancialReportData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueByDay: { date: string; revenue: number; expenses: number }[];
  expensesByCategory: { categoryId: string; categoryName: string; total: number }[];
  pendingReceivables: number;
  pendingPayables: number;
}

interface StockReportData {
  totalProducts: number;
  totalStockValue: number;
  lowStockItems: { productId: string; productName: string; currentStock: number; minStock: number }[];
  stockByCategory: { categoryId: string; categoryName: string; totalItems: number; totalValue: number }[];
}

interface CustomerReportData {
  totalCustomers: number;
  newCustomers: number;
  topCustomers: { customerId: string; customerName: string; totalPurchases: number; totalSpent: number }[];
  customersByCity: { city: string; count: number }[];
  birthdaysThisMonth: { customerId: string; customerName: string; birthDate: string }[];
}

export const reportService = {
  async getSalesReport(
    filters: ReportFilters
  ): Promise<ApiResponse<SalesReportData>> {
    const params = new URLSearchParams();
    params.set("startDate", filters.startDate);
    params.set("endDate", filters.endDate);
    if (filters.groupBy) params.set("groupBy", filters.groupBy);
    if (filters.sellerId) params.set("sellerId", filters.sellerId);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    return api.get<ApiResponse<SalesReportData>>(
      `/reports/sales?${params.toString()}`
    );
  },

  async getFinancialReport(
    filters: ReportFilters
  ): Promise<ApiResponse<FinancialReportData>> {
    const params = new URLSearchParams();
    params.set("startDate", filters.startDate);
    params.set("endDate", filters.endDate);
    if (filters.groupBy) params.set("groupBy", filters.groupBy);
    return api.get<ApiResponse<FinancialReportData>>(
      `/reports/financial?${params.toString()}`
    );
  },

  async getStockReport(): Promise<ApiResponse<StockReportData>> {
    return api.get<ApiResponse<StockReportData>>("/reports/stock");
  },

  async getCustomerReport(
    filters: ReportFilters
  ): Promise<ApiResponse<CustomerReportData>> {
    const params = new URLSearchParams();
    params.set("startDate", filters.startDate);
    params.set("endDate", filters.endDate);
    return api.get<ApiResponse<CustomerReportData>>(
      `/reports/customers?${params.toString()}`
    );
  },
};

export type {
  SalesReportData,
  FinancialReportData,
  StockReportData,
  CustomerReportData,
};
export default reportService;
