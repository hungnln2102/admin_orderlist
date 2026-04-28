/** Phân bổ cost MAVN theo ngày (cùng ý như Thuế — cost / ngày × overlap). */

export type PeriodColumn = {
  key: string;
  label: string;
  year: number;
  startKey: string;
  endKey: string;
};

export const addDaysUtc = (ymd: string, days: number) => {
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

const isDateInPeriod = (dateKey: string, column: PeriodColumn) =>
  Boolean(dateKey) && dateKey >= column.startKey && dateKey <= column.endKey;

/** cost tổng, phân bổ đều theo termDays từ startDate YYYY-MM-DD */
export function getCostPeriodAmount(
  row: {
    totalCost: number;
    termDays: number;
    startDateYmd: string;
  },
  column: PeriodColumn,
): number | null {
  const amount = row.totalCost;
  if (!(amount !== 0) || Number.isNaN(amount)) return null;

  if (!row.startDateYmd || row.termDays <= 0) {
    const anchor = row.startDateYmd;
    if (!anchor) return null;
    return isDateInPeriod(anchor, column) ? Math.abs(amount) : null;
  }

  const endDate = addDaysUtc(row.startDateYmd, row.termDays - 1);
  if (!endDate) return null;

  const overlapStart =
    column.startKey > row.startDateYmd ? column.startKey : row.startDateYmd;
  const overlapEnd = column.endKey < endDate ? column.endKey : endDate;
  const daysInPeriod = countDaysInclusive(overlapStart, overlapEnd);
  if (daysInPeriod <= 0) return null;

  return (Math.abs(amount) / row.termDays) * daysInPeriod;
}

export function getAllocatedTotal(
  row: Parameters<typeof getCostPeriodAmount>[0],
  columns: PeriodColumn[],
) {
  return columns.reduce((sum, col) => sum + (getCostPeriodAmount(row, col) ?? 0), 0);
}
