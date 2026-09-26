import api from "./api";
import type { ApiResponse, LensTreatment, LensType, Prescription } from "@/types";

/**
 * Corpo aceito pelo Zod do backend (prescriptionController.createSchema).
 * Atenção: o campo do esférico do olho esquerdo é `oeSphrical` (grafia do schema Prisma).
 */
export interface PrescriptionPayload {
  customerId: string;
  date: string; // ISO
  validity: string; // ISO
  doctor?: string | null;
  doctorCrm?: string | null;
  file?: string | null;
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
  lensType?: LensType | null;
  treatments?: LensTreatment[];
  notes?: string | null;
}

export type PrescriptionFilter = "all" | "expiring" | "expired";

export const prescriptionService = {
  async list(params: { search?: string; filter?: PrescriptionFilter } = {}): Promise<Prescription[]> {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.filter === "expiring") qs.set("expiring", "true");
    if (params.filter === "expired") qs.set("expired", "true");
    const q = qs.toString();
    const res = await api.get<ApiResponse<Prescription[]>>(`/prescriptions${q ? `?${q}` : ""}`);
    return res.data ?? [];
  },

  async listByCustomer(customerId: string): Promise<Prescription[]> {
    const res = await api.get<ApiResponse<Prescription[]>>(`/prescriptions/customer/${customerId}`);
    return res.data ?? [];
  },

  async getById(id: string): Promise<Prescription> {
    const res = await api.get<ApiResponse<Prescription>>(`/prescriptions/${id}`);
    return res.data;
  },

  async create(data: PrescriptionPayload): Promise<Prescription> {
    const res = await api.post<ApiResponse<Prescription>>("/prescriptions", data);
    return res.data;
  },

  async update(id: string, data: Partial<PrescriptionPayload>): Promise<Prescription> {
    const res = await api.put<ApiResponse<Prescription>>(`/prescriptions/${id}`, data);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/prescriptions/${id}`);
  },
};

/* ── Helpers de exibição compartilhados ─────────────────── */

export const LENS_TYPE_LABELS: Record<LensType, string> = {
  SINGLE_VISION: "Visão simples",
  BIFOCAL: "Bifocal",
  MULTIFOCAL: "Multifocal / progressiva",
} as Record<LensType, string>;

export const TREATMENT_LABELS: Record<LensTreatment, string> = {
  ANTIREFLECTIVE: "Antirreflexo",
  PHOTOCHROMIC: "Fotossensível",
  BLUE_LIGHT: "Filtro de luz azul",
  TRANSITIONS: "Transitions",
} as Record<LensTreatment, string>;

export type ValidityState = "valid" | "expiring" | "expired";

const DAY = 24 * 60 * 60 * 1000;

export function daysUntil(date: string | Date): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY);
}

export function getValidity(validity: string, soonDays = 30): { state: ValidityState; days: number } {
  const days = daysUntil(validity);
  if (days < 0) return { state: "expired", days };
  if (days <= soonDays) return { state: "expiring", days };
  return { state: "valid", days };
}

export function validityLabel(validity: string): string {
  const { state, days } = getValidity(validity);
  if (state === "expired") return days === -1 ? "Venceu ontem" : `Vencida há ${Math.abs(days)} dias`;
  if (state === "expiring") return days === 0 ? "Vence hoje" : days === 1 ? "Vence amanhã" : `Vence em ${days} dias`;
  return "Válida";
}

/** Grau com sinal: +1,25 / -0,50 / plano. */
export function formatDiopter(v?: number | null): string {
  if (v === null || v === undefined) return "—";
  if (v === 0) return "Plano";
  const s = Math.abs(v).toFixed(2).replace(".", ",");
  return `${v > 0 ? "+" : "−"}${s}`;
}

export function formatMm(v?: number | null): string {
  if (v === null || v === undefined) return "—";
  return `${String(v).replace(".", ",")} mm`;
}

export function formatAxis(v?: number | null): string {
  if (v === null || v === undefined) return "—";
  return `${v}°`;
}

export default prescriptionService;
