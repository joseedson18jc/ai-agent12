import api from "./api";

/* ─────────────────────────────────────────────────────────────
   Financeiro — wrappers verified against backend routes:
   /bills, /bill-categories, /payments, /cash
   ───────────────────────────────────────────────────────────── */

export type PaymentMethodCode =
  | "CASH"
  | "PIX"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "STORE_CREDIT"
  | "INSURANCE"
  | "EXCHANGE";

export type BillStatusCode = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
export type BillFrequencyCode = "WEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL";
export type InstallmentStatusCode = "PENDING" | "PAID" | "OVERDUE" | "RENEGOTIATED";
export type CashMovementTypeCode = "INFLOW" | "OUTFLOW" | "OPENING" | "WITHDRAWAL" | "SUPPLEMENT";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  pagination?: { page: number; limit: number; total: number };
}

export interface BillCategoryItem {
  id: string;
  name: string;
  _count?: { bills: number };
}

export interface BillItem {
  id: string;
  description: string;
  categoryId: string;
  supplierId?: string | null;
  amount: number;
  dueDate: string;
  paidDate?: string | null;
  status: BillStatusCode;
  paymentMethod?: PaymentMethodCode | null;
  isRecurring: boolean;
  frequency?: BillFrequencyCode | null;
  parentBillId?: string | null;
  notes?: string | null;
  createdAt: string;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}

export interface CreateBillPayload {
  description: string;
  categoryId: string;
  supplierId?: string;
  amount: number;
  /** ISO string */
  dueDate: string;
  isRecurring?: boolean;
  frequency?: BillFrequencyCode;
  notes?: string;
}

export interface ReceivableItem {
  id: string;
  paymentId: string;
  number: number;
  amount: number;
  dueDate: string;
  paidDate?: string | null;
  paidAmount?: number | null;
  status: InstallmentStatusCode;
  paymentMethod?: PaymentMethodCode | null;
  notes?: string | null;
  payment?: {
    id: string;
    amount: number;
    salesOrderId: string;
    salesOrder?: {
      id: string;
      orderNumber: number;
      customer?: { id: string; name: string; phone?: string | null } | null;
    } | null;
  } | null;
}

export interface CashMovementItem {
  id: string;
  cashRegisterId: string;
  type: CashMovementTypeCode;
  amount: number;
  description?: string | null;
  createdAt: string;
}

export interface CashRegisterItem {
  id: string;
  date: string;
  openingBalance: number;
  closingBalance?: number | null;
  reportedBalance?: number | null;
  difference?: number | null;
  isClosed: boolean;
  notes?: string | null;
  updatedAt?: string;
  movements?: CashMovementItem[];
  user?: { id: string; name: string } | null;
}

export interface BillFiltersParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  categoryId?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
}

export const financialService = {
  // === Contas a Pagar ===
  async getAllBills(filters?: BillFiltersParams): Promise<ApiEnvelope<BillItem[]>> {
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
    return api.get(`/bills?${params.toString()}`);
  },

  async createBill(data: CreateBillPayload): Promise<ApiEnvelope<BillItem>> {
    return api.post("/bills", data);
  },

  async updateBill(id: string, data: Partial<CreateBillPayload>): Promise<ApiEnvelope<BillItem>> {
    return api.put(`/bills/${id}`, data);
  },

  async deleteBill(id: string): Promise<ApiEnvelope<{ message: string }>> {
    return api.delete(`/bills/${id}`);
  },

  /** Backend body: { paymentMethod, receipt? } — paidDate is set server-side. */
  async payBill(
    id: string,
    data: { paymentMethod: PaymentMethodCode; receipt?: string },
  ): Promise<ApiEnvelope<BillItem>> {
    return api.put(`/bills/${id}/pay`, data);
  },

  async getUpcomingBills(): Promise<ApiEnvelope<BillItem[]>> {
    return api.get("/bills/upcoming");
  },

  async getOverdueBills(): Promise<ApiEnvelope<BillItem[]>> {
    return api.get("/bills/overdue");
  },

  // === Categorias de contas ===
  async getBillCategories(): Promise<ApiEnvelope<BillCategoryItem[]>> {
    return api.get("/bill-categories");
  },

  async createBillCategory(name: string): Promise<ApiEnvelope<BillCategoryItem>> {
    return api.post("/bill-categories", { name });
  },

  // === Contas a Receber (Parcelas) ===
  async getReceivables(params?: { status?: string; page?: number; limit?: number }): Promise<ApiEnvelope<ReceivableItem[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.status) searchParams.set("status", params.status);
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
    }
    return api.get(`/payments/receivables?${searchParams.toString()}`);
  },

  /** Backend body: { paidAmount, paymentMethod?, notes? } — paidDate is set server-side. */
  async payInstallment(
    id: string,
    data: { paidAmount: number; paymentMethod?: PaymentMethodCode; notes?: string },
  ): Promise<ApiEnvelope<ReceivableItem>> {
    return api.put(`/payments/installments/${id}/pay`, data);
  },

  // === Caixa ===
  async openCashRegister(data: { openingBalance: number; notes?: string }): Promise<ApiEnvelope<CashRegisterItem>> {
    return api.post("/cash/open", data);
  },

  async closeCashRegister(
    data: { reportedBalance: number; notes?: string },
    registerId?: string,
  ): Promise<ApiEnvelope<CashRegisterItem>> {
    let id = registerId;
    if (!id) {
      const current = await api.get<ApiEnvelope<CashRegisterItem | null>>("/cash/current");
      id = current?.data?.id;
    }
    if (!id) throw new Error("Nenhum caixa aberto");
    return api.post(`/cash/close/${id}`, data);
  },

  /** Backend requires cashRegisterId in the body. */
  async addMovement(data: {
    cashRegisterId: string;
    type: Exclude<CashMovementTypeCode, "OPENING">;
    amount: number;
    description?: string;
    salesOrderId?: string;
    billToPayId?: string;
  }): Promise<ApiEnvelope<CashMovementItem>> {
    return api.post("/cash/movement", data);
  },

  /** data is null when there is no open register. */
  async getCurrentCash(): Promise<ApiEnvelope<CashRegisterItem | null>> {
    return api.get("/cash/current");
  },

  async getCashHistory(page: number = 1, limit: number = 20): Promise<ApiEnvelope<CashRegisterItem[]>> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    return api.get(`/cash/history?${params.toString()}`);
  },
};

export default financialService;
