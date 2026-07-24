import type { FixedColumn, FixedColumnKey } from "./types";

export const START_DATE = new Date(2026, 3, 23);
export const DATE_COLUMN_WIDTH = 102;
export const MONTH_COLUMN_WIDTH = 124;
export const TOTAL_COLUMN_WIDTH = 118;
export const DATA_ROW_HEIGHT = 37;
export const DATA_VISIBLE_ROWS = 10;

export const FIXED_COLUMNS: FixedColumn[] = [
  { key: "productCode", label: "TÊN SẢN PHẨM", width: 140, left: 0 },
  { key: "informationOrder", label: "THÔNG TIN", width: 150, left: 140 },
  { key: "term", label: "THỜI HẠN", width: 100, left: 290 },
  { key: "startDate", label: "NGÀY BẮT ĐẦU", width: 100, left: 390 },
  { key: "amount", label: "SỐ TIỀN", width: 120, left: 490 },
  { key: "slot", label: "SLOT", width: 100, left: 610 },
];

export const LAST_FIXED_COLUMN_KEY: FixedColumnKey = "slot";
export const FIXED_COLUMNS_WIDTH = FIXED_COLUMNS.reduce(
  (total, column) => total + column.width,
  0
);

export const SLOT_COLUMN = FIXED_COLUMNS.find((c) => c.key === "slot")!;
export const FIXED_MERGE_COLUMNS = FIXED_COLUMNS.filter((c) => c.key !== "slot");

export const totalColCell =
  "sticky right-0 z-[45] border-l border-sky-400/20 bg-[#080E21] text-sky-100 shadow-[-15px_0_25px_-12px_rgba(0,0,0,0.8)] transition-colors group-hover:bg-[#0A1024]";
export const totalColHead =
  "sticky right-0 z-[100] border-l border-sky-400/20 bg-[#060B1C] text-sky-100 shadow-[-15px_0_25px_-12px_rgba(0,0,0,0.9)]";
export const totalColFoot =
  "sticky right-0 z-[78] border-l border-sky-400/20 bg-[#0A1024] text-sky-50 shadow-[-15px_0_25px_-12px_rgba(0,0,0,0.9)]";
