import React, { useState } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { StatCard } from "@/shared/components/StatCard";
import { Search, Plus, Download, RefreshCw, Filter, CheckCircle2 } from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";

export interface GenericPageProps {
  title: string;
  category: string;
  description: string;
  badge?: string;
  stats?: { title: string; value: string; subtitle?: string; accent?: any }[];
  columns: { key: string; label: string }[];
  sampleData: Record<string, any>[];
  onAddClick?: () => void;
}

export const GenericPage: React.FC<GenericPageProps> = ({
  title,
  category,
  description,
  badge = "Đang Hoạt Động",
  stats = [],
  columns,
  sampleData,
}) => {
  const notify = useNotification();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = sampleData.filter((item) =>
    Object.values(item).some((val) =>
      String(val ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">{category}</span>
            <span className="text-slate-600">•</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
              {badge}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">{title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => notify.success("Đã làm mới dữ liệu trang thành công", title)}
            className="p-2.5 glass-card rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => notify.info("Tính năng Xuất Excel đang được khởi tạo", "Thông Báo")}
            className="glass-card px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-2 hover:text-white"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
          <button
            onClick={() => notify.info(`Giao diện Tạo Mới cho ${title} đang được phát triển`, "Tính Năng Mới")}
            className="glass-button-primary px-4 py-2.5 rounded-xl text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Mới</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row (if provided) */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, idx) => (
            <StatCard
              key={idx}
              title={s.title}
              value={s.value}
              subtitle={s.subtitle}
              icon={CheckCircle2}
              accent={s.accent || "cyan"}
            />
          ))}
        </div>
      )}

      {/* Main Table Panel */}
      <GlassCard glow="cyan" className="space-y-4">
        {/* Table Filters Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm thông tin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => notify.info("Bộ lọc dữ liệu nâng cao", "Bộ Lọc")}
              className="glass-card px-3 py-2 rounded-xl text-xs text-slate-400 flex items-center gap-1.5 hover:text-white"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Bộ lọc</span>
            </button>
            <span className="text-xs text-slate-500 font-mono">
              Hiển thị: {filteredData.length} kết quả
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3">
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredData.length > 0 ? (
                filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5 whitespace-nowrap">
                        {String(row[col.key] ?? "-")}
                      </td>
                    ))}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => notify.info(`Chi tiết bản ghi: ${Object.values(row)[0]}`, title)}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 text-[11px] font-semibold"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} className="py-12 text-center text-slate-500">
                    Không tìm thấy dữ liệu phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
