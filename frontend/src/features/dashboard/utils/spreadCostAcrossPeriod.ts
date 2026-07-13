/** Phân bổ cost MAVN theo ngày (cùng ý như Thuế — cost / ngày × overlap). */

import { addDaysUtc, countDaysInclusive, isDateInColumns, PeriodColumn } from "@/shared/date/dateRanges";

/** cost tổng, phân bổ đều theo termDays từ startDate YYYY-MM-DD */
export function getCostPeriodAmount(
  row: {
    totalCost: number;
    termDays: number;
    startDateYmd: string;
    endDateYmd?: string | null;
  },
  column: PeriodColumn,
): number | null {
  const amount = row.totalCost;
  if (!(amount !== 0) || Number.isNaN(amount)) return null;

  if (!row.startDateYmd || row.termDays <= 0) {
    const anchor = row.startDateYmd;
    if (!anchor) return null;
    if (row.endDateYmd && row.endDateYmd < anchor) return null;
    return anchor >= column.startKey && anchor <= column.endKey ? Math.abs(amount) : null;
  }

  const scheduledEndDate = addDaysUtc(row.startDateYmd, row.termDays - 1);
  const endDate =
    row.endDateYmd && row.endDateYmd < scheduledEndDate
      ? row.endDateYmd
      : scheduledEndDate;
  if (!endDate) return null;
  if (endDate < row.startDateYmd) return null;

  const overlapStart =
    column.startKey > row.startDateYmd ? column.startKey : row.startDateYmd;
  const overlapEnd = column.endKey < endDate ? column.endKey : endDate;
  const daysInPeriod = countDaysInclusive(overlapStart, overlapEnd);
  if (daysInPeriod <= 0) return null;

  return (Math.abs(amount) / row.termDays) * daysInPeriod;
}

export function getCostAllocationTotal(
  row: Parameters<typeof getCostPeriodAmount>[0],
): number {
  const amount = row.totalCost;
  if (!(amount !== 0) || Number.isNaN(amount)) return 0;

  if (!row.startDateYmd || row.termDays <= 0) {
    if (!row.startDateYmd) return 0;
    if (row.endDateYmd && row.endDateYmd < row.startDateYmd) return 0;
    return Math.abs(amount);
  }

  const scheduledEndDate = addDaysUtc(row.startDateYmd, row.termDays - 1);
  const endDate =
    row.endDateYmd && row.endDateYmd < scheduledEndDate
      ? row.endDateYmd
      : scheduledEndDate;
  if (!endDate || endDate < row.startDateYmd) return 0;

  const days = countDaysInclusive(row.startDateYmd, endDate);
  if (days <= 0) return 0;

  return (Math.abs(amount) / row.termDays) * days;
}

export function getAllocatedTotal(
  row: Parameters<typeof getCostPeriodAmount>[0],
  columns: PeriodColumn[],
) {
  return columns.reduce((sum, col) => sum + (getCostPeriodAmount(row, col) ?? 0), 0);
}
