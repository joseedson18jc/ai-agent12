import api from "./api";
import type {
  ApiResponse,
  PaginatedResponse,
  BillToPay,
  BillFilters,
  Installment,
  CashRegister,
  CashMovement,
  CashMovementType,
} from "@/types";

export const financialService = {
  // === Contas a Pagar ===
  async getAllBills(
    filters?: BillFilters
  ): Promise<PaginatedResponse<BillToPay>> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.status) params.set("status", filters.status);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.supplierId) params.set("supplierId", filters.supplierId);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));
    }
    return api.get<PaginatedResponse<BillToPay>>(
      `/bills?${params.toString()}`
    );
  },

  async createBill(data: any): Promise<ApiResponse<BillToPay>> {
    return api.post<ApiResponse<BillToPay>>("/bills", data);
  },

  async updateBill(
    id: string,
    data: Partial<BillToPay>
  ): Promise<ApiResponse<BillToPay>> {
    return api.put<ApiResponse<BillToPay>>(`/bills/${id}`, data);
  },

  async payBill(
    id: string,
    data: any
  ): Promise<ApiResponse<BillToPay>> {
    return api.put<ApiResponse<BillToPay>>(`/bills/${id}/pay`, data);
  },

  async getUpcomingBills(): Promise<ApiResponse<BillToPay[]>> {
    return api.get<ApiResponse<BillToPay[]>>("/bills/upcoming");
  },

  async getOverdueBills(): Promise<ApiResponse<BillToPay[]>> {
    return api.get<ApiResponse<BillToPay[]>>("/bills/overdue");
  },

  // === Contas a Receber (Parcelas) ===
  async getReceivables(
    params?: any
  ): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.status) searchParams.set("status", params.status);
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
    }
    return api.get<PaginatedResponse<Installment>>(
      `/payments/receivables?${searchParams.toString()}`
    );
  },

  async payInstallment(
    id: string,
    data: any
  ): Promise<ApiResponse<Installment>> {
    return api.put<ApiResponse<Installment>>(
      `/payments/installments/${id}/pay`,
      data
    );
  },

  // === Caixa ===
  async openCashRegister(
    data: { openingBalance: number }
  ): Promise<ApiResponse<CashRegister>> {
    return api.post<ApiResponse<CashRegister>>("/cash/open", data);
  },

  async closeCashRegister(
    data: { reportedBalance: number; notes?: string }
  ): Promise<ApiResponse<CashRegister>> {
    // Get current register ID first
    const current = await api.get<ApiResponse<CashRegister>>("/cash/current");
    const registerId = current?.data?.id;
    if (!registerId) throw new Error("Nenhum caixa aberto");
    return api.post<ApiResponse<CashRegister>>(`/cash/close/${registerId}`, data);
  },

  async addMovement(data: {
    type: CashMovementType;
    amount: number;
    description: string;
  }): Promise<ApiResponse<CashMovement>> {
    return api.post<ApiResponse<CashMovement>>(
      "/cash/movement",
      data
    );
  },

  async getCurrentCash(): Promise<ApiResponse<CashRegister>> {
    return api.get<ApiResponse<CashRegister>>("/cash/current");
  },

  async getCashHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<CashRegister>> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    return api.get<PaginatedResponse<CashRegister>>(
      `/cash/history?${params.toString()}`
    );
  },
};

export default financialService;
