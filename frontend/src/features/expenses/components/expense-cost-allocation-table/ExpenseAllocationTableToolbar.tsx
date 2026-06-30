import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type { ViewMode } from "./helpers";

type ExpenseAllocationTableToolbarProps = {
  viewMode: ViewMode;
  onReload: () => void;
  onToggleViewMode: () => void;
};

export function ExpenseAllocationTableToolbar({
  viewMode,
  onReload,
  onToggleViewMode,
}: ExpenseAllocationTableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300/80">
          {viewMode === "day"
            ? "B?ng chi ph? theo ng?y"
            : "B?ng chi ph? theo th?ng"}
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">
          Form ph?n b? chi ph? - ??n nh?p MAVN (?? TT)
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReload}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-400/12 px-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/45 hover:bg-emerald-400/18"
        >
          <ArrowPathIcon className="h-4 w-4" />
          T?i l?i
        </button>
        <button
          type="button"
          onClick={onToggleViewMode}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-300/25 bg-sky-400/12 px-4 text-sm font-semibold text-sky-100 transition hover:border-sky-200/45 hover:bg-sky-400/18"
        >
          <ArrowPathIcon className="h-4 w-4" />
          {viewMode === "day" ? "Theo th?ng" : "Theo ng?y"}
        </button>
      </div>
    </div>
  );
}
