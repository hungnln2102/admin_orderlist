import type { TaxOrder } from "../api/taxApi";
import type { TaxViewMode } from "../components/TaxDailyFormTable";

type PeriodColumn = {
  startKey: string;
  endKey: string;
};

const TAX_START_DATE = new Date(2026, 3, 22);

export function toMoneyNumber(value: TaxOrder["price"] | TaxOrder["cost"] | unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDateColumns = (): PeriodColumn[] => {
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
    const key = getDateKey(cursor);
    columns.push({ startKey: key, endKey: key });
    cursor.setDate(cursor.getDate() + 1);
  }

  return columns;
};

const buildMonthColumns = (): PeriodColumn[] => {
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

const isRefundedStatus = (status: string | null | undefined) => {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "đã hoàn" || normalized === "da hoan" || normalized === "refunded";
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

const getAllocatedAmount = (
  amount: number,
  startDate: string,
  termDays: number,
  columns: PeriodColumn[]
) => {
  if (!startDate || termDays <= 0 || amount <= 0) {
    return 0;
  }

  const endDate = addDays(startDate, termDays - 1);
  if (!endDate) {
    return 0;
  }

  return columns.reduce((sum, column) => {
    const overlapStart = column.startKey > startDate ? column.startKey : startDate;
    const overlapEnd = column.endKey < endDate ? column.endKey : endDate;
    const daysInPeriod = countDaysInclusive(overlapStart, overlapEnd);

    return daysInPeriod > 0 ? sum + (amount / termDays) * daysInPeriod : sum;
  }, 0);
};

const isDateInColumns = (dateKey: string, columns: PeriodColumn[]) =>
  Boolean(dateKey) &&
  columns.some((column) => dateKey >= column.startKey && dateKey <= column.endKey);

export function computeTaxAggregates(
  orders: TaxOrder[],
  viewMode: TaxViewMode = "day"
) {
  const columns = viewMode === "day" ? buildDateColumns() : buildMonthColumns();
  let revenue = 0;
  let costSum = 0;
  let refundSum = 0;

  for (const order of orders) {
    const startDate = normalizeYmd(order.registration_date || order.order_date);
    const termDays = toTermDays(order.days);

    revenue += getAllocatedAmount(
      toMoneyNumber(order.price),
      startDate,
      termDays,
      columns
    );
    costSum += getAllocatedAmount(
      toMoneyNumber(order.cost),
      startDate,
      termDays,
      columns
    );
    const refundDate = normalizeYmd(order.canceled_at);
    if (
      isRefundedStatus(order.status) &&
      toMoneyNumber(order.refund) > 0 &&
      isDateInColumns(refundDate, columns)
    ) {
      refundSum += toMoneyNumber(order.refund);
    }
  }

  return {
    revenue,
    cost: costSum,
    refund: refundSum,
    profit: revenue - costSum,
  };
}
