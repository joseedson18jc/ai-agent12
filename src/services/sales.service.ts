import api from "./api";
import type {
  ApiResponse,
  PaginatedResponse,
  SalesOrder,
  SalesOrderStatus,
  SalesFilters,
} from "@/types";

/* ─────────────────────────────────────────────────────────────
   Shapes returned by the real backend (backend/src/services/salesService.ts).
   The generic `SalesOrder` type in @/types predates the API, so the pages
   use these instead.
   ───────────────────────────────────────────────────────────── */

export type SaleStatus = "AWAITING_LENS" | "IN_PRODUCTION" | "READY_FOR_PICKUP" | "DELIVERED" | "CANCELLED";
export type PaymentMethodCode = "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "STORE_CREDIT" | "INSURANCE" | "EXCHANGE";
export type InstallmentStatusCode = "PENDING" | "PAID" | "OVERDUE" | "RENEGOTIATED";
export type LensOrderStatusCode = "ORDERED" | "IN_PRODUCTION" | "READY" | "RECEIVED" | "CANCELLED";

export interface ApiList<T> {
  success: boolean;
  data: T[];
  pagination?: { page: number; limit: number; total: number };
}

export interface ApiItem<T> {
  success: boolean;
  data: T;
}

export interface SaleInstallment {
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
}

export interface SalePayment {
  id: string;
  salesOrderId: string;
  method: PaymentMethodCode;
  amount: number;
  cardBrand?: string | null;
  cardInstallments?: number | null;
  interestRate?: number | null;
  justification?: string | null;
  createdAt: string;
  installments?: SaleInstallment[];
}

export interface SaleItem {
  id: string;
  productId?: string | null;
  description?: string | null;
  unitPrice: number;
  quantity: number;
  discountPercent?: number | null;
  discountAmount: number;
  subtotal: number;
  costPrice: number;
  product?: {
    id: string;
    name: string;
    brand?: string | null;
    model?: string | null;
    color?: string | null;
    size?: string | null;
    barcode?: string | null;
  } | null;
}

export interface SalePrescription {
  id: string;
  customerId: string;
  date: string;
  doctor?: string | null;
  doctorCrm?: string | null;
  validity: string;
  odSpherical?: number | null;
  odCylindrical?: number | null;
  odAxis?: number | null;
  odDnp?: number | null;
  odHeight?: number | null;
  odAddition?: number | null;
  oeSphrical?: number | null;
  oeCylindrical?: number | null;
  oeAxis?: number | null;
  oeDnp?: number | null;
  oeHeight?: number | null;
  oeAddition?: number | null;
  lensType?: "SINGLE_VISION" | "BIFOCAL" | "MULTIFOCAL" | null;
  treatments?: string[];
  notes?: string | null;
  isExpired?: boolean;
}

export interface SaleLensOrder {
  id: string;
  salesOrderId: string;
  laboratoryId: string;
  laboratory?: { id: string; name: string; phone?: string | null; whatsapp?: string | null } | null;
  prescriptionData?: unknown;
  lensType?: string | null;
  treatments?: string | null;
  orderDate: string;
  expectedDelivery?: string | null;
  receivedDate?: string | null;
  status: LensOrderStatusCode;
  cost: number;
  notes?: string | null;
}

export interface SaleCustomer {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface Sale {
  id: string;
  orderNumber: number;
  customerId: string;
  prescriptionId?: string | null;
  sellerId: string;
  date: string;
  subtotal: number;
  discountPercent?: number | null;
  discountAmount: number;
  total: number;
  estimatedProfit: number;
  status: SaleStatus;
  cancelReason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: SaleCustomer | null;
  seller?: { id: string; name: string } | null;
  items?: SaleItem[];
  payments?: SalePayment[];
  prescription?: SalePrescription | null;
  lensOrders?: SaleLensOrder[];
}

export interface SaleListParams {
  status?: SaleStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  sellerId?: string;
  page?: number;
  limit?: number;
}

/** Body accepted by POST /sales — mirrors createSchema in salesController.ts. */
export interface CreateSalePayload {
  customerId: string;
  prescriptionId?: string;
  sellerId: string;
  discountPercent?: number;
  discountAmount?: number;
  notes?: string;
  items: {
    productId?: string;
    description?: string;
    unitPrice: number;
    quantity: number;
    discountPercent?: number;
    discountAmount?: number;
  }[];
  payments: {
    method: PaymentMethodCode;
    amount: number;
    cardBrand?: string;
    cardInstallments?: number;
    interestRate?: number;
    justification?: string;
    installmentCount?: number;
  }[];
}

export interface CreateLensOrderPayload {
  salesOrderId: string;
  laboratoryId: string;
  prescriptionData?: unknown;
  lensType?: string;
  treatments?: string;
  expectedDelivery?: string;
  cost?: number;
  notes?: string;
}

export interface Laboratory {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
}

function toQuery(params: object) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return q.toString();
}

export const salesService = {
  /** Legacy wrapper (kept for GlobalSearch). */
  async getAll(filters?: SalesFilters): Promise<PaginatedResponse<SalesOrder>> {
    return api.get<PaginatedResponse<SalesOrder>>(`/sales?${toQuery(filters ?? {})}`);
  },

  async list(params: SaleListParams = {}): Promise<ApiList<Sale>> {
    return api.get<ApiList<Sale>>(`/sales?${toQuery(params)}`);
  },

  async get(id: string): Promise<ApiItem<Sale>> {
    return api.get<ApiItem<Sale>>(`/sales/${id}`);
  },

  async getById(id: string): Promise<ApiResponse<SalesOrder>> {
    return api.get<ApiResponse<SalesOrder>>(`/sales/${id}`);
  },

  async create(data: CreateSalePayload | Partial<SalesOrder>): Promise<ApiItem<Sale>> {
    return api.post<ApiItem<Sale>>("/sales", data);
  },

  async updateStatus(id: string, status: SalesOrderStatus | SaleStatus): Promise<ApiItem<Sale>> {
    return api.put<ApiItem<Sale>>(`/sales/${id}/status`, { status });
  },

  async cancel(id: string, reason: string): Promise<ApiItem<{ message: string }>> {
    return api.put<ApiItem<{ message: string }>>(`/sales/${id}/cancel`, { reason });
  },

  async getPending(): Promise<ApiItem<Sale[]>> {
    return api.get<ApiItem<Sale[]>>("/sales/pending");
  },

  /* ── Payments / installments (backend/src/routes/paymentRoutes.ts) ── */
  async payInstallment(
    id: string,
    data: { paidAmount: number; paymentMethod?: PaymentMethodCode; notes?: string },
  ): Promise<ApiItem<SaleInstallment>> {
    return api.put<ApiItem<SaleInstallment>>(`/payments/installments/${id}/pay`, data);
  },

  /* ── Lens orders (backend/src/routes/lensOrderRoutes.ts) ── */
  async createLensOrder(data: CreateLensOrderPayload): Promise<ApiItem<SaleLensOrder>> {
    return api.post<ApiItem<SaleLensOrder>>("/lens-orders", data);
  },

  async updateLensOrderStatus(
    id: string,
    data: { status: LensOrderStatusCode; notes?: string },
  ): Promise<ApiItem<SaleLensOrder>> {
    return api.put<ApiItem<SaleLensOrder>>(`/lens-orders/${id}/status`, data);
  },

  async listLaboratories(): Promise<ApiList<Laboratory>> {
    return api.get<ApiList<Laboratory>>("/laboratories?limit=100");
  },
};

/* ── Shared labels / tones ─────────────────────────────────── */
export const SALE_STATUS: Record<SaleStatus, { label: string; short: string; tone: "info" | "warning" | "success" | "neutral" | "danger" | "gold" }> = {
  AWAITING_LENS: { label: "Aguardando lente", short: "Aguard. lente", tone: "info" },
  IN_PRODUCTION: { label: "Em produção", short: "Em produção", tone: "warning" },
  READY_FOR_PICKUP: { label: "Pronta p/ retirada", short: "Pronta", tone: "success" },
  DELIVERED: { label: "Entregue", short: "Entregue", tone: "neutral" },
  CANCELLED: { label: "Cancelada", short: "Cancelada", tone: "danger" },
};

export const SALE_FLOW: SaleStatus[] = ["AWAITING_LENS", "IN_PRODUCTION", "READY_FOR_PICKUP", "DELIVERED"];

export function nextSaleStatus(s: SaleStatus): SaleStatus | null {
  const i = SALE_FLOW.indexOf(s);
  return i >= 0 && i < SALE_FLOW.length - 1 ? SALE_FLOW[i + 1] : null;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  STORE_CREDIT: "Crediário da loja",
  INSURANCE: "Convênio",
  EXCHANGE: "Troca / cortesia",
};

export function formatOrderNumber(n?: number | null) {
  if (n === undefined || n === null) return "OS";
  return `OS ${String(n).padStart(4, "0")}`;
}

/** wa.me link for a Brazilian phone number. */
export function whatsappLink(phone: string | null | undefined, text: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const number = digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export default salesService;
