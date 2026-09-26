import api from "./api";
import type { ApiResponse } from "@/types";

/* Shapes returned by backend/src/services/dashboardService.ts (and the few
   extra endpoints the dashboard reads). Keep in sync with the backend. */

export interface DashboardKpis {
  todaySales: number;
  todaySalesCount: number;
  monthSales: number;
  monthSalesCount: number;
  /** Only present for ADMIN users. */
  monthProfit?: number;
  ticketAvg: number;
  lowStockCount: number;
  /** Bills pending/overdue with due date up to 7 days from now (includes already overdue). */
  upcomingBills: number;
  upcomingBillsAmount?: number;
  overdueInstallments: number;
  overdueInstallmentsAmount?: number;
}

export interface SalesChartPoint {
  /** "yyyy-MM-dd" (day/week) or "yyyy-MM" (month) */
  date: string;
  total: number;
  count: number;
}

export interface TopProductRow {
  product: { id: string; name: string; brand?: string | null };
  quantity: number;
  revenue: number;
}

export interface RecentSale {
  id: string;
  orderNumber: number;
  date: string;
  total: number;
  status: string;
  customer?: { id: string; name: string } | null;
  seller?: { id: string; name: string } | null;
}

export interface UpcomingBill {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  category?: { id: string; name: string } | null;
}

export interface OverdueInstallment {
  id: string;
  number: number;
  amount: number;
  dueDate: string;
  status: string;
  payment?: {
    salesOrder?: { id: string; orderNumber: number; customer?: { id: string; name: string } | null } | null;
  } | null;
}

export interface UpcomingReminders {
  upcomingBills: UpcomingBill[];
  overdueInstallments: OverdueInstallment[];
}

export interface BirthdayCustomer {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  birthDate: string;
}

export interface ReadyLensOrder {
  id: string;
  status: string;
  expectedDelivery?: string | null;
  receivedDate?: string | null;
  salesOrderId: string;
  salesOrder?: { id: string; orderNumber: number; customer?: { id: string; name: string; phone?: string } | null } | null;
  laboratory?: { id: string; name: string } | null;
}

export type ChartPeriod = "7d" | "30d" | "12m";

/** Backend /dashboard/sales-chart takes `days` + `groupBy` (not `period`). */
const PERIOD_QUERY: Record<ChartPeriod, string> = {
  "7d": "days=7&groupBy=day",
  "30d": "days=30&groupBy=day",
  "12m": "days=365&groupBy=month",
};

export interface DashboardData {
  kpis: DashboardKpis | null;
  salesChart: Record<ChartPeriod, SalesChartPoint[]>;
  topProducts: TopProductRow[];
  recentSales: RecentSale[];
  reminders: UpcomingReminders;
  birthdays: BirthdayCustomer[];
  readyLensOrders: ReadyLensOrder[];
  readyForPickup: RecentSale[];
  /** Names of the sections that failed to load (for inline retry). */
  failed: string[];
}

export const dashboardService = {
  getKPIs() {
    return api.get<ApiResponse<DashboardKpis>>("/dashboard/kpis");
  },

  getSalesChart(period: ChartPeriod) {
    return api.get<ApiResponse<SalesChartPoint[]>>(`/dashboard/sales-chart?${PERIOD_QUERY[period]}`);
  },

  getTopProducts() {
    return api.get<ApiResponse<TopProductRow[]>>("/dashboard/top-products");
  },

  getRecentSales() {
    return api.get<ApiResponse<RecentSale[]>>("/dashboard/recent-sales");
  },

  getUpcomingReminders() {
    return api.get<ApiResponse<UpcomingReminders>>("/dashboard/upcoming-reminders");
  },

  async getData(): Promise<DashboardData> {
    const results = await Promise.allSettled([
      api.get<ApiResponse<DashboardKpis>>("/dashboard/kpis"),
      dashboardService.getSalesChart("7d"),
      dashboardService.getSalesChart("30d"),
      dashboardService.getSalesChart("12m"),
      api.get<ApiResponse<TopProductRow[]>>("/dashboard/top-products"),
      api.get<ApiResponse<RecentSale[]>>("/dashboard/recent-sales"),
      api.get<ApiResponse<UpcomingReminders>>("/dashboard/upcoming-reminders"),
      api.get<ApiResponse<BirthdayCustomer[]>>("/customers/birthdays/month"),
      api.get<ApiResponse<ReadyLensOrder[]>>("/lens-orders?status=READY&limit=10"),
      api.get<ApiResponse<RecentSale[]>>("/sales?status=READY_FOR_PICKUP&limit=10"),
    ]);
    const names = [
      "kpis", "chart7d", "chart30d", "chart12m", "topProducts", "recentSales",
      "reminders", "birthdays", "lensOrders", "readyForPickup",
    ];
    const failed = results.flatMap((r, i) => (r.status === "rejected" ? [names[i]] : []));
    const val = <T,>(i: number, fallback: T): T => {
      const r = results[i];
      return r.status === "fulfilled" ? ((r.value as ApiResponse<T>)?.data ?? fallback) : fallback;
    };

    // If everything failed it's a real error (network / auth) — let the page show retry.
    if (failed.length === results.length) {
      const first = results[0] as PromiseRejectedResult;
      throw first.reason;
    }

    const reminders = val<UpcomingReminders>(6, { upcomingBills: [], overdueInstallments: [] });
    return {
      kpis: results[0].status === "fulfilled" ? val<DashboardKpis | null>(0, null) : null,
      salesChart: {
        "7d": val<SalesChartPoint[]>(1, []),
        "30d": val<SalesChartPoint[]>(2, []),
        "12m": val<SalesChartPoint[]>(3, []),
      },
      topProducts: val<TopProductRow[]>(4, []),
      recentSales: val<RecentSale[]>(5, []),
      reminders: {
        upcomingBills: reminders?.upcomingBills ?? [],
        overdueInstallments: reminders?.overdueInstallments ?? [],
      },
      birthdays: val<BirthdayCustomer[]>(7, []),
      readyLensOrders: val<ReadyLensOrder[]>(8, []),
      readyForPickup: val<RecentSale[]>(9, []),
      failed,
    };
  },
};

export default dashboardService;
