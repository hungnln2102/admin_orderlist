import type { QuoteLine, QuoteLineWithTotal } from "../types";

export function computeQuoteTotals(lines: QuoteLine[]): {
  rows: QuoteLineWithTotal[];
  grandTotal: number;
} {
  const rows: QuoteLineWithTotal[] = lines.map((line) => ({
    ...line,
    total: (line.unitPrice - (line.discount || 0)) * line.quantity,
  }));
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  return { rows, grandTotal };
}
