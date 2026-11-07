import { useCallback, useEffect, useState } from "react";
import { useNotification } from "@/shared/context/NotificationContext";
import type { PackageFinancialItem, SlotDailyLogItem } from "../components/warehouseFinanceTypes";

type FormatMoney = (value: number | undefined | null) => string;

export function useWarehouseFinanceData(formatMoney: FormatMoney) {
  const notify = useNotification();

  // Tab con nghiệp vụ: "PACKAGES" (Phân Bổ Vốn Gói) | "LEDGER" (Sổ Cái Khấu Trừ Hàng Ngày)
  const [subTab, setSubTab] = useState<"PACKAGES" | "LEDGER">("PACKAGES");

  // Chế độ xem: "CARDS" (Thẻ Tài Sản Trực Quan) vs "TABLE" (Bảng Kế Toán Rút Gọn)
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");

  // Dữ liệu Packages tài chính
  const [packages, setPackages] = useState<PackageFinancialItem[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [packageSearch, setPackageSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [financialSegment, setFinancialSegment] = useState<"ALL" | "LOSS" | "OPTIMAL" | "EXPIRED">("ALL");
  const [sortBy, setSortBy] = useState<"LOSS_DESC" | "ACCUMULATED_DESC" | "COST_DESC" | "EXPIRY_ASC">("LOSS_DESC");

  // Phân trang danh sách gói (6 gói/trang)
  const [currentPage, setCurrentPage] = useState(1);

  // Dữ liệu Sổ Cái Logs
  const [logs, setLogs] = useState<SlotDailyLogItem[]>([]);
  const [logsPagination, setLogsPagination] = useState({
    page: 1,
    limit: 30,
    totalItems: 0,
    totalPages: 1,
  });
  const [logsStats, setLogsStats] = useState({
    totalVacantCost: 0,
    totalVacantSlots: 0,
  });
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilterDate, setLogFilterDate] = useState("");
  const [logFilterFromDate, setLogFilterFromDate] = useState("");
  const [logFilterToDate, setLogFilterToDate] = useState("");
  const [selectedPackageFilter, setSelectedPackageFilter] = useState<string>("all");

  // State Hành Động (Action state)
  const [calculatingToday, setCalculatingToday] = useState(false);
  const [isBackfillModalOpen, setIsBackfillModalOpen] = useState(false);
  const [backfillFrom, setBackfillFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [backfillTo, setBackfillTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [isBackfilling, setIsBackfilling] = useState(false);

  // 1. Tải danh sách gói tài chính từ /api/products/packages
  const fetchPackages = useCallback(async () => {
    try {
      setLoadingPackages(true);
      const res = await fetch("/api/products/packages");
      if (!res.ok) throw new Error("Không thể tải danh sách tài chính gói");
      const json = await res.json();
      setPackages(json.data || []);
    } catch (err: any) {
      console.error("[WarehouseFinance] Lỗi tải gói:", err);
      notify.error(err.message || "Lỗi nạp dữ liệu kho gói", "Lỗi Kết Nối");
    } finally {
      setLoadingPackages(false);
    }
  }, [notify]);

  // 2. Tải Sổ cái Chi phí Slot Hàng Ngày từ warehouse.package_slot_daily_logs
  const fetchLogs = useCallback(
    async (page = 1) => {
      try {
        setLoadingLogs(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(logsPagination.limit));
        if (logFilterDate) params.set("date", logFilterDate);
        if (logFilterFromDate) params.set("fromDate", logFilterFromDate);
        if (logFilterToDate) params.set("toDate", logFilterToDate);
        if (selectedPackageFilter !== "all") params.set("packageId", selectedPackageFilter);

        const res = await fetch(`/api/warehouse/slot-daily-logs?${params.toString()}`);
        if (!res.ok) throw new Error("Không thể tải sổ cái chi phí slot");
        const json = await res.json();

        setLogs(json.data || []);
        if (json.pagination) {
          setLogsPagination(json.pagination);
        }
        if (json.stats) {
          setLogsStats(json.stats);
        }
      } catch (err: any) {
        console.error("[WarehouseFinance] Lỗi tải logs:", err);
        notify.error(err.message || "Lỗi nạp sổ cái slot", "Lỗi");
      } finally {
        setLoadingLogs(false);
      }
    },
    [logFilterDate, logFilterFromDate, logFilterToDate, selectedPackageFilter, logsPagination.limit, notify]
  );

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    if (subTab === "LEDGER") {
      fetchLogs(1);
    }
  }, [subTab, fetchLogs]);

  // Tự động reset về trang 1 khi thay đổi bất kỳ bộ lọc nào
  useEffect(() => {
    setCurrentPage(1);
  }, [financialSegment, categoryFilter, packageSearch, sortBy]);

  // 3. Tính toán lại chi phí hôm nay ngay lập tức
  const handleCalculateToday = async () => {
    try {
      setCalculatingToday(true);
      const res = await fetch("/api/warehouse/slot-daily-logs/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Tính toán chi phí thất bại");
      }
      notify.success(
        `Đã tính toán chi phí hôm nay: ${json.data?.totalVacantSlots || 0} slot trống, khấu trừ -${formatMoney(
          json.data?.totalVacantCost || 0
        )} ₫`,
        "Cập Nhật Thành Công"
      );
      await Promise.all([fetchPackages(), fetchLogs(logsPagination.page)]);
    } catch (err: any) {
      console.error("[WarehouseFinance] Lỗi tính lại:", err);
      notify.error(err.message || "Lỗi máy chủ khi tính chi phí", "Thất Bại");
    } finally {
      setCalculatingToday(false);
    }
  };

  // 4. Hồi tố chi phí (Backfill)
  const handleExecuteBackfill = async () => {
    if (!backfillFrom || !backfillTo) {
      notify.warning("Vui lòng chọn ngày bắt đầu và kết thúc hợp lệ", "Thiếu Ngày");
      return;
    }
    try {
      setIsBackfilling(true);
      const res = await fetch("/api/warehouse/slot-daily-logs/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate: backfillFrom, toDate: backfillTo }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Hồi tố thất bại");
      }
      notify.success(
        `Hoàn tất hồi tố ${json.data?.daysProcessed || 0} ngày! Tổng thiệt hại ghi nhận: -${formatMoney(
          json.data?.totalCostGenerated || 0
        )} ₫`,
        "Hồi Tố Thành Công"
      );
      setIsBackfillModalOpen(false);
      await Promise.all([fetchPackages(), fetchLogs(1)]);
    } catch (err: any) {
      console.error("[WarehouseFinance] Lỗi hồi tố:", err);
      notify.error(err.message || "Lỗi máy chủ khi hồi tố", "Thất Bại");
    } finally {
      setIsBackfilling(false);
    }
  };

  // Ngày hôm nay theo múi giờ VN (YYYY-MM-DD)
  return {
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
  };
}
