import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";

interface PricingFiltersProps {
  searchTerm: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onAddProduct: () => void;
}

const PricingFilters: React.FC<PricingFiltersProps> = ({
  searchTerm,
  isLoading,
  isRefreshing,
  error,
  onSearchChange,
  onRefresh,
  onAddProduct,
}) => {
  return (
    <div className="pricing-filters space-y-4">
      <div className="pricing-filters__panel rounded-[32px] border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-4 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm lg:p-5">
        <div className="pricing-filters__row flex flex-col items-center gap-4 lg:flex-row">
          <div className="pricing-filters__search relative w-full lg:flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-indigo-300" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 py-2.5 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-400/70 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
              style={{ paddingLeft: "3.25rem" }}
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>

          <div className="flex w-full flex-wrap items-center justify-end gap-3 lg:w-auto">
            <GradientButton
              onClick={onAddProduct}
              className="!px-5 !py-2.5 text-sm"
            >
              Thêm sản phẩm
            </GradientButton>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading || isRefreshing}
              className={`rounded-2xl border px-5 py-2.5 text-sm font-semibold transition-all ${
                isLoading || isRefreshing
                  ? "cursor-not-allowed border-white/5 bg-white/5 text-white/30"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {isLoading || isRefreshing ? "Đang đồng bộ..." : "Đồng bộ lại"}
            </button>
          </div>
        </div>
      </div>
      {error && (
        <div className="mt-6 animate-in fade-in slide-in-from-top-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm text-rose-200 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingFilters;
