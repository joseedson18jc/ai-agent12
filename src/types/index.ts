// =====================
// Enums (matching Prisma schema)
// =====================

export enum UserRole {
  ADMIN = "ADMIN",
  SELLER = "SELLER",
  VIEWER = "VIEWER",
}

export enum CustomerStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum LensType {
  SINGLE_VISION = "SINGLE_VISION",
  BIFOCAL = "BIFOCAL",
  MULTIFOCAL = "MULTIFOCAL",
}

export enum LensTreatment {
  ANTIREFLECTIVE = "ANTIREFLECTIVE",
  PHOTOCHROMIC = "PHOTOCHROMIC",
  BLUE_LIGHT = "BLUE_LIGHT",
  TRANSITIONS = "TRANSITIONS",
}

export enum ProductCategoryType {
  FRAMES_PRESCRIPTION = "FRAMES_PRESCRIPTION",
  FRAMES_SUN = "FRAMES_SUN",
  OPHTHALMIC_LENSES = "OPHTHALMIC_LENSES",
  CONTACT_LENSES = "CONTACT_LENSES",
  SUNGLASSES_READY = "SUNGLASSES_READY",
  ACCESSORIES = "ACCESSORIES",
}

export enum SalesOrderStatus {
  AWAITING_LENS = "AWAITING_LENS",
  IN_PRODUCTION = "IN_PRODUCTION",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export enum PaymentMethod {
  CASH = "CASH",
  PIX = "PIX",
  CREDIT_CARD = "CREDIT_CARD",
  DEBIT_CARD = "DEBIT_CARD",
  STORE_CREDIT = "STORE_CREDIT",
  INSURANCE = "INSURANCE",
  EXCHANGE = "EXCHANGE",
}

export enum InstallmentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  RENEGOTIATED = "RENEGOTIATED",
}

export enum BillStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

export enum BillFrequency {
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  BIMONTHLY = "BIMONTHLY",
  QUARTERLY = "QUARTERLY",
  SEMIANNUAL = "SEMIANNUAL",
  ANNUAL = "ANNUAL",
}

export enum CashMovementType {
  INFLOW = "INFLOW",
  OUTFLOW = "OUTFLOW",
  OPENING = "OPENING",
  WITHDRAWAL = "WITHDRAWAL",
  SUPPLEMENT = "SUPPLEMENT",
}

export enum LensOrderStatus {
  ORDERED = "ORDERED",
  IN_PRODUCTION = "IN_PRODUCTION",
  READY = "READY",
  RECEIVED = "RECEIVED",
  CANCELLED = "CANCELLED",
}

// =====================
// Models (matching Prisma schema field names)
// =====================

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logo?: string;
  defaultMarkup: number;
  billAlertDays: number;
  prescriptionAlertDays: number;
  defaultMinStock: number;
  printerType: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  cpf?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  birthDate?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  photo?: string;
  notes?: string;
  status: CustomerStatus;
  isDeleted: boolean;
  prescriptions?: Prescription[];
  salesOrders?: SalesOrder[];
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  customerId: string;
  customer?: { id: string; name: string };
  date: string;
  doctor?: string;
  doctorCrm?: string;
  validity: string;
  file?: string;
  odSpherical?: number;
  odCylindrical?: number;
  odAxis?: number;
  odDnp?: number;
  odHeight?: number;
  odAddition?: number;
  oeSphrical?: number;
  oeCylindrical?: number;
  oeAxis?: number;
  oeDnp?: number;
  oeHeight?: number;
  oeAddition?: number;
  lensType?: LensType;
  treatments?: LensTreatment[];
  notes?: string;
  isExpired: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  contactName?: string;
  contactRole?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  category?: string;
  paymentTerms?: string;
  notes?: string;
  isDeleted: boolean;
  products?: Product[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  type: ProductCategoryType;
  defaultMarkup: number;
  isDeleted: boolean;
  products?: Product[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  category?: ProductCategory;
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  material?: string;
  supplierId?: string;
  supplier?: Supplier;
  barcode?: string;
  photo?: string;
  stock: number;
  minStock: number;
  costPrice: number;
  taxFreight: number;
  totalCost: number;
  desiredMarkup: number;
  suggestedPrice: number;
  minimumPrice: number;
  sellingPrice: number;
  marginPercent: number;
  profitAmount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: number;
  customerId: string;
  customer?: Customer;
  prescriptionId?: string;
  prescription?: Prescription;
  sellerId: string;
  seller?: User;
  date: string;
  subtotal: number;
  discountPercent?: number;
  discountAmount: number;
  total: number;
  estimatedProfit: number;
  status: SalesOrderStatus;
  cancelReason?: string;
  notes?: string;
  items?: SalesOrderItem[];
  payments?: Payment[];
  lensOrders?: LensOrder[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  productId?: string;
  product?: Product;
  description?: string;
  unitPrice: number;
  quantity: number;
  discountPercent?: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  salesOrderId: string;
  method: PaymentMethod;
  amount: number;
  installmentCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  installments?: Installment[];
}

export interface Installment {
  id: string;
  paymentId: string;
  number: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  status: InstallmentStatus;
  notes?: string;
  // Joined fields (from backend queries)
  customerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillToPay {
  id: string;
  description: string;
  categoryId?: string;
  category?: BillCategory;
  supplierId?: string;
  supplier?: Supplier;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  status: BillStatus;
  isRecurring: boolean;
  frequency?: BillFrequency;
  parentBillId?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CashRegister {
  id: string;
  openedById: string;
  openedBy?: User;
  closedById?: string;
  closedBy?: User;
  date: string;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  difference?: number;
  isClosed: boolean;
  notes?: string;
  movements?: CashMovement[];
  createdAt: string;
  updatedAt: string;
}

export interface CashMovement {
  id: string;
  cashRegisterId: string;
  type: CashMovementType;
  amount: number;
  description?: string;
  salesOrderId?: string;
  userId: string;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Laboratory {
  id: string;
  name: string;
  cnpj?: string;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  terms?: string;
  isDeleted: boolean;
  lensOrders?: LensOrder[];
  createdAt: string;
  updatedAt: string;
}

export interface LensOrder {
  id: string;
  salesOrderId: string;
  salesOrder?: SalesOrder;
  laboratoryId: string;
  laboratory?: Laboratory;
  status: LensOrderStatus;
  lensType?: LensType;
  treatments?: LensTreatment[];
  odSpherical?: number;
  odCylindrical?: number;
  odAxis?: number;
  odDnp?: number;
  odHeight?: number;
  odAddition?: number;
  oeSphrical?: number;
  oeCylindrical?: number;
  oeAxis?: number;
  oeDnp?: number;
  oeHeight?: number;
  oeAddition?: number;
  notes?: string;
  sentAt?: string;
  receivedAt?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

// =====================
// API Response Types
// =====================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =====================
// Dashboard Types
// =====================

export interface DashboardKPIs {
  dailySales: number;
  monthlySales: number;
  monthlyProfit: number;
  totalOrders: number;
  averageTicket: number;
  lowStockCount: number;
  upcomingBills: number;
  overdueInstallments: number;
  salesCount?: number;
  estimatedProfit?: number;
  upcomingPayables?: number;
}

export interface SalesChartData {
  date: string;
  label?: string;
  total: number;
  count: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  name?: string;
  category: string;
  totalSold: number;
  totalRevenue: number;
}

// =====================
// Filter / Form Types
// =====================

export interface SalesFilters {
  startDate?: string;
  endDate?: string;
  status?: SalesOrderStatus;
  sellerId?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  category?: string;
  brand?: string;
  supplierId?: string;
  isActive?: boolean;
  lowStock?: boolean;
  stockStatus?: string;
  page?: number;
  limit?: number;
  pageSize?: number;
}

export interface BillFilters {
  startDate?: string;
  endDate?: string;
  status?: BillStatus;
  categoryId?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  groupBy?: "day" | "week" | "month";
  sellerId?: string;
  categoryId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: string;
}
