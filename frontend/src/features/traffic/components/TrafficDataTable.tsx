import React from "react";
import { Eye, Users, Activity, Clock, Percent, UserCheck, RefreshCw, Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Globe, Smartphone, Monitor, Tablet, ExternalLink, Calendar, Share2, FileText, MapPin, CheckCircle2, Info, BarChart3, Layers } from "lucide-react";
import { GlassCard } from "@/shared/components/GlassCard";
import { TablePagination } from "@/shared/components/TablePagination";
import { DailyTrafficItem, DeviceItem, LocationItem, SourceItem, TopPageItem, TrafficApiResponse } from "../types";

type TrafficTab = "daily" | "sources" | "pages" | "devices" | "locations";

interface TrafficDataTableProps {
  data: TrafficApiResponse | null;
  activeTab: TrafficTab;
  setActiveTab: React.Dispatch<React.SetStateAction<TrafficTab>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  handleExportCSV: () => void;
  handleSort: (field: string) => void;
  paginatedData: any[];
  loading: boolean;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  maxVal: number;
}

export const TrafficDataTable: React.FC<TrafficDataTableProps> = ({ data, activeTab, setActiveTab, searchTerm, setSearchTerm, handleExportCSV, handleSort, paginatedData, loading, totalPages, currentPage, pageSize, setCurrentPage, setPageSize, maxVal }) => (
  <>
      {/* 4. HỆ THỐNG 5 BẢNG STAT ĐẦY ĐỦ (Tabbed Multi-Dimension Tables) */}
      <GlassCard className="!p-6 space-y-5">
        {/* Header Tabs & Công Cụ (Search, Export) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          {/* 5 Tab chuyển đổi */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "daily", label: "Theo Ngày", icon: Calendar, count: data?.trafficData?.length || 0 },
              { id: "sources", label: "Nguồn & Kênh", icon: Share2, count: data?.sourceData?.length || 0 },
              { id: "pages", label: "Trang Phổ Biến", icon: FileText, count: data?.topPages?.length || 0 },
              { id: "devices", label: "Thiết Bị & Nền Tảng", icon: Monitor, count: data?.deviceData?.length || 0 },
              { id: "locations", label: "Vị Trí & Khu Vực", icon: MapPin, count: data?.locationData?.length || 0 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-sky-500/20 to-blue-500/20 text-sky-300 border border-sky-500/40 shadow-lg shadow-sky-500/10"
                      : "bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800/80"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isActive ? "bg-sky-500/30 text-white" : "bg-slate-800 text-slate-400"}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Ô Search & Nút Export CSV */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm trong bảng..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <button
              onClick={handleExportCSV}
              title="Xuất bảng ra file CSV"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-md shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
          </div>
        </div>

        {/* Nội Dung Bảng Tương Ứng Với Tab Được Chọn */}
        <div className="overflow-x-auto min-h-[320px]">
          {/* TAB 1: BẢNG THEO NGÀY */}
          {activeTab === "daily" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 font-bold cursor-pointer hover:text-white" onClick={() => handleSort("date")}>
                    <div className="flex items-center gap-1">
                      <span>Ngày</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("pageviews")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Lượt Xem (Views)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("visitors")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Khách (Users)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("sessions")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Số Phiên (Sessions)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("bounceRate")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Tỷ Lệ Thoát</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right">Thời Lượng TB</th>
                  <th className="py-3 px-4 font-bold text-center">Tỷ Trọng Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                {paginatedData.map((row: DailyTrafficItem, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-200">{row.date}</td>
                    <td className="py-3 px-4 text-right text-indigo-300 font-bold">{row.pageviews.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right text-sky-300 font-bold">{row.visitors.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{row.sessions.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${row.bounceRate > 45 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        {row.bounceRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-sans">{row.avgDuration}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden mx-auto">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(10, (row.pageviews / (maxVal || 1)) * 100))}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 2: BẢNG NGUỒN & KÊNH LƯU LƯỢNG */}
          {activeTab === "sources" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 font-bold">Kênh / Nguồn Lưu Lượng</th>
                  <th className="py-3 px-4 font-bold">Phân Loại (Channel)</th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("sessions")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Số Phiên (Sessions)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("users")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Người Dùng</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right">Khách Mới</th>
                  <th className="py-3 px-4 font-bold text-right">Tỷ Lệ Thoát</th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("share")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Tỷ Trọng (%)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedData.map((row: SourceItem, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                      <span>{row.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{row.channel || "Organic"}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">{row.sessions.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-sky-300">{row.users.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">{(row.newUsers || 0).toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">{row.bounceRate}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-md">
                        {row.share}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 3: BẢNG TRANG ĐÍCH PHỔ BIẾN */}
          {activeTab === "pages" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 font-bold">Đường Dẫn (URL Path)</th>
                  <th className="py-3 px-4 font-bold">Tiêu Đề Trang</th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("views")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Lượt Xem (Views)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("users")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Khách Xem</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right">Thời Lượng Trên Trang</th>
                  <th className="py-3 px-4 font-bold text-right">Tỷ Lệ Thoát</th>
                  <th className="py-3 px-4 font-bold text-center">Xem Web</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedData.map((row: TopPageItem, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-sky-400 max-w-[200px] truncate" title={row.path}>
                      {row.path}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium max-w-[260px] truncate" title={row.title}>
                      {row.title}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">{row.views.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">{row.users.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-amber-300">{row.time}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">{row.bounceRate}</td>
                    <td className="py-3 px-4 text-center">
                      <a
                        href={`https://mavrykpremium.com${row.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Mở trang trên web"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 4: BẢNG THIẾT BỊ & NỀN TẢNG */}
          {activeTab === "devices" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 font-bold">Loại Thiết Bị</th>
                  <th className="py-3 px-4 font-bold">Hệ Điều Hành (OS)</th>
                  <th className="py-3 px-4 font-bold">Trình Duyệt Chính</th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("sessions")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Số Phiên (Sessions)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("users")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Người Dùng</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("share")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Tỷ Trọng (%)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedData.map((row: DeviceItem, i) => {
                  const Icon = row.device.toLowerCase().includes("mobile") ? Smartphone : row.device.toLowerCase().includes("tablet") ? Tablet : Monitor;
                  return (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <Icon className="w-4 h-4 text-sky-400" />
                        <span>{row.device}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{row.os}</td>
                      <td className="py-3 px-4 text-slate-400">{row.browser}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">{row.sessions.toLocaleString("vi-VN")}</td>
                      <td className="py-3 px-4 text-right font-mono text-sky-300">{row.users.toLocaleString("vi-VN")}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-md">
                          {row.share}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* TAB 5: BẢNG KHU VỰC & ĐỊA LÝ */}
          {activeTab === "locations" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 font-bold">Tỉnh / Thành Phố</th>
                  <th className="py-3 px-4 font-bold">Quốc Gia</th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("sessions")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Số Phiên (Sessions)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("users")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Người Dùng</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("share")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Tỷ Trọng (%)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedData.map((row: LocationItem, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span>{row.city}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{row.country}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">{row.sessions.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-sky-300">{row.users.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        {row.share}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {paginatedData.length === 0 && !loading && (
            <div className="py-12 text-center text-slate-500 text-sm">Không tìm thấy bản ghi nào phù hợp với bộ lọc tìm kiếm.</div>
          )}
        </div>

        {/* Thanh Phân Trang (Pagination) */}
        {totalPages > 1 && (
          <div className="pt-2">
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              className="pt-4 border-t border-slate-800"
            />
          </div>
        )}
      </GlassCard>
  </>
);
