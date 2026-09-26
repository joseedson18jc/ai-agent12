import api from "./api";
import type { ApiEnvelope } from "./financial.service";

/* Configurações da loja (/settings) e usuários (/users, admin only). */

export interface StoreSettings {
  id: string;
  name: string;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  logo?: string | null;
  defaultMarkup: number;
  billAlertDays: number;
  prescriptionAlertDays: number;
  defaultMinStock: number;
  printerType: string;
  whatsapp?: string | null;
  instagram?: string | null;
  openingHours?: string | null;
  siteHeadline?: string | null;
  updatedAt?: string;
}

/** Backend zod: strings optional (no null), numbers must be numbers; billAlertDays/prescriptionAlertDays >= 1. */
export type StoreSettingsPayload = Partial<{
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  logo: string;
  defaultMarkup: number;
  billAlertDays: number;
  prescriptionAlertDays: number;
  defaultMinStock: number;
  printerType: string;
  whatsapp: string;
  instagram: string;
  openingHours: string;
  siteHeadline: string;
}>;

export type UserRoleCode = "ADMIN" | "SELLER" | "VIEWER";

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRoleCode;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
}

export const settingsService = {
  get(): Promise<ApiEnvelope<StoreSettings>> {
    return api.get("/settings");
  },
  update(data: StoreSettingsPayload): Promise<ApiEnvelope<StoreSettings>> {
    return api.put("/settings", data);
  },
};

export const userService = {
  list(limit = 100): Promise<ApiEnvelope<SystemUser[]>> {
    return api.get(`/users?limit=${limit}`);
  },
  create(data: { name: string; email: string; password: string; role: UserRoleCode }): Promise<ApiEnvelope<SystemUser>> {
    return api.post("/users", data);
  },
  /** Also used to reset a password (send `password`) and to (de)activate (send `isActive`). */
  update(
    id: string,
    data: Partial<{ name: string; email: string; password: string; role: UserRoleCode; isActive: boolean }>,
  ): Promise<ApiEnvelope<SystemUser>> {
    return api.put(`/users/${id}`, data);
  },
};

export default settingsService;
