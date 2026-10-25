export interface SlotAssignment {
  slotNumber: number;
  orderCode?: string;
  customerName?: string;
  customerContact?: string;
  slotLabel?: string;
  capacity?: number | null;
}

export interface PackageItem {
  id: number;
  category: string;
  name: string;
  accountInfo: string;
  password?: string | null;
  twoFa?: string | null;
  backupEmail?: string | null;
  storageAccountInfo?: string | null;
  storagePassword?: string | null;
  storageTwoFa?: string | null;
  storageBackupEmail?: string | null;
  storageTotal?: string | null;
  requiresStorage?: boolean;
  usedSlots: number;
  totalSlots: number;
  capacityLimit?: number | null;
  capacityUsed?: number | null;
  remainingCapacity?: number | null;
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
