import React, { useMemo } from "react";
import { TaxDailyFormTableView } from "./tax-daily-form-table/TaxDailyFormTableView";
import {
  DATE_COLUMN_WIDTH,
  FIXED_COLUMNS,
  FIXED_COLUMNS_WIDTH,
  REMAINING_COLUMN_WIDTH,
  buildDateColumns,
  buildMonthColumns,
  getMetricAmount,
  getPeriodAmount,
  getRemainingAmount,
  isDateInPeriod,
  isRefundedStatus,
  toTaxFormRows,
} from "./tax-daily-form-table/helpers";
import type { TaxDailyFormTableProps } from "./tax-daily-form-table/types";

export type { TaxViewMode, TaxMetric } from "./tax-daily-form-table/types";

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
    <TaxDailyFormTableView
      loading={loading}
      error={error}
      rows={rows}
      metric={metric}
      viewMode={viewMode}
      onToggleViewMode={() =>
        onViewModeChange(viewMode === "day" ? "month" : "day")
      }
      displayPeriodColumns={displayPeriodColumns}
      periodColumnWidth={periodColumnWidth}
      yearLabel={yearLabel}
      totalColumnCount={totalColumnCount}
      dynamicColumnCount={dynamicColumnCount}
      tableMinWidth={tableMinWidth}
      showRemainingColumn={showRemainingColumn}
      periodTotals={periodTotals}
      amountTotal={amountTotal}
      remainingTotal={remainingTotal}
      renderColGroup={renderColGroup}
    />
  );
};
