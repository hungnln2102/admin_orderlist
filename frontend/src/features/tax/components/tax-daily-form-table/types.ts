import type { TaxOrder } from "../../api/taxApi";

export type FixedColumnKey = "orderCode" | "productCode" | "term" | "startDate" | "amount";

export type FixedColumn = {
  key: FixedColumnKey;
  label: string;
  width: number;
  left: number;
};

export type TaxViewMode = "day" | "month";
export type TaxMetric = "revenue" | "profit" | "refund";

export type PeriodColumn = {
  key: string;
  label: string;
  year: number;
  startKey: string;
  endKey: string;
};

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
};

export type TaxDailyFormTableProps = {
  orders: TaxOrder[];
  loading: boolean;
  error: string | null;
  viewMode: TaxViewMode;
  onViewModeChange: (viewMode: TaxViewMode) => void;
  metric: TaxMetric;
};
