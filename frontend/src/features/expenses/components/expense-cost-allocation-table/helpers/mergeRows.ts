import type { ExpenseFormRow } from "../types";

const mergeKeyForExpenseRow = (row: ExpenseFormRow) =>
  [
    row.orderCode,
    row.productCode,
    row.term,
    row.startDate,
    String(row.totalCost),
    row.startDateYmd,
    String(row.termDays),
  ].join("\0");

export const computeFixedPrefixMergeRowSpans = (rows: ExpenseFormRow[]): number[] => {
  const spans = rows.map(() => 0);
  let i = 0;
  while (i < rows.length) {
    const key = mergeKeyForExpenseRow(rows[i]);
    let j = i + 1;
    while (j < rows.length && mergeKeyForExpenseRow(rows[j]) === key) {
      j += 1;
    }
    spans[i] = j - i;
    i = j;
  }
  return spans;
};
