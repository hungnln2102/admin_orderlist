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
  usedSlots: number;
  totalSlots: number;
  supplier: string;
  costPrice: number;
  expiredAt: string;
  note: string;
  status: "active" | "warning" | "expired";
  slotAssignments?: SlotAssignment[];
}

export interface CategorySummary {
  name: string;
  total: number;
  low: number;
  out: number;
}

export interface PackageFormData {
  name: string;
  accountInfo: string;
  usedSlots: number;
  totalSlots: number;
  supplier: string;
  costPrice: number;
  expiredAt: string;
  note: string;
}
