import api from "./api";
import type {
  ApiResponse,
  DashboardKPIs,
  SalesChartData,
  TopProduct,
  SalesOrder,
} from "@/types";

interface UpcomingReminder {
  id: string;
  type: "birthday" | "overdue_bill" | "overdue_installment" | "lens_order_ready" | "low_stock";
  title: string;
  description: string;
  date: string;
  entityId: string;
}

export const dashboardService = {
  async getKPIs(): Promise<ApiResponse<DashboardKPIs>> {
    return api.get<ApiResponse<DashboardKPIs>>("/dashboard/kpis");
  },

  async getSalesChart(
    period: "7d" | "30d" | "90d" | "12m"
  ): Promise<ApiResponse<SalesChartData[]>> {
    return api.get<ApiResponse<SalesChartData[]>>(
      `/dashboard/sales-chart?period=${period}`
    );
  },

  async getTopProducts(): Promise<ApiResponse<TopProduct[]>> {
    return api.get<ApiResponse<TopProduct[]>>("/dashboard/top-products");
  },

  async getRecentSales(): Promise<ApiResponse<SalesOrder[]>> {
    return api.get<ApiResponse<SalesOrder[]>>("/dashboard/recent-sales");
  },

  async getUpcomingReminders(): Promise<ApiResponse<UpcomingReminder[]>> {
    return api.get<ApiResponse<UpcomingReminder[]>>(
      "/dashboard/reminders"
    );
  },
};

export type { UpcomingReminder };
export default dashboardService;
