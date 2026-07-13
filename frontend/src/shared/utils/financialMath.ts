import { addDaysUtc, countDaysInclusive, PeriodColumn } from "@/shared/date/dateRanges";

export const toMoneyNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const getAllocatedAmount = (
  amount: number,
  startDate: string,
  termDays: number,
  columns: PeriodColumn[]
): number => {
  if (!startDate || termDays <= 0 || amount <= 0) {
    return 0;
  }

  const endDate = addDaysUtc(startDate, termDays - 1);
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
