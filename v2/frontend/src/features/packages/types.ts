export interface SlotAssignment {
  slotNumber: number;
  orderCode?: string;
  customerName?: string;
  customerContact?: string;
  slotLabel?: string;
}

export interface PackageItem {
  id: number;
  category: string;
  name: string;
  accountInfo: string;
  storageAccountInfo?: string | null;
  storageTotal?: string | null;
  requiresStorage?: boolean;
  usedSlots: number;
  totalSlots: number;
  supplier: string;
  costPrice: number;
  expiredAt: string;
  note: string;
  matchRule?: "information" | "slot" | "both";
  status: "active" | "warning" | "expired";
  slotAssignments?: SlotAssignment[];
}

export interface CategorySummary {
  name: string;
  total: number;
  low: number;
  out: number;
  requiresStorage?: boolean;
}

export interface PackageFormData {
  name: string;
  category?: string;
  accountInfo: string;
  storageAccountInfo?: string;
  storageTotal?: string;
  usedSlots?: number;
  totalSlots: number;
  supplier: string;
  costPrice: number;
  expiredAt: string;
  note: string;
  matchRule?: "information" | "slot" | "both";
}

export interface PackageCategory {
  id: number;
  name: string;
  isPackage: boolean;
  requiresStorage?: boolean;
  packageNote?: string;
  serviceNote?: string;
}
