import { useState, useEffect, useCallback, useMemo } from "react";
import { Order, OrderDatasetKey, calculateRemainingValue } from "../types";
import { ORDER_STATUS } from "../constants/orderStatus";
import { formatDateYYYYMMDD } from "../utils/durationUtils";

export function useOrders(initialTab: OrderDatasetKey = "active") {
  const [activeTab, setActiveTab] = useState<OrderDatasetKey>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [tabCounts, setTabCounts] = useState({ active: 0, import: 0, expired: 0, canceled: 0 });

  const [serverSummary, setServerSummary] = useState<{
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
  } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders?page=${page}&limit=15&search=${encodeURIComponent(
          search
        )}&status=${encodeURIComponent(statusFilter)}&tab=${activeTab}`
      );
      const data = await res.json();
      if (res.ok) {
        setOrders(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalOrders(data.pagination?.total || 0);
        if (data.tabCounts) setTabCounts(data.tabCounts);
        if (data.summary) setServerSummary(data.summary);
      } else {
        console.error("Lỗi lấy danh sách đơn:", data.error);
      }
    } catch (err) {
      console.error("Lỗi kết nối API:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const summaryData = useMemo(() => {
    const fallbackRemainingValue = orders.reduce(
      (sum: number, o: Order) => sum + calculateRemainingValue(o),
      0
    );

    if (serverSummary) {
      return {
        ...serverSummary,
        totalRemainingValue: serverSummary.totalRemainingValue ?? fallbackRemainingValue,
      };
    }

    const todayStr = formatDateYYYYMMDD(new Date());
    const revenue = orders.reduce((sum: number, o: Order) => sum + Number(o.price || 0), 0);
    const cost = orders.reduce((sum: number, o: Order) => sum + Number(o.cost || 0), 0);
    const paid = orders.filter((o: Order) => o.status === ORDER_STATUS.PAID).length;
    const renew = orders.filter((o: Order) => o.status === ORDER_STATUS.RENEW_REQUIRED).length;
    const processing = 0;
    const pending = orders.filter((o: Order) => o.status === ORDER_STATUS.UNPAID || o.status === ORDER_STATUS.RENEW_REQUIRED || o.status === ORDER_STATUS.EXPIRED).length;
    const today = orders.filter((o: Order) => {
      const d = o.order_date || o.created_at;
      return d && String(d).startsWith(todayStr);
    }).length;

    return {
      totalRevenue: revenue,
      totalCost: cost,
      paidCount: paid,
      renewCount: renew,
      processingCount: processing,
      pendingCount: pending,
      todayCount: today,
      totalOrders: orders.length,
      totalRemainingValue: fallbackRemainingValue,
    };
  }, [serverSummary, orders]);

  return {
    activeTab,
    setActiveTab,
    orders,
    loading,
    search,
    setSearch,
    statusFilter,
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
  };
}
