import type React from "react";
import type { Supply } from "../../types";

type SupplyCostFiltersProps = {
  supplies: Supply[];
  supplyId: string;
  q: string;
  onSupplyIdChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
};

const SupplyCostFilters: React.FC<SupplyCostFiltersProps> = ({
  supplies,
  supplyId,
  q,
  onSupplyIdChange,
  onQueryChange,
  onSearch,
  onReset,
}) => {
  return (
    <div className="rounded-3xl bg-slate-950/40 border border-white/5 p-4 lg:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-2xl flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end w-full">
      <div className="relative flex flex-col gap-1.5 w-full sm:w-[220px]">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200/50 pl-2">Nhà cung cấp</span>
        <div className="relative">
          <select
            value={supplyId === "" ? "all" : supplyId}
            onChange={(event) => {
              const value = event.target.value;
              onSupplyIdChange(value === "all" ? "" : value);
            }}
            className="w-full px-4 py-3 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none cursor-pointer transition-all appearance-none"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%23818cf8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'m19.5 8.25-7.5 7.5-7.5-7.5\' /%3E%3C/svg%3E")',
              backgroundPosition: "right 1rem center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.1rem",
              paddingRight: "2.5rem",
            }}
          >
            <option value="all" className="bg-slate-900 text-white">Tất cả NCC</option>
            {supplies.map((supply) => (
              <option key={supply.id} value={String(supply.id)} className="bg-slate-900 text-white">
                {supply.sourceName}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="relative flex flex-col gap-1.5 flex-1 w-full">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200/50 pl-2">Mã đơn</span>
        <input
          type="text"
          value={q}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSearch();
          }}
          placeholder="Tìm theo mã đơn..."
          className="w-full px-4 py-3 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
        />
      </div>

      <div className="flex gap-2 w-full sm:w-auto mt-1 sm:mt-0">
        <button
          type="button"
          onClick={onSearch}
          className="flex-1 sm:flex-none rounded-2xl border border-indigo-500/30 bg-indigo-500/20 px-6 py-3 text-sm font-bold tracking-wide text-indigo-300 hover:bg-indigo-500/30 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all active:scale-95"
        >
          Tìm
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 sm:flex-none rounded-2xl border border-transparent bg-white/5 px-4 py-3 text-sm font-bold tracking-wide text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
        >
          Xóa lọc
        </button>
      </div>
    </div>
  );
};

export default SupplyCostFilters;
