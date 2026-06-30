import React from "react";
import {
  FIXED_COLUMNS,
  LAST_FIXED_COLUMN_KEY,
  TOTAL_COLUMN_WIDTH,
  amountForTotals,
  formatMoney,
  rowTotalDisplayed,
  totalColFoot,
  type ExpenseFormRow,
  type PeriodColumn,
} from "./helpers";

type ExpenseAllocationGridFooterProps = {
  fixedDisplayRows: ExpenseFormRow[];
  periodColumns: PeriodColumn[];
  periodColumnWidth: number;
};

export const ExpenseAllocationGridFooter: React.FC<ExpenseAllocationGridFooterProps> = ({
  fixedDisplayRows,
  periodColumns,
  periodColumnWidth,
}) => (
            <tfoot>
              <tr>
                {FIXED_COLUMNS.map((column, index) => (
                  <td
                    key={column.key}
                    className={`sticky bottom-0 z-[70] border-t border-r border-indigo-300/25 bg-[#020617] px-3 py-4 text-sm font-black text-white ${
                      column.key === LAST_FIXED_COLUMN_KEY
                        ? "shadow-[18px_0_30px_-24px_rgba(148,163,184,0.95)]"
                        : ""
                    }`}
                    style={{
                      left: column.left,
                      width: column.width,
                      minWidth: column.width,
                    }}
                  >
                    {index === 0 ? "Tổng cộng" : ""}
                    {column.key === "amount" &&
                      formatMoney(
                        fixedDisplayRows.reduce((sum, row) => sum + row.totalCost, 0),
                      )}
                  </td>
                ))}

                {periodColumns.map((column) => {
                  const sumCol = fixedDisplayRows.reduce(
                    (sum, order) => sum + amountForTotals(order, column),
                    0,
                  );

                  return (
                    <td
                      key={column.key}
                      className="sticky bottom-0 z-[20] border-t border-r border-indigo-300/25 bg-slate-950 px-3 py-4 text-right text-sm font-black text-cyan-100"
                      style={{
                        width: periodColumnWidth,
                        minWidth: periodColumnWidth,
                      }}
                    >
                      {sumCol > 0 ? formatMoney(sumCol) : ""}
                    </td>
                  );
                })}
                <td
                  className={`${totalColFoot} sticky bottom-0 border-t border-indigo-300/25 px-3 py-4 text-right text-sm font-black tabular-nums text-cyan-100`}
                  style={{
                    width: TOTAL_COLUMN_WIDTH,
                    minWidth: TOTAL_COLUMN_WIDTH,
                  }}
                >
                  {formatMoney(
                    fixedDisplayRows.reduce(
                      (sum, order) => sum + rowTotalDisplayed(order, periodColumns),
                      0,
                    ),
                  )}
                </td>
              </tr>
            </tfoot>
);
