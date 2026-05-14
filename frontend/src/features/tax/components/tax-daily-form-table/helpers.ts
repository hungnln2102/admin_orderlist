import type { TaxOrder } from "../../api/taxApi";
import type {
  FixedColumn,
  PeriodColumn,
  TaxFormRow,
  TaxMetric,
} from "./types";

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

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const buildDateColumns = (): PeriodColumn[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(TAX_START_DATE);
  start.setHours(0, 0, 0, 0);

  if (today < start) {
    return [];
  }

  const columns: PeriodColumn[] = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    columns.push({
      key: getDateKey(cursor),
      label: `${cursor.getDate()}/${cursor.getMonth() + 1}`,
      year: cursor.getFullYear(),
      startKey: getDateKey(cursor),
      endKey: getDateKey(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return columns;
};

export const buildMonthColumns = (): PeriodColumn[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(TAX_START_DATE);
  start.setHours(0, 0, 0, 0);

  if (today < start) {
    return [];
  }

  const columns: PeriodColumn[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= today) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const effectiveStart = monthStart < start ? start : monthStart;
    const effectiveEnd = monthEnd > today ? today : monthEnd;

    columns.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: `${month + 1}/${year}`,
      year,
      startKey: getDateKey(effectiveStart),
      endKey: getDateKey(effectiveEnd),
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return columns;
};

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

const addDays = (ymd: string, days: number) => {
  const [year, month, day] = ymd.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const countDaysInclusive = (from: string, to: string) => {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  if (![fy, fm, fd, ty, tm, td].every(Number.isFinite)) return 0;
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  if (end < start) return 0;
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
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

  const endDate = addDays(row.startDate, row.termDays - 1);
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
