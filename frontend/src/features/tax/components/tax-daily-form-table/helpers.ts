import type { TaxOrder } from "../../api/taxApi";
import type {
  FixedColumn,
  PeriodColumn,
  TaxFormRow,
  TaxMetric,
} from "./types";
import {
  addDaysUtc,
  buildDateColumns,
  buildMonthColumns,
  countDaysInclusive,
} from "@/shared/date/dateRanges";

const TAX_START_DATE = new Date(2026, 3, 22);

export const FIXED_COLUMNS: FixedColumn[] = [
  { key: "orderCode", label: "Mã Đơn Hàng", width: 154, left: 0 },
  { key: "productCode", label: "Mã Sản Phẩm", width: 154, left: 154 },
  { key: "term", label: "Thời hạn", width: 116, left: 308 },
  { key: "startDate", label: "Ngày bắt đầu", width: 136, left: 424 },
  { key: "amount", label: "Số tiền", width: 142, left: 560 },
];

export const DATE_COLUMN_WIDTH = 102;
export const REMAINING_COLUMN_WIDTH = 136;
export const DATA_ROW_HEIGHT = 37;
export const DATA_VISIBLE_ROWS = 10;
export const FIXED_COLUMNS_WIDTH = FIXED_COLUMNS.reduce(
  (total, column) => total + column.width,
  0
);

const moneyFormatter = new Intl.NumberFormat("vi-VN");
export const formatMoney = (value: number) =>
  `${moneyFormatter.format(Math.round(value))} đ`;

export { buildDateColumns, buildMonthColumns };

const normalizeYmd = (value: string | null | undefined) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : String(value);
};

export const isRefundedStatus = (status: string) => {
  const normalized = status.trim().toLowerCase();
  return normalized === "đã hoàn" || normalized === "da hoan" || normalized === "refunded";
};

const formatTerm = (days: TaxOrder["days"]) => {
  const value = Number(days);
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  return `${value} ngày`;
};

const toMoneyNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toTermDays = (days: TaxOrder["days"]) => {
  const value = Number(days);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export const getMetricAmount = (row: TaxFormRow, metric: TaxMetric) => {
  if (metric === "profit") {
    return row.price - row.cost;
  }
  if (metric === "refund") {
    return row.refund;
  }
  return row.price;
};

export const isDateInPeriod = (dateKey: string, column: PeriodColumn) =>
  Boolean(dateKey) && dateKey >= column.startKey && dateKey <= column.endKey;

export const getPeriodAmount = (
  row: TaxFormRow,
  column: PeriodColumn,
  metric: TaxMetric
) => {
  const amount = getMetricAmount(row, metric);

  if (metric === "refund") {
    if (!isRefundedStatus(row.status) || amount <= 0 || !row.refundDate) {
      return null;
    }
    return isDateInPeriod(row.refundDate, column) ? amount : null;
  }

  if (!row.startDate || row.termDays <= 0 || amount === 0) {
    return null;
  }

  const endDate = addDaysUtc(row.startDate, row.termDays - 1);
  if (!endDate) {
    return null;
  }

  const overlapStart = column.startKey > row.startDate ? column.startKey : row.startDate;
  const overlapEnd = column.endKey < endDate ? column.endKey : endDate;
  const daysInPeriod = countDaysInclusive(overlapStart, overlapEnd);

  if (daysInPeriod <= 0) {
    return null;
  }

  return (amount / row.termDays) * daysInPeriod;
};

export const getAllocatedAmount = (
  row: TaxFormRow,
  columns: PeriodColumn[],
  metric: TaxMetric
) =>
  columns.reduce((sum, column) => {
    const periodAmount = getPeriodAmount(row, column, metric);
    return sum + (periodAmount ?? 0);
  }, 0);

export const getRemainingAmount = (
  row: TaxFormRow,
  columns: PeriodColumn[],
  metric: TaxMetric
) => {
  const amount = getMetricAmount(row, metric);
  const remaining = amount - getAllocatedAmount(row, columns, metric);
  return amount >= 0 ? Math.max(0, remaining) : remaining;
};

export const formatRemaining = (
  row: TaxFormRow,
  columns: PeriodColumn[],
  metric: TaxMetric
) => {
  const amount = getMetricAmount(row, metric);
  const allocated = getAllocatedAmount(row, columns, metric);
  if (!amount && !allocated) return "";
  return formatMoney(getRemainingAmount(row, columns, metric));
};

export const toTaxFormRows = (orders: TaxOrder[]): TaxFormRow[] =>
  orders.map((order) => {
    const rowId = String(order.id);
    const termDays = toTermDays(order.days);
    return {
      id: rowId,
      orderCode: order.id_order ?? "",
      productCode: order.product_display_name || order.id_product || "",
      term: formatTerm(order.days),
      termDays,
      startDate: normalizeYmd(order.registration_date || order.order_date),
      refundDate: normalizeYmd(order.canceled_at),
      status: String(order.status || ""),
      price: toMoneyNumber(order.price),
      cost: toMoneyNumber(order.cost),
      refund: toMoneyNumber(order.refund),
    };
  });
