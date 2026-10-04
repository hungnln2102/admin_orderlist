import React from "react";
import { Search, Filter, Archive, Layers } from "lucide-react";

interface WarehouseFilterBarProps {
  activeTab: "accounts" | "catalog";
  onTabChange: (tab: "accounts" | "catalog") => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  accountCount: number;
  catalogCount: number;
}

export const WarehouseFilterBar: React.FC<WarehouseFilterBarProps> = ({
  activeTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  accountCount,
  catalogCount,
}) => {
  return (
    <div className="space-y-4">
      {/* NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-px">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          <button
            onClick={() => onTabChange("accounts")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "accounts"
                ? "bg-slate-800/90 text-white shadow-md border border-slate-700/60"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Archive className="w-4 h-4 text-blue-400" />
            <span>Tài Khoản Kho & Slot Key</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300 font-medium">
              {accountCount}
            </span>
          </button>

          <button
            onClick={() => onTabChange("catalog")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "catalog"
                ? "bg-slate-800/90 text-white shadow-md border border-slate-700/60"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Danh Mục Tên Dịch Vụ</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 font-medium">
              {catalogCount}
            </span>
          </button>
        </div>
      </div>

      {/* SEARCH & FILTER TOOLBAR FOR ACCOUNTS */}
      {activeTab === "accounts" && (
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm theo email, tên sản phẩm, ghi chú..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Danh mục:</span>
              <select
                value={categoryFilter}
                onChange={(e) => onCategoryFilterChange(e.target.value)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-200">Tất cả</option>
                <option value="Thiết Kế Đồ Họa" className="bg-slate-900 text-slate-200">Thiết Kế Đồ Họa</option>
                <option value="Giải Trí & Phim" className="bg-slate-900 text-slate-200">Giải Trí & Phim</option>
                <option value="Trí Tuệ Nhân Tạo AI" className="bg-slate-900 text-slate-200">Trí Tuệ Nhân Tạo AI</option>
                <option value="Âm Nhạc" className="bg-slate-900 text-slate-200">Âm Nhạc</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <span>Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-200">Tất cả</option>
                <option value="AVAILABLE" className="bg-slate-900 text-slate-200">Có Slot Sẵn</option>
                <option value="RESERVED" className="bg-slate-900 text-slate-200">Đã Giữ Chỗ</option>
                <option value="EXPIRED" className="bg-slate-900 text-slate-200">Hết Hạn</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
