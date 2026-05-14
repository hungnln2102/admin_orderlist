import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  DATA_ROW_HEIGHT,
  DATA_VISIBLE_ROWS,
  FIXED_COLUMNS,
  formatMoney,
  formatRemaining,
  getMetricAmount,
  getPeriodAmount,
} from "./helpers";
import type { PeriodColumn, TaxFormRow, TaxMetric, TaxViewMode } from "./types";

type Props = {
  loading: boolean;
  error: string | null;
  rows: TaxFormRow[];
  metric: TaxMetric;
  viewMode: TaxViewMode;
  onToggleViewMode: () => void;
  displayPeriodColumns: PeriodColumn[];
  periodColumnWidth: number;
  yearLabel: string;
  totalColumnCount: number;
  dynamicColumnCount: number;
  tableMinWidth: number;
  showRemainingColumn: boolean;
  periodTotals: number[];
  amountTotal: number;
  remainingTotal: number;
  renderColGroup: () => React.ReactNode;
};

export const TaxDailyFormTableView: React.FC<Props> = ({
  loading,
  error,
  rows,
  metric,
  viewMode,
  onToggleViewMode,
  displayPeriodColumns,
  periodColumnWidth,
  yearLabel,
  totalColumnCount,
  dynamicColumnCount,
  tableMinWidth,
  showRemainingColumn,
  periodTotals,
  amountTotal,
  remainingTotal,
  renderColGroup,
}) => {
  const REMAINING_COLUMN_WIDTH = 136;
  return (
    <section className="rounded-2xl border border-indigo-500/25 bg-slate-950/58 shadow-[0_24px_70px_-26px_rgba(79,70,229,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-white/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300/80">
            {viewMode === "day" ? "Bảng thuế theo ngày" : "Bảng thuế theo tháng"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            Form phân bổ thuế
          </h2>
        </div>

        <button
          type="button"
          onClick={onToggleViewMode}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-300/25 bg-sky-400/12 px-4 text-sm font-semibold text-sky-100 transition hover:border-sky-200/45 hover:bg-sky-400/18 disabled:cursor-wait disabled:opacity-60"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {viewMode === "day" ? "Theo tháng" : "Theo ngày"}
        </button>
      </div>

      {error && (
        <div className="border-b border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 sm:px-6">
          {error}
        </div>
      )}

      <div className="overflow-hidden">
        <div
          className="relative isolate overflow-auto"
          style={{
            maxHeight: 84 + DATA_ROW_HEIGHT * DATA_VISIBLE_ROWS + 54,
          }}
        >
          <table
            className="relative z-0 min-w-full table-fixed border-separate border-spacing-0 text-sm"
            style={{ width: tableMinWidth, minWidth: tableMinWidth }}
          >
            {renderColGroup()}
            <thead className="text-slate-100">
              <tr>
                {FIXED_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    rowSpan={2}
                    scope="col"
                    className={`sticky top-0 z-[80] border-b border-r border-indigo-300/25 bg-[#020617] px-3 py-4 text-left align-middle text-xs font-bold uppercase tracking-[0.08em] ${
                      column.key === "amount"
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
                {dynamicColumnCount > 0 && (
                  <th
                    scope="col"
                    colSpan={dynamicColumnCount}
                    className="sticky top-0 z-[10] border-b border-r border-indigo-300/25 bg-slate-950 px-3 py-3 text-center text-xs font-bold uppercase tracking-[0.1em]"
                  >
                    {yearLabel}
                  </th>
                )}
              </tr>
              <tr>
                {displayPeriodColumns.map((column) => (
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
                {showRemainingColumn && (
                  <th
                    scope="col"
                    className="sticky top-[45px] z-[10] border-b border-r border-indigo-300/25 bg-slate-950 px-3 py-3 text-center text-xs font-semibold"
                    style={{
                      width: REMAINING_COLUMN_WIDTH,
                      minWidth: REMAINING_COLUMN_WIDTH,
                    }}
                  >
                    Còn lại
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={totalColumnCount}
                    className="border-b border-indigo-300/15 bg-slate-950 px-4 py-10 text-center text-sm font-semibold text-slate-300"
                  >
                    Đang tải đơn tính thuế...
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && !error && (
                <tr>
                  <td
                    colSpan={totalColumnCount}
                    className="border-b border-indigo-300/15 bg-slate-950 px-4 py-10 text-center text-sm font-semibold text-slate-300"
                  >
                    Không có đơn từ ngày 22/4/2026 trở lên.
                  </td>
                </tr>
              )}

              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="group"
                  style={{ height: DATA_ROW_HEIGHT }}
                >
                  {FIXED_COLUMNS.map((column) => (
                    <td
                      key={column.key}
                      className={`sticky z-[60] border-b border-r border-indigo-300/15 bg-[#020617] px-2 py-2 transition-colors group-hover:bg-slate-900 focus-within:z-[75] ${
                        column.key === "amount"
                          ? "shadow-[18px_0_30px_-24px_rgba(148,163,184,0.8)]"
                          : ""
                      }`}
                      style={{
                        left: column.left,
                        width: column.width,
                        minWidth: column.width,
                      }}
                    >
                      <span className="block truncate px-1 text-sm font-semibold text-white">
                        {column.key === "amount"
                          ? formatMoney(getMetricAmount(row, metric))
                          : row[column.key]}
                      </span>
                    </td>
                  ))}

                  {displayPeriodColumns.map((column) => {
                    const periodAmount = getPeriodAmount(row, column, metric);
                    return (
                      <td
                        key={column.key}
                        className="relative z-0 border-b border-r border-indigo-300/15 bg-slate-950 px-3 py-2 text-right text-sm font-semibold text-cyan-100 transition-colors group-hover:bg-slate-900"
                        style={{
                          width: periodColumnWidth,
                          minWidth: periodColumnWidth,
                        }}
                      >
                        {periodAmount != null ? formatMoney(periodAmount) : ""}
                      </td>
                    );
                  })}

                  {showRemainingColumn && (
                    <td
                      className="relative z-0 border-b border-r border-indigo-300/15 bg-slate-950 px-3 py-2 text-right text-sm font-semibold text-emerald-200 transition-colors group-hover:bg-slate-900"
                      style={{
                        width: REMAINING_COLUMN_WIDTH,
                        minWidth: REMAINING_COLUMN_WIDTH,
                      }}
                    >
                      {formatRemaining(row, displayPeriodColumns, metric)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  {FIXED_COLUMNS.map((column, index) => (
                    <td
                      key={column.key}
                      className={`sticky bottom-0 z-[70] border-t border-r border-indigo-300/25 bg-[#020617] px-3 py-4 text-sm font-black text-white ${
                        column.key === "amount"
                          ? "shadow-[18px_0_30px_-24px_rgba(148,163,184,0.95)]"
                          : ""
                      }`}
                      style={{
                        left: column.left,
                        width: column.width,
                        minWidth: column.width,
                      }}
                    >
                      {index === 0
                        ? "Tổng cộng"
                        : column.key === "amount"
                          ? formatMoney(amountTotal)
                          : ""}
                    </td>
                  ))}

                  {periodTotals.map((total, index) => (
                    <td
                      key={displayPeriodColumns[index].key}
                      className="sticky bottom-0 z-[20] border-t border-r border-indigo-300/25 bg-slate-950 px-3 py-4 text-right text-sm font-black text-cyan-100"
                      style={{
                        width: periodColumnWidth,
                        minWidth: periodColumnWidth,
                      }}
                    >
                      {total > 0 ? formatMoney(total) : ""}
                    </td>
                  ))}

                  {showRemainingColumn && (
                    <td
                      className="sticky bottom-0 z-[20] border-t border-r border-indigo-300/25 bg-slate-950 px-3 py-4 text-right text-sm font-black text-emerald-200"
                      style={{
                        width: REMAINING_COLUMN_WIDTH,
                        minWidth: REMAINING_COLUMN_WIDTH,
                      }}
                    >
                      {formatMoney(remainingTotal)}
                    </td>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </section>
  );
};
