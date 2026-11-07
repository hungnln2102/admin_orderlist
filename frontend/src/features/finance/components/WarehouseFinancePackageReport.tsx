import type React from "react";
import {
  Boxes,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  LayoutGrid,
  Search,
  Table as TableIcon,
  TrendingDown,
  X,
} from "lucide-react";
import type { PackageFinancialItem } from "./warehouseFinanceTypes";

export type WarehouseFinanceSegment = "ALL" | "LOSS" | "OPTIMAL" | "EXPIRED";
export type WarehouseFinanceViewMode = "CARDS" | "TABLE";
export type WarehouseFinanceSort = "LOSS_DESC" | "ACCUMULATED_DESC" | "COST_DESC" | "EXPIRY_ASC";

const PACKAGE_PAGE_SIZE = 6;

interface WarehouseFinancePackageReportProps {
  loading: boolean;
  items: PackageFinancialItem[];
  filteredItems: PackageFinancialItem[];
  categories: string[];
  segmentCounts: Record<Lowercase<WarehouseFinanceSegment>, number>;
  financialSegment: WarehouseFinanceSegment;
  onFinancialSegmentChange: (segment: WarehouseFinanceSegment) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  search: string;
  onSearchChange: (query: string) => void;
  sortBy: WarehouseFinanceSort;
  onSortByChange: (sort: WarehouseFinanceSort) => void;
  viewMode: WarehouseFinanceViewMode;
  onViewModeChange: (mode: WarehouseFinanceViewMode) => void;
  currentPage: number;
  totalPages: number;
  onCurrentPageChange: React.Dispatch<React.SetStateAction<number>>;
  isExpiredCycle: (item: PackageFinancialItem) => boolean;
  getDaysRemaining: (expiredAt: string | null) => number | null;
  formatMoney: (value: number | undefined | null) => string;
}

export const WarehouseFinancePackageReport: React.FC<WarehouseFinancePackageReportProps> = ({
  loading,
  items,
  filteredItems,
  categories,
  segmentCounts,
  financialSegment,
  onFinancialSegmentChange,
  categoryFilter,
  onCategoryFilterChange,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  currentPage,
  totalPages,
  onCurrentPageChange,
  isExpiredCycle,
  getDaysRemaining,
  formatMoney,
}) => (        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Thanh Phân Nhóm Tài Chính, Bộ Lọc & Chuyển Đổi View Mode */}
          <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            {/* Phân nhóm trạng thái tài chính (Segments) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onFinancialSegmentChange("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  financialSegment === "ALL"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <span>Tất Cả Gói</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/30 font-mono">
                  {segmentCounts.all}
                </span>
              </button>

              <button
                onClick={() => onFinancialSegmentChange("LOSS")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  financialSegment === "LOSS"
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                    : "bg-slate-950 text-rose-300 hover:text-rose-200 border border-rose-500/30"
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Đang Hao Mòn Vốn</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950/60 font-mono text-rose-300">
                  {segmentCounts.loss}
                </span>
              </button>

              <button
                onClick={() => onFinancialSegmentChange("OPTIMAL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  financialSegment === "OPTIMAL"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                    : "bg-slate-950 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tối Ưu 100%</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/60 font-mono text-emerald-300">
                  {segmentCounts.optimal}
                </span>
              </button>

              <button
                onClick={() => onFinancialSegmentChange("EXPIRED")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  financialSegment === "EXPIRED"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                    : "bg-slate-950 text-amber-300 hover:text-amber-200 border border-amber-500/30"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Hết Hạn Chu Kỳ</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950/60 font-mono text-amber-300">
                  {segmentCounts.expired}
                </span>
              </button>
            </div>

            {/* Tìm kiếm, NCC, Sắp xếp & Chuyển Đổi View Mode (Cards vs Table) */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm gói, tài khoản, mã MAVN..."
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 w-52 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>

              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => onCategoryFilterChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                >
                  <option value="all">Tất cả NCC ({filteredItems.length})</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      NCC: {c}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                <option value="LOSS_DESC">Thiệt hại hôm nay cao nhất</option>
                <option value="ACCUMULATED_DESC">Lũy kế bù cao nhất</option>
                <option value="COST_DESC">Vốn nhập gói lớn nhất</option>
                <option value="EXPIRY_ASC">Chu kỳ sắp hết nhất</option>
              </select>

              {/* View Switcher: Thẻ Trực Quan vs Bảng Kế Toán */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => onViewModeChange("CARDS")}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "CARDS"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Chế độ Thẻ Tài Sản Trực Quan"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Thẻ</span>
                </button>
                <button
                  onClick={() => onViewModeChange("TABLE")}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "TABLE"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Chế độ Bảng Kế Toán"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bảng</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── CHẾ ĐỘ 1: LƯỚI THẺ TÀI SẢN TRỰC QUAN (CARDS GRID - 2 DÒNG x 3 KHỐI = 6 GÓI/TRANG) ── */}
          {viewMode === "CARDS" ? (
            <div className="space-y-4">
              {loading ? (
                <div className="py-20 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span className="font-semibold text-sm">Đang tổng hợp báo cáo tài chính kho gói...</span>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Boxes className="w-8 h-8 text-slate-600" />
                    <span className="text-sm">Không tìm thấy gói nào phù hợp với bộ lọc này.</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => {
                    const avail = Math.max(0, item.totalSlots - item.usedSlots);
                    const expired = isExpiredCycle(item);
                    const daysRemaining = getDaysRemaining(item.expiredAt);

                    return (
                      <div
                        key={item.id}
                        className={`bg-slate-900/80 rounded-2xl border p-5 shadow-xl backdrop-blur-xl transition-all flex flex-col justify-between hover:shadow-2xl relative overflow-hidden group ${
                          expired
                            ? "border-amber-500/30 hover:border-amber-500/50"
                            : item.todayVacantCost && item.todayVacantCost > 0
                            ? "border-rose-500/30 hover:border-rose-500/60"
                            : "border-slate-800 hover:border-cyan-500/40"
                        }`}
                      >
                        {/* Glow trang trí góc thẻ */}
                        <div
                          className={`absolute -top-14 -right-14 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-all ${
                            expired
                              ? "bg-amber-500/10 group-hover:bg-amber-500/20"
                              : item.todayVacantCost && item.todayVacantCost > 0
                              ? "bg-rose-500/15 group-hover:bg-rose-500/25"
                              : "bg-emerald-500/10 group-hover:bg-emerald-500/20"
                          }`}
                        />

                        {/* 1. Header Card */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-extrabold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                                  {item.name}
                                </h4>
                                <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-semibold">
                                  {item.supplier}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 font-mono truncate max-w-[200px] mt-0.5" title={item.accountInfo || item.name}>
                                {item.accountInfo || `Tài khoản #${item.id}`}
                              </div>
                            </div>

                            {/* Badge trạng thái tài chính */}
                            <div>
                              {expired ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                                  <Clock className="w-3 h-3 text-amber-400" /> Hết Chu Kỳ
                                </span>
                              ) : avail === 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Tối Ưu 100%
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                                  <Flame className="w-3 h-3 text-rose-400 animate-pulse" /> Đốt {avail} Slot
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 2. Mini Slot Matrix & Tiến Độ Khai Thác */}
                          <div className="pt-2">
                            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                              <span className="text-slate-300 font-bold">
                                {item.usedSlots} / {item.totalSlots} slot cho thuê
                              </span>
                              <span
                                className={`text-[11px] font-bold ${
                                  avail > 0 ? "text-rose-400" : "text-emerald-400"
                                }`}
                              >
                                {avail > 0 ? `Lãng phí ${avail} slot` : "Hiệu suất 100%"}
                              </span>
                            </div>

                            {/* Matrix Slot Visual (Ô vuông phát sáng trực quan) */}
                            <div className="flex items-center gap-1.5">
                              {Array.from({ length: item.totalSlots }).map((_, slotIdx) => {
                                const isOccupied = slotIdx < item.usedSlots;
                                return (
                                  <div
                                    key={slotIdx}
                                    className={`h-2 flex-1 rounded-sm transition-all ${
                                      isOccupied
                                        ? "bg-emerald-400 shadow-sm shadow-emerald-500/50"
                                        : expired
                                        ? "bg-slate-800"
                                        : "bg-rose-500/80 shadow-sm shadow-rose-500/50 animate-pulse"
                                    }`}
                                    title={
                                      isOccupied
                                        ? `Slot ${slotIdx + 1}: Có khách (Sinh lời)`
                                        : expired
                                        ? `Slot ${slotIdx + 1}: Đã hết chu kỳ`
                                        : `Slot ${slotIdx + 1}: Trống (Đang đốt -${formatMoney(item.costPerSlotDay)} ₫/ngày)`
                                    }
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* 3. Khối Chỉ Số Tài Chính Chính (Financial Numbers Box) */}
                        <div className="my-3.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                                Vốn Nhập Gói
                              </span>
                              <span className="text-white font-bold text-sm">
                                {formatMoney(item.costPrice)} <span className="text-[10px] text-slate-400">₫</span>
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                                Vốn 1 Slot / Ngày
                              </span>
                              {expired ? (
                                <span className="text-slate-600 font-normal">—</span>
                              ) : (
                                <span className="text-amber-300 font-bold text-sm">
                                  {formatMoney(item.costPerSlotDay)}{" "}
                                  <span className="text-[10px] text-amber-400/80 font-normal">₫</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-xs font-mono">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                                Khấu Trừ P&L Hôm Nay
                              </span>
                              {expired ? (
                                <span className="text-slate-500 text-xs">0 ₫ (Hết hạn)</span>
                              ) : item.todayVacantCost && item.todayVacantCost > 0 ? (
                                <span className="text-rose-400 font-black text-sm">
                                  -{formatMoney(item.todayVacantCost)} ₫
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-bold text-xs">
                                  0 ₫ (Tối ưu)
                                </span>
                              )}
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                                Lũy Kế Đã Bù
                              </span>
                              {item.totalAccumulatedVacantCost && item.totalAccumulatedVacantCost > 0 ? (
                                <span className="text-amber-300 font-bold text-sm">
                                  -{formatMoney(item.totalAccumulatedVacantCost)} ₫
                                </span>
                              ) : (
                                <span className="text-slate-600 font-normal">0 ₫</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 4. Footer Card: Đơn MAVN & Chu Kỳ Thời Gian */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 font-mono">
                          <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-[11px]">
                            #{item.importOrderCode}
                          </span>

                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>
                              {item.expiredAt || "—"}
                            </span>
                            {daysRemaining !== null && (
                              <span
                                className={`font-bold ml-0.5 ${
                                  daysRemaining < 0
                                    ? "text-amber-400"
                                    : daysRemaining <= 5
                                    ? "text-rose-400"
                                    : "text-slate-300"
                                }`}
                              >
                                ({daysRemaining > 0 ? `Còn ${daysRemaining} ngày` : `Hết hạn ${Math.abs(daysRemaining)} ngày`})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Thanh Điều Hướng Phân Trang Thẻ (6 gói / trang = 2 dòng x 3 khối) */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800 text-xs text-slate-400 bg-slate-900/60 p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span>
                      Đang xem{" "}
                      <strong className="text-white font-mono">
                        {(currentPage - 1) * PACKAGE_PAGE_SIZE + 1} - {Math.min(currentPage * PACKAGE_PAGE_SIZE, filteredItems.length)}
                      </strong>{" "}
                      / <strong className="text-cyan-300 font-mono">{filteredItems.length}</strong> gói kho (Trang {currentPage} / {totalPages})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Nút Trước */}
                    <button
                      onClick={() => onCurrentPageChange((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-bold flex items-center gap-1 active:scale-95"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Trước</span>
                    </button>

                    {/* Dãy số trang */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => onCurrentPageChange(pageNum)}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              pageNum === currentPage
                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black shadow-md shadow-cyan-500/25"
                                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Nút Sau */}
                    <button
                      onClick={() => onCurrentPageChange((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-bold flex items-center gap-1 active:scale-95"
                    >
                      <span>Sau</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── CHẾ ĐỘ 2: BẢNG KẾ TOÁN RÚT GỌN (COMPACT LEDGER TABLE) ── */
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[1050px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-950/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider select-none">
                      <th className="py-4 px-4">DỊCH VỤ & TÀI KHOẢN KHO</th>
                      <th className="py-4 px-4">ĐƠN NHẬP & CHU KỲ VỐN</th>
                      <th className="py-4 px-4 text-right">VỐN GÓI NHẬP</th>
                      <th className="py-4 px-4 text-right">ĐỊNH MỨC VỐN 1 SLOT / NGÀY</th>
                      <th className="py-4 px-4 min-w-[170px]">KHAI THÁC SLOT</th>
                      <th className="py-4 px-4 text-right">KHẤU TRỪ P&L HÔM NAY</th>
                      <th className="py-4 px-4 text-right">LŨY KẾ ĐÃ BÙ</th>
                      <th className="py-4 px-4 text-center">ĐÁNH GIÁ TÀI CHÍNH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-20 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2.5">
                            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            <span className="font-semibold text-sm">Đang tổng hợp báo cáo tài chính kho gói...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Boxes className="w-8 h-8 text-slate-600" />
                            <span className="text-sm">Không tìm thấy gói nào phù hợp với bộ lọc tài chính này.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const avail = Math.max(0, item.totalSlots - item.usedSlots);
                        const percent =
                          item.totalSlots > 0 ? Math.round((item.usedSlots / item.totalSlots) * 100) : 0;
                        const expired = isExpiredCycle(item);

                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                            {/* 1. Dịch Vụ & Tài Khoản */}
                            <td className="py-3.5 px-4 font-bold text-white">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-white text-sm hover:text-cyan-300 transition-colors">
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-medium">
                                    NCC: {item.supplier}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono font-normal truncate max-w-[220px]" title={item.accountInfo || item.name}>
                                  {item.accountInfo || `Tài khoản #${item.id}`}
                                </div>
                              </div>
                            </td>

                            {/* 2. Đơn Nhập & Chu Kỳ Vốn */}
                            <td className="py-3.5 px-4 font-mono">
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-block">
                                  #{item.importOrderCode}
                                </span>
                                <div className="text-[11px] flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-500" />
                                  <span className={expired ? "text-amber-400 font-bold" : "text-slate-400"}>
                                    Hạn: {item.expiredAt || "—"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 3. Vốn Gói Nhập */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">
                              {formatMoney(item.costPrice)} <span className="text-[10px] text-slate-500">₫</span>
                            </td>

                            {/* 4. Định Mức Vốn 1 Slot / Ngày */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold">
                              {expired ? (
                                <span className="text-slate-600 font-normal text-xs" title="Chu kỳ cũ đã đóng">—</span>
                              ) : (
                                <div className="text-amber-300">
                                  {formatMoney(item.costPerSlotDay)}{" "}
                                  <span className="text-[10px] text-amber-400/70 font-normal">₫/ngày</span>
                                </div>
                              )}
                            </td>

                            {/* 5. Khai Thác Slot */}
                            <td className="py-3.5 px-4 min-w-[170px]">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <span className="text-white font-bold">
                                    {item.usedSlots} / {item.totalSlots} slot
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold ${
                                      avail > 0 ? "text-rose-400" : "text-emerald-400"
                                    }`}
                                  >
                                    {avail > 0 ? `Lãng phí ${avail} slot` : "Tối ưu 100%"}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      percent >= 100
                                        ? "bg-emerald-400"
                                        : percent >= 50
                                        ? "bg-amber-400"
                                        : "bg-rose-400"
                                    }`}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* 6. Khấu Trừ P&L Hôm Nay */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold">
                              {expired ? (
                                <span className="text-slate-500 text-[11px] font-normal bg-slate-950/60 border border-slate-800 px-2 py-0.5 rounded">
                                  0 ₫ (Hết chu kỳ)
                                </span>
                              ) : item.todayVacantCost && item.todayVacantCost > 0 ? (
                                <div className="text-rose-400 font-black text-sm">
                                  -{formatMoney(item.todayVacantCost)}{" "}
                                  <span className="text-[10px] text-rose-400/80 font-normal">₫/ngày</span>
                                </div>
                              ) : (
                                <span className="text-emerald-400 text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                  0 ₫ (Tối ưu 100%)
                                </span>
                              )}
                            </td>

                            {/* 7. Lũy Kế Đã Bù */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold">
                              {item.totalAccumulatedVacantCost && item.totalAccumulatedVacantCost > 0 ? (
                                <div className="text-amber-300 text-sm">
                                  -{formatMoney(item.totalAccumulatedVacantCost)}{" "}
                                  <span className="text-[10px] text-amber-400/70 font-normal">₫</span>
                                </div>
                              ) : (
                                <span className="text-slate-600 font-normal">0 ₫</span>
                              )}
                            </td>

                            {/* 8. Đánh Giá Tài Chính */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {expired ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                  <Clock className="w-3 h-3 text-amber-400" /> HẾT HẠN CHU KỲ
                                </span>
                              ) : avail === 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> TỐI ƯU VỐN
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
                                  <TrendingDown className="w-3 h-3 text-rose-400" /> HAO MÒN {avail} SLOT
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Chân bảng báo cáo tài chính & Phân trang */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400 gap-3">
                <div className="flex items-center gap-4">
                  <span>
                    Đang xem <strong className="text-white font-mono">{(currentPage - 1) * PACKAGE_PAGE_SIZE + 1} - {Math.min(currentPage * PACKAGE_PAGE_SIZE, filteredItems.length)}</strong> / {filteredItems.length} gói kho
                  </span>
                  <span className="text-slate-600">•</span>
                  <span>
                    Tổng vốn lọc:{" "}
                    <strong className="text-cyan-300 font-mono font-bold">
                      {formatMoney(filteredItems.reduce((acc, p) => acc + Number(p.costPrice || 0), 0))} ₫
                    </strong>
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onCurrentPageChange((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                    >
                      Trước
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => onCurrentPageChange(i + 1)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold ${
                            i + 1 === currentPage
                              ? "bg-cyan-500 text-slate-950 font-black"
                              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => onCurrentPageChange((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
);



