import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Order, OrderDatasetKey, calculateRemainingValue } from "../types";
import { ORDER_STATUS } from "../constants/orderStatus";
import { formatDateYYYYMMDD } from "../utils/durationUtils";
import { useUrlPagination } from "@/shared/hooks/useUrlPagination";

type OrdersSummary = {
  totalRevenue: number;
  totalCost: number;
  totalRemainingValue?: number;
  supplierRemainingValue?: number;
  refundCustomerAmount?: number;
  refundedCustomerAmount?: number;
  refundSupplierAmount?: number;
  paidCount: number;
  renewCount: number;
  processingCount: number;
  pendingCount: number;
  pendingRefundCount?: number;
  refundedCount?: number;
  canceledCount?: number;
  todayCount: number;
  totalOrders: number;
};

export function useOrders(initialTab: OrderDatasetKey = "active") {
  const [activeTabValue, setActiveTabValue] = useState<OrderDatasetKey>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>("");
  const [statusFilterValue, setStatusFilterValue] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [totalPages, setTotalPages] = useState<number>(1);
  const { page, setPage } = useUrlPagination(totalPages);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [tabCounts, setTabCounts] = useState({ active: 0, import: 0, expired: 0, canceled: 0 });
  const [serverSummary, setServerSummary] = useState<OrdersSummary | null>(null);
  const requestSequenceRef = useRef(0);

  const setActiveTab = useCallback((tab: OrderDatasetKey) => {
    setActiveTabValue(tab);
    setPage(1);
  }, [setPage]);

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, [setPage]);

  const setStatusFilter = useCallback((value: string) => {
    setStatusFilterValue(value);
    setPage(1);
  }, [setPage]);

  const fetchOrders = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        search: searchValue,
        status: statusFilterValue,
        tab: activeTabValue,
        includeStats: "true",
      });
      const res = await fetch(`/api/orders?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (requestSequence !== requestSequenceRef.current) return;

      if (!res.ok) {
        console.error("Lỗi lấy danh sách đơn:", data.error);
        return;
      }

      setOrders(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalOrders(data.pagination?.total || 0);
      if (data.tabCounts) setTabCounts(data.tabCounts);
      if (data.summary) setServerSummary(data.summary);
    } catch (err) {
      if (requestSequence === requestSequenceRef.current) {
        console.error("Lỗi kết nối API:", err);
      }
    } finally {
      if (requestSequence === requestSequenceRef.current) setLoading(false);
    }
  }, [activeTabValue, page, searchValue, statusFilterValue]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const summaryData = useMemo(() => {
    const fallbackRemainingValue = orders.reduce(
      (sum: number, order: Order) => sum + calculateRemainingValue(order),
      0
    );

    if (serverSummary) {
      return {
        ...serverSummary,
        totalRemainingValue: serverSummary.totalRemainingValue ?? fallbackRemainingValue,
      };
    }

    const todayStr = formatDateYYYYMMDD(new Date());
    const revenue = orders.reduce((sum: number, order: Order) => sum + Number(order.price || 0), 0);
    const cost = orders.reduce((sum: number, order: Order) => sum + Number(order.cost || 0), 0);
    const paid = orders.filter((order: Order) => order.status === ORDER_STATUS.PAID).length;
    const renew = orders.filter((order: Order) => order.status === ORDER_STATUS.RENEW_REQUIRED).length;
    const pending = orders.filter((order: Order) => order.status === ORDER_STATUS.UNPAID || order.status === ORDER_STATUS.RENEW_REQUIRED || order.status === ORDER_STATUS.EXPIRED).length;
    const today = orders.filter((order: Order) => {
      const date = order.order_date || order.created_at;
      return date && String(date).startsWith(todayStr);
    }).length;

    return {
      totalRevenue: revenue,
      totalCost: cost,
      paidCount: paid,
      renewCount: renew,
      processingCount: 0,
      pendingCount: pending,
      todayCount: today,
      totalOrders: orders.length,
      totalRemainingValue: fallbackRemainingValue,
    };
  }, [serverSummary, orders]);

  return {
    activeTab: activeTabValue,
    setActiveTab,
    orders,
    loading,
    search: searchValue,
    setSearch,
    statusFilter: statusFilterValue,
    setStatusFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    page,
    setPage,
    totalPages,
    totalOrders,
    tabCounts,
    summaryData,
    fetchOrders,
    refreshOrders: fetchOrders,
  };
}
