export interface PackageFinancialItem {
  id: number;
  name: string;
  category: string;
  accountInfo?: string;
  totalSlots: number;
  usedSlots: number;
  costPrice: number;
  expiredAt: string | null;
  supplier: string;
  importOrderCode?: string;
  costPerSlotDay?: number;
  todayVacantCost?: number;
  totalAccumulatedVacantCost?: number;
  status: "active" | "warning" | "expired";
}

export interface SlotDailyLogItem {
  id: number;
  log_date: string;
  package_product_id: number;
  package_name: string;
  import_order_id: number;
  import_order_code: string;
  account_username: string;
  total_slots: number;
  occupied_slots: number;
  vacant_slots: number;
  cost_per_slot_day: number;
  vacant_cost: number;
  note: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}
