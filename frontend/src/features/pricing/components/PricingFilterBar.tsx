import React from "react";
import {
  Search,
  RefreshCw,
  Download,
  Plus,
  Filter,
  Tag,
  Package,
  CheckCircle2,
  EyeOff,
} from "lucide-react";
import { PricingStatusTab, PricingCounts } from "../types";

interface PricingFilterBarProps {
  search: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
  onRefresh: () => void;
  onExportExcel: () => void;
  onOpenCreateModal: () => void;
  displayCount: number;
  totalCount: number;
  activeTab: PricingStatusTab;
  onTabChange: (tab: PricingStatusTab) => void;
  counts: PricingCounts;
}

export const PricingFilterBar: React.FC<PricingFilterBarProps> = ({
  search,
  onSearchChange,
  loading,
  onRefresh,
  onExportExcel,
  onOpenCreateModal,
  displayCount,
  totalCount,
  activeTab,
  onTabChange,
  counts,
}) => {
  const PRICING_TABS = [
    {
      key: "all" as PricingStatusTab,
      label: "Tổng Sản Phẩm",
      description: "Toàn bộ danh mục bảng giá",
      count: counts.total,
      icon: <Package className="w-5 h-5 text-cyan-400" />,
      iconBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      gradient: "from-cyan-500/20 via-sky-500/10 to-transparent",
      borderColor: "border-cyan-500/40",
      ringColor: "ring-cyan-500/30",
      activeText: "text-cyan-300",
      badgeActive: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm",
    },
    {
      key: "active" as PricingStatusTab,
      label: "Sản Phẩm Đang Hoạt Động",
      description: "Đang mở bán & hiển thị tạo đơn",
      count: counts.active,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
      borderColor: "border-emerald-500/40",
      ringColor: "ring-emerald-500/30",
      activeText: "text-emerald-300",
      badgeActive: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm",
    },
    {
      key: "inactive" as PricingStatusTab,
      label: "Sản Phẩm Ngừng Hoạt Động",
      description: "Đã ẩn khỏi dropdown tạo đơn",
      count: counts.inactive,
      icon: <EyeOff className="w-5 h-5 text-amber-400" />,
      iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      gradient: "from-amber-500/20 via-slate-500/10 to-transparent",
      borderColor: "border-amber-500/40",
      ringColor: "ring-amber-500/30",
      activeText: "text-amber-300",
      badgeActive: "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm",
    },
  ];

  return (
    <div className="space-y-5">
      {/* 3 Dataset Tabs theo chỉ đạo của Master: Tổng / Đang hoạt động / Ngừng hoạt động */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {PRICING_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`relative overflow-hidden text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                isActive
                  ? `bg-slate-900 ${tab.borderColor} shadow-lg shadow-black/40 ring-1 ${tab.ringColor}`
                  : "bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/80 hover:border-slate-700/80"
              }`}
            >
              {isActive && (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${tab.gradient} pointer-events-none opacity-80`}
                />
              )}
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${tab.iconBg}`}>
                    {tab.icon}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-black tracking-wide ${
                        isActive ? tab.activeText : "text-slate-200"
                      }`}
                    >
                      {tab.label}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {tab.description}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black shrink-0 ${
                    isActive
                      ? tab.badgeActive
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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-md">
              DANH MỤC SẢN PHẨM & GIÁ
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Đang Hoạt Động
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-cyan-400" />
            Bảng Giá Niêm Yết
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Điều chỉnh giá bán lẻ, giá CTV, giá Sinh Viên, giá Khuyến Mãi và giá gốc theo dữ liệu thực tế hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Làm mới bảng giá"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={onExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 hover:brightness-110 rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Mới</span>
          </button>
        </div>
      </div>

      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm, tên gói..."
            value={search}
            onChange={onSearchChange}
            className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/60">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hiển thị: <strong className="text-cyan-300 font-semibold">{displayCount}</strong> / {totalCount} kết quả</span>
          </span>
        </div>
      </div>
    </div>
  );
};
