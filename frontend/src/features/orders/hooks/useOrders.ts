import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Order, OrderDatasetKey, calculateRemainingValue } from "../types";
import { ORDER_STATUS } from "../constants/orderStatus";
import { formatDateYYYYMMDD } from "../utils/durationUtils";
import { useUrlPagination } from "@/shared/hooks/useUrlPagination";
import { ordersApiClient } from "../api/ordersApiClient";

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
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [tabCounts, setTabCounts] = useState({ active: 0, import: 0, expired: 0, canceled: 0 });
  const [serverSummary, setServerSummary] = useState<OrdersSummary | null>(null);
  const requestSequenceRef = useRef(0);
  const lastStatsFilterKeyRef = useRef<string | null>(null);

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

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, [setPage]);

  const fetchOrders = useCallback(async (forceStats: boolean = false) => {
    const requestSequence = ++requestSequenceRef.current;
    const filterKey = `${activeTabValue}|${searchValue}|${statusFilterValue}`;
    const shouldIncludeStats = forceStats || lastStatsFilterKeyRef.current !== filterKey;
    setLoading(true);

    try {
      const data = await ordersApiClient.getOrders({
        page,
        limit: pageSize,
        search: searchValue,
        status: statusFilterValue,
        tab: activeTabValue,
        includeStats: shouldIncludeStats,
      });
      if (requestSequence !== requestSequenceRef.current) return;

      setOrders(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalOrders(data.pagination?.total || 0);
      if (data.tabCounts) setTabCounts(data.tabCounts);
      if (data.summary) setServerSummary(data.summary);
      if (shouldIncludeStats) {
        lastStatsFilterKeyRef.current = filterKey;
      }
    } catch (err: any) {
      if (requestSequence === requestSequenceRef.current) {
        console.error("Lỗi lấy danh sách đơn:", err?.message || err);
      }
    } finally {
      if (requestSequence === requestSequenceRef.current) setLoading(false);
    }
  }, [activeTabValue, page, pageSize, searchValue, statusFilterValue]);

  const refreshOrders = useCallback(() => fetchOrders(true), [fetchOrders]);

  useEffect(() => {
    void fetchOrders(false);
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
    pageSize,
    setPageSize: handlePageSizeChange,
    tabCounts,
    summaryData,
    fetchOrders,
    refreshOrders,
  };
}
