import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import GradientButton from "../../../../components/ui/GradientButton";
import { StatusFilter } from "../types";

interface PricingFiltersProps {
  searchTerm: string;
  statusFilter: StatusFilter;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onRefresh: () => void;
  onAddProduct: () => void;
}

const PricingFilters: React.FC<PricingFiltersProps> = ({
  searchTerm,
  statusFilter,
  isLoading,
  isRefreshing,
  error,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onAddProduct,
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Search Group */}
          <div className="relative w-full lg:flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300 pointer-events-none z-10 opaciy-70" />
            <input
              type="text"
              placeholder="Tìm Kiếm Sản Phẩm..."
              className="w-full pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
              style={{ paddingLeft: '3.25rem' }}
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>

          {/* Filter & Action Group */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>

            <div className="relative w-full lg:w-[170px]">
              <select
                className="w-full px-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none cursor-pointer transition-all appearance-none"
                style={{ 
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%23818cf8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'m19.5 8.25-7.5 7.5-7.5-7.5\' /%3E%3C/svg%3E")', 
                  backgroundPosition: 'right 1rem center', 
                  backgroundRepeat: 'no-repeat', 
                  backgroundSize: '1.1rem', 
                  paddingRight: '2.5rem' 
                }}
                value={statusFilter}
                onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
              >
                <option value="all" className="bg-slate-900 text-white">Trạng Thái</option>
                <option value="active" className="bg-slate-900 text-white">Đang Hoạt Động</option>
                <option value="inactive" className="bg-slate-900 text-white">Tạm Dừng</option>
              </select>
            </div>

            <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>

            <GradientButton
              onClick={onAddProduct}
              className="!py-2.5 !px-5 text-sm"
            >
              Thêm Sản Phẩm
            </GradientButton>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading || isRefreshing}
              className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
                isLoading || isRefreshing
                  ? "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
                  : "bg-white/5 text-white border-white/10 hover:bg-white/10"
              }`}
            >
              {isLoading || isRefreshing ? "Đang Đồng Bộ..." : "Đồng Bộ Lại"}
            </button>
          </div>
        </div>
      </div>
      {error && (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm text-rose-200 backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></div>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingFilters;
