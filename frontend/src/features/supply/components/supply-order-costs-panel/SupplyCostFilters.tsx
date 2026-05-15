import type React from "react";

import type { Supply } from "../../types";
import type { ActiveSupplyTab } from "./types";

type SupplyCostFiltersProps = {
  activeTab: ActiveSupplyTab;
  supplies: Supply[];
  supplyId: string;
  q: string;
  onSupplyIdChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onOpenCreateLog: () => void;
};

const SupplyCostFilters: React.FC<SupplyCostFiltersProps> = ({
  activeTab,
  supplies,
  supplyId,
  q,
  onSupplyIdChange,
  onQueryChange,
  onSearch,
  onReset,
  onOpenCreateLog,
}) => {
  const isNccCostsTab = activeTab === "nccCosts";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {isNccCostsTab ? (
        <>
          <label className="flex min-w-[200px] flex-col gap-1 text-xs text-white/50">
            Nhà cung cấp
            <select
              value={supplyId === "" ? "all" : supplyId}
              onChange={(event) => {
                const value = event.target.value;
                onSupplyIdChange(value === "all" ? "" : value);
              }}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-indigo-400/60 focus:outline-none"
            >
              <option value="all">Tất cả NCC</option>
              {supplies.map((supply) => (
                <option key={supply.id} value={String(supply.id)}>
                  {supply.sourceName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-white/50">
            Mã đơn
            <input
              type="text"
              value={q}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSearch();
              }}
              placeholder="Tìm theo mã đơn..."
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-indigo-400/60 focus:outline-none"
            />
          </label>
        </>
      ) : (
        <div className="min-w-[280px] flex-1 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2 text-sm text-white/70">
          Danh sách log nhập hàng ngoài luồng
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOpenCreateLog}
          className="rounded-xl border border-emerald-400/40 bg-emerald-600/25 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500/40"
        >
          Tạo log nhập hàng
        </button>
        {isNccCostsTab ? (
          <>
            <button
              type="button"
              onClick={onSearch}
              className="rounded-xl border border-indigo-400/40 bg-indigo-600/40 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500/50"
            >
              Tìm
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              Xóa lọc
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default SupplyCostFilters;
