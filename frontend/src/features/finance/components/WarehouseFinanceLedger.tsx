import React from "react";
import { Clock, History, X } from "lucide-react";
import type { PackageFinancialItem, SlotDailyLogItem } from "./warehouseFinanceTypes";

interface WarehouseFinanceLedgerProps {
  isActive: boolean;
  packages: PackageFinancialItem[];
  logs: SlotDailyLogItem[];
  pagination: { page: number; totalItems: number; totalPages: number };
  stats: { totalVacantCost: number; totalVacantSlots: number };
  loading: boolean;
  filterDate: string;
  onFilterDateChange: (value: string) => void;
  filterFromDate: string;
  onFilterFromDateChange: (value: string) => void;
  filterToDate: string;
  onFilterToDateChange: (value: string) => void;
  packageFilter: string;
  onPackageFilterChange: (value: string) => void;
  onFetchPage: (page: number) => void;
  formatMoney: (value: number | undefined | null) => string;
}

export function WarehouseFinanceLedger(props: WarehouseFinanceLedgerProps) {
  const subTab = props.isActive ? "LEDGER" : "PACKAGES";
  const validFinancialPackages = props.packages;
  const logs = props.logs;
  const logsPagination = props.pagination;
  const logsStats = props.stats;
  const loadingLogs = props.loading;
  const logFilterDate = props.filterDate;
  const setLogFilterDate = props.onFilterDateChange;
  const logFilterFromDate = props.filterFromDate;
  const setLogFilterFromDate = props.onFilterFromDateChange;
  const logFilterToDate = props.filterToDate;
  const setLogFilterToDate = props.onFilterToDateChange;
  const selectedPackageFilter = props.packageFilter;
  const setSelectedPackageFilter = props.onPackageFilterChange;
  const fetchLogs = props.onFetchPage;
  const fmt = props.formatMoney;

  if (subTab !== "LEDGER") return null;

  return (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Toolbar Bộ Lọc Sổ Cái */}
          <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {/* Lọc theo ngày cụ thể */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                  <span className="text-slate-500 text-[11px] font-semibold">Ngày:</span>
                  <input
                    type="date"
                    value={logFilterDate}
                    onChange={(e) => {
                      setLogFilterDate(e.target.value);
                      setLogFilterFromDate("");
                      setLogFilterToDate("");
                    }}
                    className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                  />
                  {logFilterDate && (
                    <button
                      onClick={() => setLogFilterDate("")}
                      className="text-slate-500 hover:text-white ml-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Hoặc Lọc theo khoảng ngày (From - To) */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                  <span className="text-slate-500 text-[11px] font-semibold">Từ:</span>
                  <input
                    type="date"
                    value={logFilterFromDate}
                    onChange={(e) => {
                      setLogFilterFromDate(e.target.value);
                      setLogFilterDate("");
                    }}
                    className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                  />
                  <span className="text-slate-500 text-[11px] font-semibold">Đến:</span>
                  <input
                    type="date"
                    value={logFilterToDate}
                    onChange={(e) => {
                      setLogFilterToDate(e.target.value);
                      setLogFilterDate("");
                    }}
                    className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                  />
                  {(logFilterFromDate || logFilterToDate) && (
                    <button
                      onClick={() => {
                        setLogFilterFromDate("");
                        setLogFilterToDate("");
                      }}
                      className="text-slate-500 hover:text-white ml-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Lọc theo gói cụ thể */}
                <select
                  value={selectedPackageFilter}
                  onChange={(e) => setSelectedPackageFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả gói kho ({validFinancialPackages.length})</option>
                  {validFinancialPackages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.importOrderCode})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => fetchLogs(1)}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 font-bold transition-colors cursor-pointer"
                >
                  Áp dụng
                </button>
              </div>

              {/* Thống kê nhanh trong bộ lọc */}
              <div className="text-xs font-mono text-slate-400 flex items-center gap-4">
                <div>
                  Tổng khấu trừ P&L lọc được:{" "}
                  <strong className="text-rose-400 font-bold font-mono">-{fmt(logsStats.totalVacantCost)} ₫</strong>
                </div>
                <div>
                  Tổng lượt slot trống:{" "}
                  <strong className="text-amber-300 font-bold font-mono">{logsStats.totalVacantSlots} lượt</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Table Sổ Cái Kế Toán */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[950px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-950/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider select-none">
                    <th className="py-4 px-4 w-32">NGÀY GHI SỔ</th>
                    <th className="py-4 px-4">GÓI SẢN PHẨM</th>
                    <th className="py-4 px-4">ĐƠN NHẬP (MAVN)</th>
                    <th className="py-4 px-4 text-center">VỊ TRÍ (THUÊ / TRỐNG / TỔNG)</th>
                    <th className="py-4 px-4 text-right">VỐN 1 SLOT / NGÀY</th>
                    <th className="py-4 px-4 text-right">KHẤU TRỪ VÀO LỢI NHUẬN</th>
                    <th className="py-4 px-4 min-w-[200px]">DIỄN GIẢI KẾ TOÁN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                          <span>Đang nạp dữ liệu sổ cái slot...</span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-500">
                        Không có dữ liệu sổ cái chi phí slot nào trong khoảng thời gian này.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* 1. Ngày ghi sổ */}
                        <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{log.log_date}</span>
                          </div>
                        </td>

                        {/* 2. Tên gói kho */}
                        <td className="py-3.5 px-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span>{log.package_name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">#{log.package_product_id}</span>
                          </div>
                        </td>

                        {/* 3. Đơn Nhập */}
                        <td className="py-3.5 px-4 font-mono">
                          <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            #{log.import_order_code}
                          </span>
                        </td>

                        {/* 4. Slot (Thuê / Trống / Tổng) */}
                        <td className="py-3.5 px-4 text-center font-mono">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                            <span className="text-emerald-400 font-bold">{log.occupied_slots} thuê</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-rose-400 font-bold">{log.vacant_slots} trống</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-slate-400">{log.total_slots} tổng</span>
                          </div>
                        </td>

                        {/* 5. Vốn 1 slot/ngày */}
                        <td className="py-3.5 px-4 text-right font-mono text-amber-300 font-bold">
                          {fmt(log.cost_per_slot_day)} ₫
                        </td>

                        {/* 6. Khấu trừ vào P&L */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-sm">
                          {log.vacant_cost > 0 ? (
                            <span className="text-rose-400">-{fmt(log.vacant_cost)} ₫</span>
                          ) : (
                            <span className="text-emerald-400">0 ₫</span>
                          )}
                        </td>

                        {/* 7. Diễn giải kế toán */}
                        <td className="py-3.5 px-4 text-slate-400 text-[11px] leading-relaxed">
                          {log.note || "Khấu trừ chi phí slot trống trong ngày"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân trang Sổ Cái */}
            {logsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400">
                <div>
                  Trang {logsPagination.page} / {logsPagination.totalPages} ({logsPagination.totalItems} bản ghi)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchLogs(logsPagination.page - 1)}
                    disabled={logsPagination.page <= 1}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 cursor-pointer font-bold"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => fetchLogs(logsPagination.page + 1)}
                    disabled={logsPagination.page >= logsPagination.totalPages}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 cursor-pointer font-bold"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
  );
}
