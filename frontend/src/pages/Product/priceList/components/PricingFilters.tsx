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
}) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/70 via-slate-900/60 to-indigo-950/70 p-6 text-white shadow-lg backdrop-blur">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
          <input
            type="text"
            placeholder="Tìm Kiếm Sản Phẩm..."
            className="w-full rounded-lg border border-white/20 bg-white/10 px-10 py-2 text-white placeholder:text-white/60 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/60"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <select
          className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/60"
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
        >
          <option value="all">Trạng Thái</option>
          <option value="active">Đang Hoạt Động</option>
          <option value="inactive">Tạm Dừng</option>
        </select>

        <GradientButton
          className="w-full justify-center"
          type="button"
          onClick={onRefresh}
          disabled={isLoading || isRefreshing}
        >
          {isLoading || isRefreshing ? "Đang Đồng Bộ..." : "Đồng Bộ Lại"}
        </GradientButton>
      </div>
      {error && (
        <div className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
};

export default PricingFilters;
