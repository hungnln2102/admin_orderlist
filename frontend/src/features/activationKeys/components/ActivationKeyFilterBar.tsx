import React from "react";
import { Search, Plus, RefreshCw, KeyRound, Filter } from "lucide-react";
import { CatalogProductOption } from "../types";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  selectedProductId: string;
  onProductChange: (id: string) => void;
  products: CatalogProductOption[];
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const ActivationKeyFilterBar: React.FC<Props> = ({
  search,
  onSearchChange,
  selectedProductId,
  onProductChange,
  products,
  onOpenCreateModal,
  onRefresh,
  loading,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
      <div className="flex flex-1 items-center gap-2.5">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo Mã Key, Đơn hàng, Tài khoản đã cấp, Khách hàng..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Product dropdown filter */}
        <div className="relative min-w-[180px]">
          <select
            value={selectedProductId}
            onChange={(e) => onProductChange(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer"
          >
            <option value="">Tất cả Sản phẩm</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all active:scale-95 disabled:opacity-50"
          title="Tải lại danh sách"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
        </button>

        <button
          type="button"
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Mã Key</span>
        </button>
      </div>
    </div>
  );
};

