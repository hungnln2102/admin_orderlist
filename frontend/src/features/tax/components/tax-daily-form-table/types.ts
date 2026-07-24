import type { TaxOrder } from "../../api/taxApi";

export type FixedColumnKey = "orderCode" | "productCode" | "term" | "startDate" | "amount";

export type FixedColumn = {
  key: FixedColumnKey;
  label: string;
  width: number;
  left: number;
};

import { PeriodColumn } from "../../../../shared/date/dateRanges";

export type TaxViewMode = "day" | "month";
export type TaxMetric = "revenue" | "profit" | "refund" | "expense";

export type { PeriodColumn };

export type TaxFormRow = {
  id: string;
  orderCode: string;
  productCode: string;
  term: string;
  termDays: number;
  startDate: string;
  refundDate: string;
  status: string;
  price: number;
  cost: number;
  refund: number;
  subRows?: TaxFormRow[];
};

export type TaxDailyFormTableProps = {
  orders: TaxOrder[];
  loading: boolean;
  error: string | null;
  viewMode: TaxViewMode;
  onViewModeChange: (viewMode: TaxViewMode) => void;
  metric: TaxMetric;
};
