import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useWarehouseFinanceData } from "../hooks/useWarehouseFinanceData";
import type { PackageFinancialItem } from "./warehouseFinanceTypes";
import { WarehouseFinanceBackfillModal } from "./WarehouseFinanceBackfillModal";
import { WarehouseFinanceLedger } from "./WarehouseFinanceLedger";
import { WarehouseFinanceKpiCards } from "./WarehouseFinanceKpiCards";
import { WarehouseFinanceAnalytics } from "./WarehouseFinanceAnalytics";
import { WarehouseFinancePackageReport } from "./WarehouseFinancePackageReport";
import {
  Boxes,
  Zap,
  TrendingDown,
  Calendar,
  RefreshCw,
  Search,
  History,
  Clock,
  X,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  TrendingUp,
  LayoutGrid,
  Table as TableIcon,
  Flame,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const fmt = (v: number | undefined | null) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(Math.abs(v || 0)));

// Mỗi trang 2 dòng, mỗi dòng 3 khối = 6 khối / trang (Chỉ đạo của Master)
const PAGE_SIZE = 6;

export const WarehouseFinanceSection: React.FC = () => {
  const {
    subTab,
    setSubTab,
    viewMode,
    setViewMode,
    packages,
    loadingPackages,
    packageSearch,
    setPackageSearch,
    categoryFilter,
    setCategoryFilter,
    financialSegment,
    setFinancialSegment,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    logs,
    logsPagination,
    logsStats,
    loadingLogs,
    logFilterDate,
    setLogFilterDate,
    logFilterFromDate,
    setLogFilterFromDate,
    logFilterToDate,
    setLogFilterToDate,
    selectedPackageFilter,
    setSelectedPackageFilter,
    calculatingToday,
    isBackfillModalOpen,
    setIsBackfillModalOpen,
    backfillFrom,
    setBackfillFrom,
    backfillTo,
    setBackfillTo,
    isBackfilling,
    fetchPackages,
    fetchLogs,
    handleCalculateToday,
    handleExecuteBackfill,
  } = useWarehouseFinanceData(fmt);

  const todayIso = useMemo(() => {
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 3600 * 1000);
    return vnTime.toISOString().slice(0, 10);
  }, []);

  const isExpiredCycle = useCallback(
    (item: PackageFinancialItem) => {
      if (!item.expiredAt) return false;
      return item.expiredAt < todayIso;
    },
    [todayIso]
  );

  // Tính số ngày còn lại đến khi hết hạn
  const getDaysRemaining = useCallback(
    (expiredAt: string | null) => {
      if (!expiredAt) return null;
      const expDate = new Date(expiredAt + "T00:00:00Z").getTime();
      const curDate = new Date(todayIso + "T00:00:00Z").getTime();
      return Math.round((expDate - curDate) / (1000 * 3600 * 24));
    },
    [todayIso]
  );

  // Chỉ lấy các gói THỎA MÃN ĐỦ 2 ĐIỀU KIỆN (Chỉ đạo của Master):
  // 1. Có mặt trong Kho Gói Sản Phẩm
  // 2. VÀ ĐỒNG THỜI là đơn nhập hàng (có mã đơn MAVN... và vốn > 0)
  const validFinancialPackages = useMemo(() => {
    return packages.filter(
      (pkg) => Boolean(pkg.importOrderCode) && Number(pkg.costPrice || 0) > 0
    );
  }, [packages]);

  // Thống kê 4 Thẻ KPI Tài Chính Cấp Cao
  const kpiMetrics = useMemo(() => {
    let totalCapital = 0;
    let totalSlots = 0;
    let usedSlots = 0;
    let todayLoss = 0;
    let totalAccumulatedLoss = 0;
    let activeCapital = 0;
    let idleCapital = 0;

    validFinancialPackages.forEach((pkg) => {
      const cap = Number(pkg.costPrice || 0);
      const totalS = Number(pkg.totalSlots || 0);
      const usedS = Number(pkg.usedSlots || 0);

      totalCapital += cap;
      totalSlots += totalS;
      usedSlots += usedS;
      todayLoss += Number(pkg.todayVacantCost || 0);
      totalAccumulatedLoss += Number(pkg.totalAccumulatedVacantCost || 0);

      if (totalS > 0) {
        const ratio = Math.min(1, Math.max(0, usedS / totalS));
        activeCapital += cap * ratio;
        idleCapital += cap * (1 - ratio);
      } else {
        idleCapital += cap;
      }
    });

    const vacantSlots = Math.max(0, totalSlots - usedSlots);
    const occupancyRate = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;
    const activeCapitalRate = totalCapital > 0 ? Math.round((activeCapital / totalCapital) * 100) : 0;
    const idleCapitalRate = 100 - activeCapitalRate;

    return {
      totalCapital,
      activeCapital,
      idleCapital,
      activeCapitalRate,
      idleCapitalRate,
      totalSlots,
      usedSlots,
      vacantSlots,
      occupancyRate,
      todayLoss,
      monthlyRunrate: todayLoss * 30,
      totalAccumulatedLoss,
    };
  }, [validFinancialPackages]);

  // Phân tích vốn và thiệt hại dòng tiền theo từng Nhà Cung Cấp (Supplier Risk Distribution)
  const supplierBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        supplier: string;
        packageCount: number;
        totalCapital: number;
        todayLoss: number;
        accumulatedLoss: number;
        totalSlots: number;
        usedSlots: number;
        vacantSlots: number;
      }
    >();

    validFinancialPackages.forEach((pkg) => {
      const sup = pkg.supplier?.trim() || "Khác";
      const curr = map.get(sup) || {
        supplier: sup,
        packageCount: 0,
        totalCapital: 0,
        todayLoss: 0,
        accumulatedLoss: 0,
        totalSlots: 0,
        usedSlots: 0,
        vacantSlots: 0,
      };

      curr.packageCount += 1;
      curr.totalCapital += Number(pkg.costPrice || 0);
      curr.todayLoss += Number(pkg.todayVacantCost || 0);
      curr.accumulatedLoss += Number(pkg.totalAccumulatedVacantCost || 0);
      curr.totalSlots += Number(pkg.totalSlots || 0);
      curr.usedSlots += Number(pkg.usedSlots || 0);
      curr.vacantSlots += Math.max(0, Number(pkg.totalSlots || 0) - Number(pkg.usedSlots || 0));

      map.set(sup, curr);
    });

    const list = Array.from(map.values());
    list.sort((a, b) => b.todayLoss - a.todayLoss || b.totalCapital - a.totalCapital);
    return list;
  }, [validFinancialPackages]);

  // Top 3-4 Điểm Nóng Đang Đốt Tiền Nhiều Nhất (Critical Hotspots)
  const topBurners = useMemo(() => {
    return validFinancialPackages
      .filter((pkg) => !isExpiredCycle(pkg) && Number(pkg.todayVacantCost || 0) > 0)
      .sort((a, b) => Number(b.todayVacantCost || 0) - Number(a.todayVacantCost || 0))
      .slice(0, 3);
  }, [validFinancialPackages, isExpiredCycle]);

  // Đếm số lượng gói theo phân loại tài chính
  const segmentCounts = useMemo(() => {
    let lossCount = 0;
    let optimalCount = 0;
    let expiredCount = 0;

    validFinancialPackages.forEach((p) => {
      const expired = isExpiredCycle(p);
      if (expired) {
        expiredCount++;
      } else if (p.todayVacantCost && p.todayVacantCost > 0) {
        lossCount++;
      } else if (p.usedSlots >= p.totalSlots) {
        optimalCount++;
      } else {
        lossCount++;
      }
    });

    return {
      all: validFinancialPackages.length,
      loss: lossCount,
      optimal: optimalCount,
      expired: expiredCount,
    };
  }, [validFinancialPackages, isExpiredCycle]);

  // Danh sách NCC của các gói hợp lệ
  const categories = useMemo(() => {
    const set = new Set<string>();
    validFinancialPackages.forEach((p) => {
      if (p.supplier) set.add(p.supplier);
    });
    return Array.from(set);
  }, [validFinancialPackages]);

  // Lọc và sắp xếp packages hiển thị
  const filteredPackages = useMemo(() => {
    let list = validFinancialPackages.filter((pkg) => {
      const expired = isExpiredCycle(pkg);

      // Lọc theo Segment Tài Chính
      if (financialSegment === "LOSS") {
        if (expired || (pkg.todayVacantCost || 0) <= 0) return false;
      } else if (financialSegment === "OPTIMAL") {
        if (expired || pkg.usedSlots < pkg.totalSlots) return false;
      } else if (financialSegment === "EXPIRED") {
        if (!expired) return false;
      }

      // Lọc theo NCC
      const matchCat = categoryFilter === "all" || pkg.supplier.toLowerCase() === categoryFilter.toLowerCase();

      // Tìm kiếm
      const matchQuery =
        !packageSearch.trim() ||
        pkg.name.toLowerCase().includes(packageSearch.toLowerCase()) ||
        (pkg.accountInfo && pkg.accountInfo.toLowerCase().includes(packageSearch.toLowerCase())) ||
        (pkg.importOrderCode && pkg.importOrderCode.toLowerCase().includes(packageSearch.toLowerCase())) ||
        pkg.supplier.toLowerCase().includes(packageSearch.toLowerCase());

      return matchCat && matchQuery;
    });

    // Sắp xếp
    list.sort((a, b) => {
      if (sortBy === "LOSS_DESC") {
        return (b.todayVacantCost || 0) - (a.todayVacantCost || 0);
      }
      if (sortBy === "ACCUMULATED_DESC") {
        return (b.totalAccumulatedVacantCost || 0) - (a.totalAccumulatedVacantCost || 0);
      }
      if (sortBy === "COST_DESC") {
        return (b.costPrice || 0) - (a.costPrice || 0);
      }
      if (sortBy === "EXPIRY_ASC") {
        const da = a.expiredAt || "9999-99-99";
        const db = b.expiredAt || "9999-99-99";
        return da.localeCompare(db);
      }
      return 0;
    });

    return list;
  }, [validFinancialPackages, financialSegment, categoryFilter, packageSearch, sortBy, isExpiredCycle]);

  // Tính toán số trang và danh sách cắt lát cho trang hiện tại (6 gói / trang)
  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPackages = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredPackages.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredPackages, currentPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── 1. TIÊU ĐỀ & THANH ĐIỀU HƯỚNG TÀI CHÍNH ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Boxes className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-white tracking-tight">
              Quản Trị Vốn Kho Gói & Chi Phí Khấu Trừ Slot Trống
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Theo dõi dòng vốn đầu tư mua sỉ (<span className="text-cyan-400 font-mono font-bold">MAVN</span>), định mức phân bổ giá vốn 1 slot/ngày và khoản chi phí hao mòn do slot chưa cho thuê được khấu trừ thẳng vào lợi nhuận mỗi ngày.
          </p>
        </div>

        {/* Nút Hành Động Nghiệp Vụ Tài Chính: Tính lại & Hồi tố */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <button
            onClick={handleCalculateToday}
            disabled={calculatingToday}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-900/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 whitespace-nowrap"
            title="Kích hoạt tính toán lại chi phí slot trống cho ngày hôm nay và cập nhật P&L"
          >
            <Zap className={`w-3.5 h-3.5 ${calculatingToday ? "animate-spin" : ""}`} />
            <span>{calculatingToday ? "Đang Tính..." : "Khấu Trừ Hôm Nay"}</span>
          </button>

          <button
            onClick={() => setIsBackfillModalOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
            title="Chạy lại lịch sử khấu trừ slot trống cho khoảng thời gian trong quá khứ"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hồi Tố Sổ Cái P&L</span>
          </button>

          <button
            onClick={() => {
              fetchPackages();
              if (subTab === "LEDGER") fetchLogs(logsPagination.page);
            }}
            disabled={loadingPackages || loadingLogs}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Làm mới dữ liệu tài chính"
          >
            <RefreshCw className={`w-4 h-4 ${loadingPackages || loadingLogs ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 2. EXECUTIVE FINANCIAL KPI CARDS (BỘ 4 CHỈ SỐ TÀI CHÍNH CẤP CAO) ── */}
      <WarehouseFinanceKpiCards
        metrics={kpiMetrics}
        packageCount={validFinancialPackages.length}
        formatMoney={fmt}
      />
      {/* ── 3. VISUAL FINANCIAL ANALYTICS DASHBOARD (PHÂN TÍCH TÀI CHÍNH TRỰC QUAN) ── */}
      <WarehouseFinanceAnalytics
        supplierBreakdown={supplierBreakdown}
        topBurners={topBurners}
        totalCapital={kpiMetrics.totalCapital}
        todayLoss={kpiMetrics.todayLoss}
        formatMoney={fmt}
        getDaysRemaining={getDaysRemaining}
      />
      {/* ── 4. CHUYỂN ĐỔI GÓC NHÌN TÀI CHÍNH (SUB-TAB) ── */}
      <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setSubTab("PACKAGES")}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            subTab === "PACKAGES"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Danh Sách Vốn Gói Kho ({validFinancialPackages.length})</span>
        </button>
        <button
          onClick={() => setSubTab("LEDGER")}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            subTab === "LEDGER"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Sổ Cái Khấu Trừ Slot Hàng Ngày</span>
        </button>
      </div>

      {/* ── 5. KHỐI 1: BÁO CÁO PHÂN BỔ VỐN GÓI KHO ── */}
      {subTab === "PACKAGES" && (
        <WarehouseFinancePackageReport
          loading={loadingPackages}
          items={paginatedPackages}
          filteredItems={filteredPackages}
          categories={categories}
          segmentCounts={segmentCounts}
          financialSegment={financialSegment}
          onFinancialSegmentChange={setFinancialSegment}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          search={packageSearch}
          onSearchChange={setPackageSearch}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          currentPage={currentPage}
          totalPages={totalPages}
          onCurrentPageChange={setCurrentPage}
          isExpiredCycle={isExpiredCycle}
          getDaysRemaining={getDaysRemaining}
          formatMoney={fmt}
        />
      )}
      {/* ── 6. KHỐI 2: SỔ CÁI CHI PHÍ SLOT HÀNG NGÀY (SLOT DAILY LEDGER) ── */}
      <WarehouseFinanceLedger
        isActive={subTab === "LEDGER"}
        packages={validFinancialPackages}
        logs={logs}
        pagination={logsPagination}
        stats={logsStats}
        loading={loadingLogs}
        filterDate={logFilterDate}
        onFilterDateChange={setLogFilterDate}
        filterFromDate={logFilterFromDate}
        onFilterFromDateChange={setLogFilterFromDate}
        filterToDate={logFilterToDate}
        onFilterToDateChange={setLogFilterToDate}
        packageFilter={selectedPackageFilter}
        onPackageFilterChange={setSelectedPackageFilter}
        onFetchPage={fetchLogs}
        formatMoney={fmt}
      />

      {/* ── 7. MODAL HỒI TỐ SỔ CÁI P&L (BACKFILL MODAL) ── */}
      <WarehouseFinanceBackfillModal
        isOpen={isBackfillModalOpen}
        onClose={() => setIsBackfillModalOpen(false)}
        fromDate={backfillFrom}
        onFromDateChange={setBackfillFrom}
        toDate={backfillTo}
        onToDateChange={setBackfillTo}
        isSubmitting={isBackfilling}
        onSubmit={handleExecuteBackfill}
      />
    </div>
  );
};





