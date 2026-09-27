import React from "react";
import { Search, Filter, DollarSign, CheckCircle2, Clock } from "lucide-react";
import { OrderDatasetKey } from "../types";
import { DateRangePicker } from "@/shared/components/DateRangePicker";

interface OrderFilterBarProps {
  activeTab: OrderDatasetKey;
  onTabChange: (tab: OrderDatasetKey) => void;
  tabCounts: { active: number; import: number; expired: number; canceled: number };
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string) => void;
  totalRevenue: number;
  paidCount: number;
  pendingCount: number;
}

export const OrderFilterBar: React.FC<OrderFilterBarProps> = ({
  activeTab,
  onTabChange,
  tabCounts,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  startDate,
  endDate,
  onDateRangeChange,
  totalRevenue,
  paidCount,
  pendingCount,
}) => {
  const DATASET_TABS_CONFIG = [
    {
      key: "active" as OrderDatasetKey,
      label: "Đơn Bán Khách Hàng",
      description: "Danh sách đơn hàng bán lẻ & CTV",
      count: tabCounts.active,
      gradient: "from-cyan-500/20 via-sky-500/10 to-transparent",
      borderColor: "border-cyan-500/40",
      activeText: "text-cyan-300",
    },
    {
      key: "import" as OrderDatasetKey,
      label: "Đơn Nhập Kho & NCC",
      description: "Quản lý đơn vốn nhập kho & nhà cung cấp",
      count: tabCounts.import,
      gradient: "from-purple-500/20 via-indigo-500/10 to-transparent",
      borderColor: "border-purple-500/40",
      activeText: "text-purple-300",
    },
    {
      key: "expired" as OrderDatasetKey,
      label: "Đơn Hết Hạn",
      description: "Danh sách đơn hàng đã hết thời hạn",
      count: tabCounts.expired,
      gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      borderColor: "border-amber-500/40",
      activeText: "text-amber-300",
    },
    {
      key: "canceled" as OrderDatasetKey,
      label: "Hoàn Tiền & Đã Hủy",
      description: "Đơn đã hoàn, chưa hoàn tiền & đơn hủy",
      count: tabCounts.canceled,
      gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
      borderColor: "border-rose-500/40",
      activeText: "text-rose-300",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Doanh Thu Trang Này</div>
            <div className="text-lg font-bold text-white tracking-tight">
              {new Intl.NumberFormat("vi-VN").format(totalRevenue)} ₫
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Đã Thanh Toán</div>
            <div className="text-lg font-bold text-white tracking-tight">{paidCount} đơn hàng</div>
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Chờ Xử Lý / Gia Hạn</div>
            <div className="text-lg font-bold text-white tracking-tight">{pendingCount} đơn hàng</div>
          </div>
        </div>
      </div>

      {/* Dataset Tabs (4 Tabs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {DATASET_TABS_CONFIG.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`relative overflow-hidden text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                isActive
                  ? `bg-slate-900 ${tab.borderColor} shadow-lg shadow-black/40 ring-1 ring-cyan-500/30`
                  : "bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/80 hover:border-slate-700/80"
              }`}
            >
              {isActive && (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${tab.gradient} pointer-events-none opacity-80`}
                />
              )}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <div>
                  <div
                    className={`text-sm font-bold tracking-wide ${
                      isActive ? tab.activeText : "text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {tab.description}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    isActive
                      ? "bg-white/10 text-white border border-white/20 shadow-sm"
                      : "bg-slate-800 text-slate-400 border border-slate-700/50"
                  }`}
                >
                  {new Intl.NumberFormat("vi-VN").format(tab.count)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo Mã đơn (MAV...), Khách hàng, SĐT, Thông tin..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Tất cả trạng thái</option>
              <option value="Đã Thanh Toán" className="bg-slate-900 text-white">Đã Thanh Toán</option>
              <option value="Chưa Thanh Toán" className="bg-slate-900 text-white">Chưa Thanh Toán</option>
              <option value="Cần gia hạn" className="bg-slate-900 text-white">Cần gia hạn</option>
              <option value="Hết Hạn" className="bg-slate-900 text-white">Hết Hạn</option>
              <option value="Chưa Hoàn" className="bg-slate-900 text-white">Chưa Hoàn Tiền</option>
              <option value="Đã Hoàn" className="bg-slate-900 text-white">Đã Hoàn Tiền</option>
              <option value="Đã Hủy" className="bg-slate-900 text-white">Đã Hủy</option>
            </select>
          </div>

          {/* Date Range Picker */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={onDateRangeChange}
          />
        </div>
      </div>
    </div>
  );
};
