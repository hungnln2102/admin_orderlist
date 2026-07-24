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
    <div className="flex flex-col gap-4 border-b border-white/5 bg-white/[0.02] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300">
            {viewMode === "day"
              ? "Bảng chi phí theo ngày"
              : "Bảng chi phí theo tháng"}
          </p>
        </div>
        <h2 className="mt-2 text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
          Form phân bổ chi phí
        </h2>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReload}
          className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-800/50 px-5 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-700/50 hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          <ArrowPathIcon className="h-4 w-4 transition-transform group-hover:rotate-180 duration-500" />
          Tải lại
        </button>
        <button
          type="button"
          onClick={onToggleViewMode}
          className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {viewMode === "day" ? "Xem theo tháng" : "Xem theo ngày"}
        </button>
      </div>
    </div>
  );
}
