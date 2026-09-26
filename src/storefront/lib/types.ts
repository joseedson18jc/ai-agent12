export type CategoryType =
  | "FRAMES_PRESCRIPTION"
  | "FRAMES_SUN"
  | "OPHTHALMIC_LENSES"
  | "CONTACT_LENSES"
  | "SUNGLASSES_READY"
  | "ACCESSORIES";

export interface StoreInfo {
  name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  logo: string | null;
  openingHours: string | null;
  siteHeadline: string | null;
}

export interface PublicCategory {
  id: string;
  name: string;
  type: CategoryType;
  productCount: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  size: string | null;
  material: string | null;
  photo: string | null;
  description: string | null;
  sellingPrice: number;
  inStock: boolean;
  lowStock: boolean;
  createdAt: string;
  category: { id: string; name: string; type: CategoryType };
}

export interface ProductListResponse {
  success: boolean;
  data: Product[];
  pagination: { page: number; limit: number; total: number };
  facets: { brands: string[]; minPrice: number; maxPrice: number };
}

export type LeadType = "RESERVATION" | "APPOINTMENT" | "CONTACT";

export interface LeadPayload {
  type: LeadType;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  preferredDate?: string;
  preferredTime?: string;
  service?: string;
  items?: { productId: string; quantity: number }[];
  website?: string;
}

export interface LeadResult {
  id: string;
  type: LeadType;
  total?: number | null;
  items?: { productId: string; name: string; quantity: number; unitPrice: number }[];
}
