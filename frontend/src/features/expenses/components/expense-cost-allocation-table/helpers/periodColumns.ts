import { getCostPeriodAmount } from "@/features/dashboard/utils/spreadCostAcrossPeriod";
import type { ExpenseFormRow, PeriodColumn } from "../types";

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
  !row.isUnmatched &&
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

export { buildDateColumns, buildMonthColumns } from "@/shared/date/dateRanges";


