export type WarehouseService = {
  id?: number;
  stock_id?: number;
  product_id?: number | string | null;
  warehouse_product_name_id?: number | string | null;
  category?: string | null;
  display_name?: string | null;
  variant_name?: string | null;
  password?: string | null;
  backup_email?: string | null;
  two_fa?: string | null;
  status?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type WarehouseItem = {
  id?: number;
  account?: string | null;
  note?: string | null;
  status?: string | null;
  is_verified?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  services?: WarehouseService[];

  // Legacy fields for UI compatibility if needed during transition
  category?: string | null;
  password?: string | null;
  backup_email?: string | null;
  two_fa?: string | null;
  expires_at?: string | null;
};

export const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60";

export const normalizeText = (value: unknown) =>
  (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const getWarehouseServiceDisplayName = (service?: WarehouseService | null) =>
  String(service?.display_name || service?.category || "").trim();
