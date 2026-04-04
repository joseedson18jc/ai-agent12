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
      "/dashboard/upcoming-reminders"
    );
  },

  async getData(): Promise<any> {
    const [kpis, sales7d, sales30d, sales12m, topProducts, recentSales, reminders] = await Promise.allSettled([
      api.get<any>("/dashboard/kpis"),
      api.get<any>("/dashboard/sales-chart?period=7d"),
      api.get<any>("/dashboard/sales-chart?period=30d"),
      api.get<any>("/dashboard/sales-chart?period=12m"),
      api.get<any>("/dashboard/top-products"),
      api.get<any>("/dashboard/recent-sales"),
      api.get<any>("/dashboard/upcoming-reminders"),
    ]);
    const kpiData = kpis.status === "fulfilled" ? kpis.value?.data || kpis.value : {};
    return {
      dailySales: kpiData.dailySales ?? 0,
      monthlySales: kpiData.monthlySales ?? 0,
      monthlyProfit: kpiData.monthlyProfit ?? 0,
      totalOrders: kpiData.totalOrders ?? 0,
      averageTicket: kpiData.averageTicket ?? 0,
      lowStockCount: kpiData.lowStockCount ?? 0,
      upcomingBills: kpiData.upcomingBills ?? 0,
      overdueInstallments: kpiData.overdueInstallments ?? 0,
      salesChart: {
        "7d": sales7d.status === "fulfilled" ? sales7d.value?.data || [] : [],
        "30d": sales30d.status === "fulfilled" ? sales30d.value?.data || [] : [],
        "12m": sales12m.status === "fulfilled" ? sales12m.value?.data || [] : [],
      },
      topProducts: topProducts.status === "fulfilled" ? topProducts.value?.data || [] : [],
      recentSales: recentSales.status === "fulfilled" ? recentSales.value?.data || [] : [],
      reminders: reminders.status === "fulfilled" ? reminders.value?.data || [] : [],
    };
  },
};

export type { UpcomingReminder };
export default dashboardService;
