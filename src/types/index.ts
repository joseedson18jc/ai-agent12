// =====================
// Enums
// =====================

export enum UserRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  SELLER = "SELLER",
  CASHIER = "CASHIER",
}

export enum CustomerStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BLOCKED = "BLOCKED",
}

export enum LensType {
  SINGLE_VISION = "SINGLE_VISION",
  BIFOCAL = "BIFOCAL",
  PROGRESSIVE = "PROGRESSIVE",
  OCCUPATIONAL = "OCCUPATIONAL",
}

export enum LensTreatment {
  ANTI_REFLECTIVE = "ANTI_REFLECTIVE",
  PHOTOCHROMIC = "PHOTOCHROMIC",
  BLUE_LIGHT = "BLUE_LIGHT",
  POLARIZED = "POLARIZED",
  UV_PROTECTION = "UV_PROTECTION",
}

export enum ProductCategoryType {
  FRAME = "FRAME",
  LENS = "LENS",
  CONTACT_LENS = "CONTACT_LENS",
  SUNGLASSES = "SUNGLASSES",
  ACCESSORY = "ACCESSORY",
  SERVICE = "SERVICE",
}

export enum SalesOrderStatus {
  QUOTE = "QUOTE",
  PENDING = "PENDING",
  IN_PRODUCTION = "IN_PRODUCTION",
  READY = "READY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export enum PaymentMethod {
  CASH = "CASH",
  CREDIT_CARD = "CREDIT_CARD",
  DEBIT_CARD = "DEBIT_CARD",
  PIX = "PIX",
  BANK_SLIP = "BANK_SLIP",
  CHECK = "CHECK",
  PROMISSORY = "PROMISSORY",
  INSTALLMENT = "INSTALLMENT",
}

export enum InstallmentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

export enum BillStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

export enum BillFrequency {
  ONE_TIME = "ONE_TIME",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  YEARLY = "YEARLY",
}

export enum CashMovementType {
  OPENING = "OPENING",
  SALE = "SALE",
  WITHDRAWAL = "WITHDRAWAL",
  DEPOSIT = "DEPOSIT",
  ADJUSTMENT = "ADJUSTMENT",
  CLOSING = "CLOSING",
}

export enum LensOrderStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  IN_PRODUCTION = "IN_PRODUCTION",
  READY = "READY",
  RECEIVED = "RECEIVED",
  CANCELLED = "CANCELLED",
}

// =====================
// Models
// =====================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  storeId: string;
  store?: Store;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  id: string;
  name: string;
  cnpj: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  cpf?: string;
  rg?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  birthDate?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  status: CustomerStatus;
  storeId: string;
  prescriptions?: Prescription[];
  salesOrders?: SalesOrder[];
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  customerId: string;
  customer?: Customer;
  doctorName?: string;
  doctorCRM?: string;
  prescriptionDate: string;
  expirationDate?: string;
  // Olho direito (OD)
  odSpherical?: number;
  odCylindrical?: number;
  odAxis?: number;
  odAddition?: number;
  odPd?: number;
  odHeight?: number;
  // Olho esquerdo (OE)
  oeSpherical?: number;
  oeCylindrical?: number;
  oeAxis?: number;
  oeAddition?: number;
  oePd?: number;
  oeHeight?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  isActive: boolean;
  storeId: string;
  products?: Product[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  type: ProductCategoryType;
  description?: string;
  storeId: string;
  products?: Product[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryId: string;
  category?: ProductCategory;
  supplierId?: string;
  supplier?: Supplier;
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  material?: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
  currentStock: number;
  isActive: boolean;
  storeId: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: Customer;
  sellerId: string;
  seller?: User;
  prescriptionId?: string;
  prescription?: Prescription;
  status: SalesOrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string;
  deliveryDate?: string;
  cancelReason?: string;
  items?: SalesOrderItem[];
  payments?: Payment[];
  lensOrders?: LensOrder[];
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  salesOrder?: SalesOrder;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  lensType?: LensType;
  lensTreatments?: LensTreatment[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  salesOrderId: string;
  salesOrder?: SalesOrder;
  method: PaymentMethod;
  amount: number;
  paidAt?: string;
  installmentCount?: number;
  installments?: Installment[];
  notes?: string;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Installment {
  id: string;
  paymentId: string;
  payment?: Payment;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidAt?: string;
  paidAmount?: number;
  status: InstallmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillCategory {
  id: string;
  name: string;
  description?: string;
  storeId: string;
  bills?: BillToPay[];
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
  paidAt?: string;
  paidAmount?: number;
  status: BillStatus;
  frequency: BillFrequency;
  notes?: string;
  documentNumber?: string;
  barcode?: string;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashRegister {
  id: string;
  openedById: string;
  openedBy?: User;
  closedById?: string;
  closedBy?: User;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  difference?: number;
  openedAt: string;
  closedAt?: string;
  notes?: string;
  movements?: CashMovement[];
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashMovement {
  id: string;
  cashRegisterId: string;
  cashRegister?: CashRegister;
  type: CashMovementType;
  amount: number;
  description: string;
  salesOrderId?: string;
  salesOrder?: SalesOrder;
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
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  isActive: boolean;
  storeId: string;
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
  lensType: LensType;
  treatments?: LensTreatment[];
  // OD
  odSpherical?: number;
  odCylindrical?: number;
  odAxis?: number;
  odAddition?: number;
  odPd?: number;
  odHeight?: number;
  // OE
  oeSpherical?: number;
  oeCylindrical?: number;
  oeAxis?: number;
  oeAddition?: number;
  oePd?: number;
  oeHeight?: number;
  notes?: string;
  sentAt?: string;
  receivedAt?: string;
  estimatedDelivery?: string;
  storeId: string;
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
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  storeId: string;
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
  totalSalesToday: number;
  totalSalesMonth: number;
  totalCustomers: number;
  pendingOrders: number;
  overdueBills: number;
  overdueInstallments: number;
  lowStockProducts: number;
  pendingLensOrders: number;
  averageTicket: number;
  conversionRate: number;
}

export interface SalesChartData {
  date: string;
  total: number;
  count: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
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
  supplierId?: string;
  isActive?: boolean;
  lowStock?: boolean;
  page?: number;
  limit?: number;
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
  storeName: string;
  storeCnpj: string;
}
