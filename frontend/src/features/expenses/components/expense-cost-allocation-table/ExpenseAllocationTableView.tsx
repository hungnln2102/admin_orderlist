import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { getCostPeriodAmount } from "@/features/dashboard/utils/spreadCostAcrossPeriod";
import {
  DATA_ROW_HEIGHT,
  DATA_VISIBLE_ROWS,
  FIXED_COLUMNS,
  FIXED_COLUMNS_WIDTH,
  FIXED_MERGE_COLUMNS,
  LAST_FIXED_COLUMN_KEY,
  SLOT_COLUMN,
  TOTAL_COLUMN_WIDTH,
  amountForTotals,
  formatMoney,
  hasSlotInPeriod,
  rowTotalDisplayed,
  totalColCell,
  totalColFoot,
  totalColHead,
  type ExpenseFormRow,
  type PeriodColumn,
  type ViewMode,
} from "./helpers";

type ExpenseAllocationTableViewProps = {
  viewMode: ViewMode;
  loading: boolean;
  error: string | null;
  periodColumns: PeriodColumn[];
  periodColumnWidth: number;
  yearLabel: string;
  columnKeys: string;
  fixedDisplayRows: ExpenseFormRow[];
  fixedPrefixMergeRowSpans: number[];
  onReload: () => void;
  onToggleViewMode: () => void;
};

export const ExpenseAllocationTableView: React.FC<ExpenseAllocationTableViewProps> = ({
  viewMode,
  loading,
  error,
  periodColumns,
  periodColumnWidth,
  yearLabel,
  columnKeys,
  fixedDisplayRows,
  fixedPrefixMergeRowSpans,
  onReload,
  onToggleViewMode,
}) => {
  const tableMinWidth =
    FIXED_COLUMNS_WIDTH +
    periodColumns.length * periodColumnWidth +
    TOTAL_COLUMN_WIDTH;

  return (
    <section className="rounded-2xl border border-indigo-500/25 bg-slate-950/58 shadow-[0_24px_70px_-26px_rgba(79,70,229,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-white/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300/80">
            {viewMode === "day"
              ? "Bảng chi phí theo ngày"
              : "Bảng chi phí theo tháng"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            Form phân bổ chi phí - đơn nhập MAVN (Đã TT)
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReload}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-400/12 px-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/45 hover:bg-emerald-400/18"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Tải lại
          </button>
          <button
            type="button"
            onClick={onToggleViewMode}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-300/25 bg-sky-400/12 px-4 text-sm font-semibold text-sky-100 transition hover:border-sky-200/45 hover:bg-sky-400/18"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {viewMode === "day" ? "Theo tháng" : "Theo ngày"}
          </button>
        </div>
      </div>

      {loading && (
        <p className="px-6 pb-2 text-sm text-slate-400">
          Đang tải đơn MAVN từ danh sách đơn...
        </p>
      )}
      {error && <p className="px-6 pb-2 text-sm text-rose-300">{error}</p>}

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

            <thead className="text-slate-100">
              <tr>
                {FIXED_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    rowSpan={2}
                    scope="col"
                    className={`sticky top-0 z-[80] border-b border-r border-indigo-300/25 bg-[#020617] px-3 py-4 text-left align-middle text-xs font-bold uppercase tracking-[0.08em] ${
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
                    {column.label}
                  </th>
                ))}
                <th
                  scope="col"
                  colSpan={periodColumns.length}
                  className="sticky top-0 z-[10] border-b border-r border-indigo-300/25 bg-slate-950 px-3 py-3 text-center text-xs font-bold uppercase tracking-[0.1em]"
                >
                  {yearLabel}
                </th>
                <th
                  rowSpan={2}
                  scope="col"
                  className={`${totalColHead} sticky top-0 z-[100] border-b border-indigo-300/25 px-3 py-4 text-center align-middle text-xs font-bold uppercase tracking-[0.12em] text-sky-200`}
                  style={{
                    width: TOTAL_COLUMN_WIDTH,
                    minWidth: TOTAL_COLUMN_WIDTH,
                  }}
                >
                  <span className="block leading-tight">Tổng</span>
                  <span className="mt-1 block text-[10px] font-semibold normal-case tracking-normal text-sky-300/75">
                    (Trong kỳ hiển thị)
                  </span>
                </th>
              </tr>
              <tr>
                {periodColumns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="sticky top-[45px] z-[10] border-b border-r border-indigo-300/25 bg-slate-950 px-3 py-3 text-center text-xs font-semibold"
                    style={{
                      width: periodColumnWidth,
                      minWidth: periodColumnWidth,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

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
          </table>
        </div>
      </div>
    </section>
  );
};
