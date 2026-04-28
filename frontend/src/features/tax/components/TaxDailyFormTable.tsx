import React, { useMemo } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type { TaxOrder } from "../api/taxApi";

type FixedColumnKey = "orderCode" | "productCode" | "term" | "startDate" | "amount";

type FixedColumn = {
  key: FixedColumnKey;
  label: string;
  width: number;
  left: number;
};

export type TaxViewMode = "day" | "month";
export type TaxMetric = "revenue" | "profit" | "refund";

type PeriodColumn = {
  key: string;
  label: string;
  year: number;
  startKey: string;
  endKey: string;
};

type TaxFormRow = {
  id: string;
  orderCode: string;
  productCode: string;
  term: string;
  termDays: number;
  startDate: string;
  refundDate: string;
  status: string;
  price: number;
  cost: number;
  refund: number;
};

const TAX_START_DATE = new Date(2026, 3, 22);

const FIXED_COLUMNS: FixedColumn[] = [
  { key: "orderCode", label: "Mã Đơn Hàng", width: 154, left: 0 },
  { key: "productCode", label: "Mã Sản Phẩm", width: 154, left: 154 },
  { key: "term", label: "Thời hạn", width: 116, left: 308 },
  { key: "startDate", label: "Ngày bắt đầu", width: 136, left: 424 },
  { key: "amount", label: "Số tiền", width: 142, left: 560 },
];

const DATE_COLUMN_WIDTH = 102;
const REMAINING_COLUMN_WIDTH = 136;
const DATA_ROW_HEIGHT = 37;
const DATA_VISIBLE_ROWS = 10;
const FIXED_COLUMNS_WIDTH = FIXED_COLUMNS.reduce(
  (total, column) => total + column.width,
  0
);

const moneyFormatter = new Intl.NumberFormat("vi-VN");

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDateColumns = (): PeriodColumn[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(TAX_START_DATE);
  start.setHours(0, 0, 0, 0);

  if (today < start) {
    return [];
  }

  const columns: PeriodColumn[] = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    columns.push({
      key: getDateKey(cursor),
      label: `${cursor.getDate()}/${cursor.getMonth() + 1}`,
      year: cursor.getFullYear(),
      startKey: getDateKey(cursor),
      endKey: getDateKey(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return columns;
};

const buildMonthColumns = (): PeriodColumn[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(TAX_START_DATE);
  start.setHours(0, 0, 0, 0);

  if (today < start) {
    return [];
  }

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

const normalizeYmd = (value: string | null | undefined) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : String(value);
};

const isRefundedStatus = (status: string) => {
  const normalized = status.trim().toLowerCase();
  return normalized === "đã hoàn" || normalized === "da hoan" || normalized === "refunded";
};

const formatTerm = (days: TaxOrder["days"]) => {
  const value = Number(days);
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  return `${value} ngày`;
};

const toMoneyNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toTermDays = (days: TaxOrder["days"]) => {
  const value = Number(days);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const addDays = (ymd: string, days: number) => {
  const [year, month, day] = ymd.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const countDaysInclusive = (from: string, to: string) => {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  if (![fy, fm, fd, ty, tm, td].every(Number.isFinite)) return 0;
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  if (end < start) return 0;
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
};

const getMetricAmount = (row: TaxFormRow, metric: TaxMetric) => {
  if (metric === "profit") {
    return row.price - row.cost;
  }

  if (metric === "refund") {
    return row.refund;
  }

  return row.price;
};

const isDateInPeriod = (dateKey: string, column: PeriodColumn) =>
  Boolean(dateKey) && dateKey >= column.startKey && dateKey <= column.endKey;

const getPeriodAmount = (
  row: TaxFormRow,
  column: PeriodColumn,
  metric: TaxMetric
) => {
  const amount = getMetricAmount(row, metric);

  if (metric === "refund") {
    if (!isRefundedStatus(row.status) || amount <= 0 || !row.refundDate) {
      return null;
    }

    return isDateInPeriod(row.refundDate, column) ? amount : null;
  }

  if (!row.startDate || row.termDays <= 0 || amount === 0) {
    return null;
  }

  const endDate = addDays(row.startDate, row.termDays - 1);
  if (!endDate) {
    return null;
  }

  const overlapStart = column.startKey > row.startDate ? column.startKey : row.startDate;
  const overlapEnd = column.endKey < endDate ? column.endKey : endDate;
  const daysInPeriod = countDaysInclusive(overlapStart, overlapEnd);

  if (daysInPeriod <= 0) {
    return null;
  }

  return (amount / row.termDays) * daysInPeriod;
};

const formatMoney = (value: number) => `${moneyFormatter.format(Math.round(value))} đ`;

const getAllocatedAmount = (
  row: TaxFormRow,
  columns: PeriodColumn[],
  metric: TaxMetric
) =>
  columns.reduce((sum, column) => {
    const periodAmount = getPeriodAmount(row, column, metric);
    return sum + (periodAmount ?? 0);
  }, 0);

const getRemainingAmount = (
  row: TaxFormRow,
  columns: PeriodColumn[],
  metric: TaxMetric
) => {
  const amount = getMetricAmount(row, metric);
  const remaining = amount - getAllocatedAmount(row, columns, metric);
  return amount >= 0 ? Math.max(0, remaining) : remaining;
};

const formatRemaining = (
  row: TaxFormRow,
  columns: PeriodColumn[],
  metric: TaxMetric
) => {
  const amount = getMetricAmount(row, metric);
  const allocated = getAllocatedAmount(row, columns, metric);

  if (!amount && !allocated) {
    return "";
  }

  return formatMoney(getRemainingAmount(row, columns, metric));
};

const toTaxFormRows = (orders: TaxOrder[]): TaxFormRow[] =>
  orders.map((order) => {
    const rowId = String(order.id);
    const termDays = toTermDays(order.days);
    return {
      id: rowId,
      orderCode: order.id_order ?? "",
      productCode:
        order.product_display_name || order.id_product || "",
      term: formatTerm(order.days),
      termDays,
      startDate: normalizeYmd(order.registration_date || order.order_date),
      refundDate: normalizeYmd(order.canceled_at),
      status: String(order.status || ""),
      price: toMoneyNumber(order.price),
      cost: toMoneyNumber(order.cost),
      refund: toMoneyNumber(order.refund),
    };
  });

type TaxDailyFormTableProps = {
  orders: TaxOrder[];
  loading: boolean;
  error: string | null;
  viewMode: TaxViewMode;
  onViewModeChange: (viewMode: TaxViewMode) => void;
  metric: TaxMetric;
};

export const TaxDailyFormTable: React.FC<TaxDailyFormTableProps> = ({
  orders,
  loading,
  error,
  viewMode,
  onViewModeChange,
  metric,
}) => {
  const allRows = useMemo(() => toTaxFormRows(orders), [orders]);
  const rows = useMemo(
    () =>
      metric === "refund"
        ? allRows.filter(
            (row) =>
              isRefundedStatus(row.status) &&
              row.refund > 0 &&
              Boolean(row.refundDate)
          )
        : allRows,
    [allRows, metric]
  );
  const dayColumns = useMemo(() => buildDateColumns(), []);
  const monthColumns = useMemo(() => buildMonthColumns(), []);
  const periodColumns = viewMode === "day" ? dayColumns : monthColumns;
  const displayPeriodColumns = useMemo(
    () =>
      metric === "refund"
        ? periodColumns.filter((column) =>
            rows.some((row) => isDateInPeriod(row.refundDate, column))
          )
        : periodColumns,
    [metric, periodColumns, rows]
  );
  const showRemainingColumn = metric !== "refund";
  const periodColumnWidth = viewMode === "day" ? DATE_COLUMN_WIDTH : 124;
  const yearLabel = useMemo(() => {
    const years = Array.from(
      new Set(displayPeriodColumns.map((column) => column.year))
    );
    return years.length > 0 ? years.join(" - ") : "2026";
  }, [displayPeriodColumns]);
  const tableMinWidth =
    FIXED_COLUMNS_WIDTH +
    displayPeriodColumns.length * periodColumnWidth +
    (showRemainingColumn ? REMAINING_COLUMN_WIDTH : 0);
  const periodTotals = useMemo(
    () =>
      displayPeriodColumns.map((column) =>
        rows.reduce(
          (sum, row) => sum + (getPeriodAmount(row, column, metric) ?? 0),
          0
        )
      ),
    [displayPeriodColumns, metric, rows]
  );
  const amountTotal = useMemo(
    () => rows.reduce((sum, row) => sum + getMetricAmount(row, metric), 0),
    [metric, rows]
  );
  const remainingTotal = useMemo(
    () =>
      rows.reduce(
        (sum, row) => sum + getRemainingAmount(row, periodColumns, metric),
        0
      ),
    [metric, periodColumns, rows]
  );
  const dynamicColumnCount =
    displayPeriodColumns.length + (showRemainingColumn ? 1 : 0);
  const totalColumnCount = FIXED_COLUMNS.length + dynamicColumnCount;
  const renderColGroup = () => (
    <colgroup>
      {FIXED_COLUMNS.map((column) => (
        <col key={column.key} style={{ width: column.width }} />
      ))}
      {displayPeriodColumns.map((column) => (
        <col key={column.key} style={{ width: periodColumnWidth }} />
      ))}
      {showRemainingColumn && <col style={{ width: REMAINING_COLUMN_WIDTH }} />}
    </colgroup>
  );

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
          onClick={() =>
            onViewModeChange(viewMode === "day" ? "month" : "day")
          }
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

              {rows.map((row, rowIndex) => (
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
                      {formatRemaining(row, periodColumns, metric)}
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
