import { getCostPeriodAmount } from "@/features/dashboard/utils/spreadCostAcrossPeriod";
import type { ExpenseFormRow, PeriodColumn } from "../types";
import { START_DATE } from "../constants";

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const normalizeYmd = (value: string | null | undefined) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : String(value);
};

const doesRangeOverlapColumn = (
  startYmd: string | null | undefined,
  endYmd: string | null | undefined,
  column: PeriodColumn,
) => {
  if (!startYmd) return false;
  const end = endYmd || startYmd;
  if (end < startYmd) return false;
  return startYmd <= column.endKey && end >= column.startKey;
};

export const hasSlotInPeriod = (row: ExpenseFormRow, column: PeriodColumn) =>
  Boolean(row.slotLabel) &&
  doesRangeOverlapColumn(
    row.slotStartYmd || row.startDateYmd,
    row.slotEndYmd,
    column,
  );

export const amountForTotals = (
  row: ExpenseFormRow,
  column: PeriodColumn,
): number => {
  if (hasSlotInPeriod(row, column)) return 0;
  return getCostPeriodAmount(row, column) ?? 0;
};

export const rowTotalDisplayed = (row: ExpenseFormRow, columns: PeriodColumn[]) =>
  columns.reduce((s, col) => s + amountForTotals(row, col), 0);

export const buildDateColumns = (): PeriodColumn[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(START_DATE);
  start.setHours(0, 0, 0, 0);
  if (today < start) return [];

  const columns: PeriodColumn[] = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const key = getDateKey(cursor);
    columns.push({
      key,
      label: `${cursor.getDate()}/${cursor.getMonth() + 1}`,
      year: cursor.getFullYear(),
      startKey: key,
      endKey: key,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return columns;
};

export const buildMonthColumns = (): PeriodColumn[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(START_DATE);
  start.setHours(0, 0, 0, 0);
  if (today < start) return [];

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


