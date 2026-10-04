export interface WarehouseServiceSlot {
  id: number;
  display_name: string;
  category: string;
  password?: string;
  backup_email?: string;
  two_fa?: string;
  expires_at?: string;
  note?: string;
  status: "AVAILABLE" | "IN_USE" | "EXPIRED" | "RESERVED";
}

export interface WarehouseAccountItem {
  id: number;
  account: string;
  created_at: string;
  updated_at: string;
  services: WarehouseServiceSlot[];
}

export interface ServiceNameCategoryItem {
  id: number;
  name: string;
  category: string;
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
}
