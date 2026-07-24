import { PeriodColumn } from "@/shared/date/dateRanges";

export type ViewMode = "day" | "month";
export type FixedColumnKey =
  | "productCode"
  | "informationOrder"
  | "term"
  | "startDate"
  | "amount"
  | "slot";

export type FixedColumn = {
  key: FixedColumnKey;
  label: string;
  width: number;
  left: number;
};

export type { PeriodColumn };

export type OrderListRow = {
  id?: number;
  id_order?: string;
  id_product?: string | number | null;
  product_display_name?: string;
  variant_id?: string | null;
  variant_name?: string | null;
  information_order?: string | null;
  customer?: string | null;
  line_product_id?: number | string | null;
  lineProductId?: number | string | null;
  days?: number | string | null;
  registration_date?: string | null;
  registration_date_str?: string;
  registration_date_display?: string;
  cost?: number | string | null;
  created_at?: string | null;
  created_at_raw?: string | null;
  slot?: string | number | null;
};

export type ExpenseFormRow = {
  key: string;
  orderCode: string;
  productCode: string;
  informationOrder: string;
  term: string;
  startDate: string;
  slotLabel: string;
  slotStartYmd?: string | null;
  slotEndYmd?: string | null;
  totalCost: number;
  termDays: number;
  startDateYmd: string;
  endDateYmd?: string | null;
  isUnmatched?: boolean;
  subRows?: ExpenseFormRow[];
};
