import type { FixedColumn, FixedColumnKey } from "./types";

export const START_DATE = new Date(2026, 3, 23);
export const DATE_COLUMN_WIDTH = 102;
export const MONTH_COLUMN_WIDTH = 124;
export const TOTAL_COLUMN_WIDTH = 118;
export const DATA_ROW_HEIGHT = 37;
export const DATA_VISIBLE_ROWS = 10;

export const FIXED_COLUMNS: FixedColumn[] = [
  { key: "orderCode", label: "M? ??n h?ng", width: 154, left: 0 },
  { key: "productCode", label: "M? s?n ph?m", width: 154, left: 154 },
  { key: "term", label: "Th?i h?n", width: 116, left: 308 },
  { key: "startDate", label: "Ng?y b?t ??u", width: 136, left: 424 },
  { key: "amount", label: "S? ti?n", width: 142, left: 560 },
  { key: "slot", label: "Slot", width: 96, left: 702 },
];

export const LAST_FIXED_COLUMN_KEY: FixedColumnKey = "slot";
export const FIXED_COLUMNS_WIDTH = FIXED_COLUMNS.reduce(
  (total, column) => total + column.width,
  0
);

export const SLOT_COLUMN = FIXED_COLUMNS.find((c) => c.key === "slot")!;
export const FIXED_MERGE_COLUMNS = FIXED_COLUMNS.filter((c) => c.key !== "slot");

export const totalColCell =
  "sticky right-0 z-[45] border-l-2 border-sky-500/35 bg-[#020617] text-sky-100 shadow-[-12px_0_24px_-12px_rgba(56,189,248,0.12)] transition-colors group-hover:bg-slate-900";
export const totalColHead =
  "sticky right-0 z-[100] border-l-2 border-sky-400/40 bg-[#020617] text-sky-100 shadow-[-12px_0_28px_-12px_rgba(56,189,248,0.18)]";
export const totalColFoot =
  "sticky right-0 z-[78] border-l-2 border-sky-400/40 bg-[#020617] text-sky-50 shadow-[-12px_0_28px_-12px_rgba(56,189,248,0.15)]";
