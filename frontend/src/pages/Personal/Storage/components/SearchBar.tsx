import React from "react";
import { ExclamationTriangleIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";

type SearchBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
  loading: boolean;
  error: string | null;
};

export const SearchBar: React.FC<SearchBarProps> = ({
  search,
  onSearchChange,
  onCreate,
  loading,
  error,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm tài khoản, loại sản phẩm..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            </div>
          )}
        </div>

        <button
          onClick={onCreate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 whitespace-nowrap"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Thêm mới</span>
        </button>
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
