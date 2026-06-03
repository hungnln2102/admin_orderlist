import React from "react";
import { ExclamationTriangleIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { ProductFilterSelect } from "./ProductFilterSelect";
import type { ProductOption } from "../hooks/useWarehouseProducts";

type SearchBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  productFilter: string;
  onProductFilterChange: (value: string) => void;
  productOptions: ProductOption[];
  loadingProducts?: boolean;
  onCreate: () => void;
  loading: boolean;
  error: string | null;
};

export const SearchBar: React.FC<SearchBarProps> = ({
  search,
  onSearchChange,
  productFilter,
  onProductFilterChange,
  productOptions,
  loadingProducts,
  onCreate,
  loading,
  error,
}) => {
  return (
    <div className="space-y-3">
      <div className="min-w-0 rounded-[18px] border border-white/12 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-3 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm sm:p-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-indigo-300/70" />
            <input
              type="text"
              placeholder="Tìm kiếm tài khoản, email..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-400/70 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3 lg:shrink-0">
            <ProductFilterSelect
              value={productFilter}
              options={productOptions}
              onChange={onProductFilterChange}
              loading={loadingProducts}
            />
            <button
              type="button"
              onClick={onCreate}
              disabled={loading}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 hover:shadow-indigo-500/30 disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Thêm mới</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
