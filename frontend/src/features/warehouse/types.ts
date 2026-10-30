export type WarehouseSlotStatus =
  | "AVAILABLE"
  | "IN_USE"
  | "EXPIRED"
  | "RESERVED"
  | "UNAVAILABLE";

export interface WarehouseServiceSlot {
  id: number;
  display_name: string;
  category: string;
  login_url?: string;
  password?: string;
  backup_email?: string;
  two_fa?: string;
  expires_at?: string;
  raw_expires_at?: string;
  note?: string;
  is_authenticated?: boolean;
  session_checked_at?: string | null;
  status: WarehouseSlotStatus;
}

export interface WarehouseSlotEditFormData {
  accountUsername: string;
  serviceName: string;
  password: string;
  backupEmail: string;
  twoFa: string;
  expiresAt: string;
  status: WarehouseSlotStatus;
  note: string;
}

export interface WarehouseAccountItem {
  id: number;
  account: string;
  created_at: string;
  updated_at: string;
  services: WarehouseServiceSlot[];
}

export interface SystemProduct {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface ServiceNameCategoryItem {
  id: number;
  name: string;
  category: string;
  loginUrl?: string | null;
  productId?: number | null;
  systemProductName?: string | null;
  totalSlots?: number;
  inStockSlots: number;
  reservedSlots: number;
  status: "ACTIVE" | "LOW_STOCK" | "OUT_OF_STOCK";
}

export interface WarehouseAccountFormData {
  account: string;
  serviceName: string;
  category: string;
  password: string;
  backupEmail: string;
  twoFa: string;
  expiresAt: string;
  note: string;
}

export interface CatalogFormData {
  name: string;
  category: string;
  productId?: number | null;
  loginUrl?: string;
}

export interface CatalogEditFormData {
  id: number;
  name: string;
  category: string;
  productId?: number | null;
  loginUrl: string;
}

export interface WarehouseAddServiceFormData {
  serviceName: string;
  category: string;
  password: string;
  backupEmail: string;
  twoFa: string;
  expiresAt: string;
  status: WarehouseSlotStatus;
  note: string;
}
