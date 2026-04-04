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
  async getBills(
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
      `/financial/bills?${params.toString()}`
    );
  },

  async createBill(data: Partial<BillToPay>): Promise<ApiResponse<BillToPay>> {
    return api.post<ApiResponse<BillToPay>>("/financial/bills", data);
  },

  async updateBill(
    id: string,
    data: Partial<BillToPay>
  ): Promise<ApiResponse<BillToPay>> {
    return api.put<ApiResponse<BillToPay>>(`/financial/bills/${id}`, data);
  },

  async payBill(
    id: string,
    paidAmount: number,
    paidAt?: string
  ): Promise<ApiResponse<BillToPay>> {
    return api.post<ApiResponse<BillToPay>>(`/financial/bills/${id}/pay`, {
      paidAmount,
      paidAt,
    });
  },

  async getUpcomingBills(): Promise<ApiResponse<BillToPay[]>> {
    return api.get<ApiResponse<BillToPay[]>>("/financial/bills/upcoming");
  },

  async getOverdueBills(): Promise<ApiResponse<BillToPay[]>> {
    return api.get<ApiResponse<BillToPay[]>>("/financial/bills/overdue");
  },

  // === Contas a Receber (Parcelas) ===
  async getReceivables(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Installment>> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    return api.get<PaginatedResponse<Installment>>(
      `/financial/receivables?${params.toString()}`
    );
  },

  async payInstallment(
    id: string,
    paidAmount: number,
    paidAt?: string
  ): Promise<ApiResponse<Installment>> {
    return api.post<ApiResponse<Installment>>(
      `/financial/installments/${id}/pay`,
      { paidAmount, paidAt }
    );
  },

  // === Caixa ===
  async openRegister(
    openingBalance: number
  ): Promise<ApiResponse<CashRegister>> {
    return api.post<ApiResponse<CashRegister>>("/financial/cash/open", {
      openingBalance,
    });
  },

  async closeRegister(
    notes?: string
  ): Promise<ApiResponse<CashRegister>> {
    return api.post<ApiResponse<CashRegister>>("/financial/cash/close", {
      notes,
    });
  },

  async addMovement(data: {
    type: CashMovementType;
    amount: number;
    description: string;
  }): Promise<ApiResponse<CashMovement>> {
    return api.post<ApiResponse<CashMovement>>(
      "/financial/cash/movement",
      data
    );
  },

  async getCurrentRegister(): Promise<ApiResponse<CashRegister>> {
    return api.get<ApiResponse<CashRegister>>("/financial/cash/current");
  },

  async getCashHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<CashRegister>> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    return api.get<PaginatedResponse<CashRegister>>(
      `/financial/cash/history?${params.toString()}`
    );
  },
};

export default financialService;
