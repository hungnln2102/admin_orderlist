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
                    className={`sticky bottom-0 z-[70] border-t border-r border-indigo-400/20 bg-[#0A1024] px-4 py-5 text-sm font-black text-white ${
                      column.key === LAST_FIXED_COLUMN_KEY
                        ? "shadow-[20px_0_35px_-20px_rgba(0,0,0,0.9)]"
                        : ""
                    }`}
                    style={{
                      left: column.left,
                      width: column.width,
                      minWidth: column.width,
                    }}
                  >
                    {index === 0 && (
                      <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                        Tổng cộng
                      </span>
                    )}
                    {column.key === "amount" && (
                      <span className="text-white drop-shadow-md">
                        {formatMoney(
                          fixedDisplayRows.reduce((sum, row) => sum + row.totalCost, 0),
                        )}
                      </span>
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
                      className="sticky bottom-0 z-[20] border-t border-r border-indigo-400/20 bg-[#080E21] px-4 py-5 text-right text-[13px] font-black tracking-wide text-cyan-200"
                      style={{
                        width: periodColumnWidth,
                        minWidth: periodColumnWidth,
                      }}
                    >
                      {sumCol > 0 ? (
                        <span className="drop-shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                          {formatMoney(sumCol)}
                        </span>
                      ) : (
                        <span className="text-slate-600/50 font-medium">-</span>
                      )}
                    </td>
                  );
                })}
                <td
                  className={`${totalColFoot} sticky bottom-0 border-t border-indigo-400/20 px-4 py-5 text-right text-[14px] font-black tabular-nums tracking-wide text-cyan-300 drop-shadow-md`}
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
