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
                        className="sticky z-[60] border-b border-r border-white/[0.04] bg-[#0A1024] px-4 py-3 align-top transition-colors group-hover:bg-[#0E1531] focus-within:z-[75]"
                        style={{
                          left: column.left,
                          width: column.width,
                          minWidth: column.width,
                        }}
                      >
                        <span className={`block min-h-5 text-[13px] font-semibold break-words ${column.key === "informationOrder" ? "text-cyan-200/90 max-w-[130px]" : "text-slate-200"}`}>
                          {column.key === "productCode" && order.productCode}
                          {column.key === "informationOrder" && order.informationOrder}
                          {column.key === "term" && order.term}
                          {column.key === "startDate" && order.startDate}
                          {column.key === "amount" && formatMoney(order.totalCost)}
                        </span>
                      </td>
                    ))}
                  <td
                    key={SLOT_COLUMN.key}
                    className={`sticky z-[60] border-b border-r border-white/[0.04] bg-[#0A1024] px-4 py-3 transition-colors group-hover:bg-[#0E1531] focus-within:z-[75] ${
                      SLOT_COLUMN.key === LAST_FIXED_COLUMN_KEY
                        ? "shadow-[20px_0_35px_-20px_rgba(0,0,0,0.8)]"
                        : ""
                    }`}
                    style={{
                      left: SLOT_COLUMN.left,
                      width: SLOT_COLUMN.width,
                      minWidth: SLOT_COLUMN.width,
                    }}
                  >
                    <span className={`block h-5 truncate text-[13px] font-semibold ${order.isUnmatched ? 'text-amber-400/90 italic' : 'text-slate-200'}`}>
                      {order.slotLabel}
                    </span>
                  </td>

                  {periodColumns.map((column) => {
                    const value = order.subRows
                      ? order.subRows.reduce((sum, sub) => sum + (getCostPeriodAmount(sub, column) ?? 0), 0)
                      : getCostPeriodAmount(order, column);
                    const slotInPeriod = order.subRows
                      ? order.subRows.some(sub => hasSlotInPeriod(sub, column))
                      : hasSlotInPeriod(order, column);
                    return (
                        <td
                          key={column.key}
                          className={`relative z-0 border-b border-r border-white/[0.04] px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                            slotInPeriod
                              ? "bg-emerald-500/[0.08] text-center text-emerald-300 group-hover:bg-emerald-500/[0.12]"
                              : "bg-[#060B1C] text-right text-cyan-200/80 group-hover:bg-[#0A1024]"
                          }`}
                        style={{
                          width: periodColumnWidth,
                          minWidth: periodColumnWidth,
                        }}
                      >
                        {slotInPeriod ? (
                          <span
                            className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/30 transition-all hover:scale-110"
                            title="Đã có slot"
                          >
                            <CheckIcon className="h-4 w-4 drop-shadow-sm" aria-hidden="true" />
                            <span className="sr-only">Đã có slot</span>
                          </span>
                        ) : value != null ? (
                          <span className="drop-shadow-sm">{formatMoney(value)}</span>
                        ) : (
                          <span className="text-slate-600/30">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td
                    className={`${totalColCell} border-b border-white/[0.04] px-4 py-3 text-right text-[13px] font-bold tabular-nums text-sky-200 drop-shadow-sm`}
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
                    className="border-b border-white/[0.04] bg-[#0A1024] px-8 py-10 text-center text-[13px] font-medium text-slate-400"
                    colSpan={FIXED_COLUMNS.length + periodColumns.length + 1}
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <span>Chưa có đơn MAVN trạng thái Đã Thanh Toán trong order_list. <br className="sm:hidden" /> Thêm đơn nhập hoặc kiểm tra trạng thái đơn.</span>
                    </div>
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
                          className="sticky z-[60] border-b border-r border-white/[0.04] bg-[#0A1024] px-4 py-3 transition-colors group-hover:bg-[#0E1531]"
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
                          className="relative z-0 border-b border-r border-white/[0.04] bg-[#060B1C] px-4 py-3 group-hover:bg-[#0A1024]"
                          style={{
                            width: periodColumnWidth,
                            minWidth: periodColumnWidth,
                          }}
                        />
                      ))}
                      <td
                        className={`${totalColCell} border-b border-white/[0.04] px-4 py-3`}
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
