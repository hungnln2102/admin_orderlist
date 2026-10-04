import React from "react";
import { Search, Filter, Plus, Download } from "lucide-react";

interface PackageFilterBarProps {
  selectedCategory: string;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onOpenAddItem: () => void;
  onExportExcel: () => void;
}

export const PackageFilterBar: React.FC<PackageFilterBarProps> = ({
  selectedCategory,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenAddItem,
  onExportExcel,
}) => {
  return (
    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row items-center justify-between gap-4">
      {/* Search Bar */}
      <div className="relative w-full lg:flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={`Tìm kiếm trong các gói của ${selectedCategory}...`}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Filter Dropdown & Actions */}
      <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto custom-scrollbar">
        <div className="relative shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none pr-8"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Còn sẵn slot</option>
            <option value="warning">Sắp hết slot</option>
            <option value="expired">Đã hết / Khóa</option>
          </select>
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          onClick={onOpenAddItem}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-950/40 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm Gói</span>
        </button>

        <button
          onClick={onExportExcel}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-slate-700/50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Xuất Excel</span>
        </button>
      </div>
    </div>
  );
};
