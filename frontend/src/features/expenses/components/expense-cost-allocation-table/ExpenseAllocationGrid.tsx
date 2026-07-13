import React from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { getCostPeriodAmount } from "@/features/dashboard/utils/spreadCostAcrossPeriod";
import { ExpenseAllocationGridFooter } from "./ExpenseAllocationGridFooter";
import { ExpenseAllocationGridHeader } from "./ExpenseAllocationGridHeader";
import {
  DATA_ROW_HEIGHT,
  DATA_VISIBLE_ROWS,
  FIXED_COLUMNS,
  FIXED_MERGE_COLUMNS,
  SLOT_COLUMN,
  LAST_FIXED_COLUMN_KEY,
  FIXED_COLUMNS_WIDTH,
  TOTAL_COLUMN_WIDTH,
  formatMoney,
  hasSlotInPeriod,
  rowTotalDisplayed,
  totalColCell,
  type ExpenseFormRow,
  type PeriodColumn,
  type ViewMode,
} from "./helpers";

type ExpenseAllocationGridProps = {
  viewMode: ViewMode;
  loading: boolean;
  periodColumns: PeriodColumn[];
  periodColumnWidth: number;
  yearLabel: string;
  columnKeys: string;
  fixedDisplayRows: ExpenseFormRow[];
  fixedPrefixMergeRowSpans: number[];
  tableMinWidth: number;
};

export const ExpenseAllocationGrid: React.FC<ExpenseAllocationGridProps> = ({
  viewMode,
  loading,
  periodColumns,
  periodColumnWidth,
  yearLabel,
  columnKeys,
  fixedDisplayRows,
  fixedPrefixMergeRowSpans,
  tableMinWidth,
}) => (
      <div className="overflow-hidden">
        <div
          className="relative isolate overflow-auto"
          style={{
            maxHeight: 84 + DATA_ROW_HEIGHT * DATA_VISIBLE_ROWS + 54,
          }}
          key={`${viewMode}:${columnKeys}:${fixedDisplayRows.length}`}
        >
          <table
            className="relative z-0 min-w-full table-fixed border-separate border-spacing-0 text-sm"
            style={{ width: tableMinWidth, minWidth: tableMinWidth }}
          >
            <colgroup>
              {FIXED_COLUMNS.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
              {periodColumns.map((column) => (
                <col key={column.key} style={{ width: periodColumnWidth }} />
              ))}
              <col style={{ width: TOTAL_COLUMN_WIDTH }} />
            </colgroup>

            <ExpenseAllocationGridHeader
              periodColumns={periodColumns}
              periodColumnWidth={periodColumnWidth}
              yearLabel={yearLabel}
            />
            <tbody>
              {fixedDisplayRows.map((order, rowIndex) => (
                <tr
                  key={order.key}
                  className="group"
                  style={{ height: DATA_ROW_HEIGHT }}
                >
                  {fixedPrefixMergeRowSpans[rowIndex] > 0 &&
                    FIXED_MERGE_COLUMNS.map((column) => (
                      <td
                        key={column.key}
                        rowSpan={fixedPrefixMergeRowSpans[rowIndex]}
                        className="sticky z-[60] border-b border-r border-indigo-300/15 bg-[#020617] px-2 py-2 align-top transition-colors group-hover:bg-slate-900 focus-within:z-[75]"
                        style={{
                          left: column.left,
                          width: column.width,
                          minWidth: column.width,
                        }}
                      >
                        <span className="block min-h-5 px-1 text-sm font-semibold text-white">
                          {column.key === "orderCode" && order.orderCode}
                          {column.key === "productCode" && order.productCode}
                          {column.key === "term" && order.term}
                          {column.key === "startDate" && order.startDate}
                          {column.key === "amount" && formatMoney(order.totalCost)}
                        </span>
                      </td>
                    ))}
                  <td
                    key={SLOT_COLUMN.key}
                    className={`sticky z-[60] border-b border-r border-indigo-300/15 bg-[#020617] px-2 py-2 transition-colors group-hover:bg-slate-900 focus-within:z-[75] ${
                      SLOT_COLUMN.key === LAST_FIXED_COLUMN_KEY
                        ? "shadow-[18px_0_30px_-24px_rgba(148,163,184,0.8)]"
                        : ""
                    }`}
                    style={{
                      left: SLOT_COLUMN.left,
                      width: SLOT_COLUMN.width,
                      minWidth: SLOT_COLUMN.width,
                    }}
                  >
                    <span className="block h-5 truncate px-1 text-sm font-semibold text-white">
                      {order.slotLabel}
                    </span>
                  </td>

                  {periodColumns.map((column) => {
                    const value = getCostPeriodAmount(order, column);
                    const slotInPeriod = hasSlotInPeriod(order, column);
                    return (
                      <td
                        key={column.key}
                        className={`relative z-0 border-b border-r border-indigo-300/15 px-3 py-2 text-sm font-semibold transition-colors ${
                          slotInPeriod
                            ? "bg-emerald-500/12 text-center text-emerald-100 group-hover:bg-emerald-500/18"
                            : "bg-slate-950 text-right text-cyan-100 group-hover:bg-slate-900"
                        }`}
                        style={{
                          width: periodColumnWidth,
                          minWidth: periodColumnWidth,
                        }}
                      >
                        {slotInPeriod ? (
                          <span
                            className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/50 bg-emerald-400/20 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.35)]"
                            title="Đã có slot"
                          >
                            <CheckIcon className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Đã có slot</span>
                          </span>
                        ) : value != null ? (
                          formatMoney(value)
                        ) : (
                          ""
                        )}
                      </td>
                    );
                  })}
                  <td
                    className={`${totalColCell} border-b border-indigo-300/15 px-3 py-2 text-right text-sm font-bold tabular-nums text-sky-100`}
                    style={{
                      width: TOTAL_COLUMN_WIDTH,
                      minWidth: TOTAL_COLUMN_WIDTH,
                    }}
                  >
                    {formatMoney(rowTotalDisplayed(order, periodColumns))}
                  </td>
                </tr>
              ))}

              {!fixedDisplayRows.length && !loading && (
                <tr>
                  <td
                    className="border-b border-indigo-300/15 bg-[#020617] px-3 py-4 text-sm text-slate-400"
                    colSpan={FIXED_COLUMNS.length + periodColumns.length + 1}
                  >
                    Chưa có đơn MAVN trạng thái Đã Thanh Toán trong order_list.
                    Thêm đơn nhập hoặc kiểm tra trạng thái đơn.
                  </td>
                </tr>
              )}

              {fixedDisplayRows.length > 0 &&
                Array.from(
                  {
                    length: Math.max(0, DATA_VISIBLE_ROWS - fixedDisplayRows.length),
                  },
                  (_, idx) => (
                    <tr
                      key={`empty-${idx}`}
                      className="group"
                      style={{ height: DATA_ROW_HEIGHT }}
                    >
                      {FIXED_COLUMNS.map((column) => (
                        <td
                          key={column.key}
                          className="sticky z-[60] border-b border-r border-indigo-300/15 bg-[#020617] px-2 py-2 transition-colors group-hover:bg-slate-900"
                          style={{
                            left: column.left,
                            width: column.width,
                            minWidth: column.width,
                          }}
                        />
                      ))}
                      {periodColumns.map((column) => (
                        <td
                          key={column.key}
                          className="relative z-0 border-b border-r border-indigo-300/15 bg-slate-950 px-3 py-2"
                          style={{
                            width: periodColumnWidth,
                            minWidth: periodColumnWidth,
                          }}
                        />
                      ))}
                      <td
                        className={`${totalColCell} border-b border-indigo-300/15 px-3 py-2`}
                        style={{
                          width: TOTAL_COLUMN_WIDTH,
                          minWidth: TOTAL_COLUMN_WIDTH,
                        }}
                      />
                    </tr>
                  ),
                )}
            </tbody>

            <ExpenseAllocationGridFooter
              fixedDisplayRows={fixedDisplayRows}
              periodColumns={periodColumns}
              periodColumnWidth={periodColumnWidth}
            />
          </table>
        </div>
      </div>
);
