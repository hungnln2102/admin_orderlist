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
    <section className="overflow-hidden rounded-2xl border border-indigo-500/20 bg-[#060B1C]/80 shadow-[0_24px_70px_-26px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
      <ExpenseAllocationTableToolbar
        viewMode={viewMode}
        onReload={onReload}
        onToggleViewMode={onToggleViewMode}
      />

      {loading && (
        <div className="flex items-center gap-3 px-8 py-4 text-sm font-medium text-indigo-300">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          Đang tải đơn MAVN từ danh sách đơn...
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 px-8 py-4 text-sm font-medium text-rose-300 bg-rose-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

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
