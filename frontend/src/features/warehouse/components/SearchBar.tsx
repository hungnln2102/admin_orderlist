import React from "react";
import { ExclamationTriangleIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { ProductFilterSelect } from "./ProductFilterSelect";
type SearchBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  productFilter: string;
  onProductFilterChange: (value: string) => void;
  statusFilter: "all" | "available" | "empty";
  onStatusFilterChange: (value: "all" | "available" | "empty") => void;
  productOptions: { value: string; label: string }[];
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
  statusFilter,
  onStatusFilterChange,
  productOptions,
  loadingProducts,
  onCreate,
  loading,
  error,
}) => {
  return (
    <div className="space-y-4">
      <div className="min-w-0 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-800/85 to-slate-950/80 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md sm:p-5">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center">
          {/* Search Box */}
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-indigo-400/80" />
            <input
              type="text"
              placeholder="Tìm kiếm tài khoản, email, mật khẩu..."
              className="w-full rounded-2xl border border-white/5 bg-slate-950/50 py-3 !pl-12 pr-4 text-sm text-white placeholder:text-slate-500 outline-none ring-offset-0 transition-all focus:border-indigo-500/60 focus:bg-slate-950/70 focus:ring-2 focus:ring-indigo-500/20"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
              </div>
            )}
          </div>

          {/* Filters & Actions */}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 lg:shrink-0">
            {/* Status Filter Tab Selector */}
            <div className="flex bg-slate-950/50 p-1 rounded-2xl border border-white/5 w-full sm:w-auto shadow-inner">
              {(["all", "available", "empty"] as const).map((status) => {
                const isActive = statusFilter === status;
                const label = status === "all" ? "Tất cả" : status === "available" ? "Còn tồn" : "Hết hàng";
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onStatusFilterChange(status)}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-500/90 to-purple-600/90 text-white shadow-lg shadow-indigo-500/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
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
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 hover:shadow-indigo-500/35 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Thêm mới</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs shadow-lg animate-in fade-in duration-200">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
