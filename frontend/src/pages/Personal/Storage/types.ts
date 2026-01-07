export type WarehouseItem = {
  id?: number;
  category?: string | null;
  account?: string | null;
  password?: string | null;
  backup_email?: string | null;
  two_fa?: string | null;
  note?: string | null;
  status?: string | null;
  created_at?: string | null;
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
