import React from "react";
import { ExpenseAllocationGrid } from "./ExpenseAllocationGrid";
import { ExpenseAllocationTableToolbar } from "./ExpenseAllocationTableToolbar";
import {
  FIXED_COLUMNS_WIDTH,
  TOTAL_COLUMN_WIDTH,
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
      <ExpenseAllocationTableToolbar
        viewMode={viewMode}
        onReload={onReload}
        onToggleViewMode={onToggleViewMode}
      />

      {loading && (
        <p className="px-6 pb-2 text-sm text-slate-400">
          Đang tải đơn MAVN từ danh sách đơn...
        </p>
      )}
      {error && <p className="px-6 pb-2 text-sm text-rose-300">{error}</p>}

      <ExpenseAllocationGrid
        viewMode={viewMode}
        loading={loading}
        periodColumns={periodColumns}
        periodColumnWidth={periodColumnWidth}
        yearLabel={yearLabel}
        columnKeys={columnKeys}
        fixedDisplayRows={fixedDisplayRows}
        fixedPrefixMergeRowSpans={fixedPrefixMergeRowSpans}
        tableMinWidth={tableMinWidth}
      />
    </section>
  );
};
