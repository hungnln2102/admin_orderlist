import React from "react";
import { Search, RefreshCw, Plus, ShoppingBag, DollarSign, RotateCcw, Clock } from "lucide-react";

interface SupplierFilterBarProps {
  stats: {
    totalOrders: number;
    totalImportCost: number;
    totalRefund: number;
    totalUnpaidCost: number;
  };
  searchOverview: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  activeFilter: string;
  onFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  sortBy: string;
  onSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  loadingOverview: boolean;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  formatCurrency: (val: number) => string;
}

export const SupplierFilterBar: React.FC<SupplierFilterBarProps> = ({
  stats,
  searchOverview,
  onSearchChange,
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  loadingOverview,
  onRefresh,
  onOpenCreateModal,
  formatCurrency,
}) => {
  return (
    <>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-md">
              HỆ THỐNG ĐỐI TÁC
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Realtime Database
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            Quản Lý Nhà Cung Cấp & Công Nợ
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi chi tiết danh sách NCC, công nợ tổng hợp, ngân hàng thanh toán và lịch sử giao dịch.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onRefresh}
            disabled={loadingOverview}
            className="p-2.5 text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loadingOverview ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 hover:brightness-110 rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm NCC Mới</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng Đơn Nhập</div>
            <div className="text-xl font-black text-white mt-1">{stats.totalOrders} <span className="text-xs font-normal text-slate-400">đơn</span></div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng Tiền Nhập</div>
            <div className="text-xl font-black text-emerald-400 mt-1">{formatCurrency(stats.totalImportCost)}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng Hoàn Tiền</div>
            <div className="text-xl font-black text-purple-400 mt-1">{formatCurrency(stats.totalRefund)}</div>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Còn Nợ NCC</div>
            <div className="text-xl font-black text-amber-400 mt-1">{formatCurrency(stats.totalUnpaidCost)}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên NCC, STK bank..."
            value={searchOverview}
            onChange={onSearchChange}
            className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={onSortChange}
            className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="priority">Ưu tiên còn nợ lớn nhất</option>
            <option value="name">Tên NCC (A-Z)</option>
            <option value="orders">Tổng đơn nhập nhiều nhất</option>
          </select>

          <select
            value={activeFilter}
            onChange={onFilterChange}
            className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hợp tác</option>
            <option value="inactive">Ngưng hợp tác</option>
          </select>
        </div>
      </div>
    </>
  );
};
