import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  API_ENDPOINTS,
  ORDER_DATASET_CONFIG,
  ORDER_FIELDS,
  ORDER_STATUSES,
  VIRTUAL_FIELDS,
  Order,
  OrderDatasetKey,
} from "../../../../constants";
import {
  normalizeOrderCode,
  normalizeSearchText,
  parseErrorResponse,
  parseExpiryTime,
  parseNumeric,
  resolveDateDisplay,
  sanitizeDateLike,
  sanitizeNumberLike,
} from "../utils/ordersHelpers";
import { API_BASE_URL } from "../../../../lib/api";
import * as Helpers from "../../../../lib/helpers";
import { useDebounce } from "./useDebounce";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import { STAT_CARD_ACCENTS as CARD_ACCENTS, StatAccent } from "../../../../components/ui/StatCard";

export type EditableOrder = Omit<Order, "cost" | "price"> & {
  cost: number | string;
  price: number | string;
};

type BaseStat = {
  name: string;
  value: string;
  icon: React.ElementType;
  accent: StatAccent;
};

const BASE_STOCK_STATS: BaseStat[] = [
  {
    name: "Tổng Đơn Hàng",
    value: "0",
    icon: CheckCircleIcon,
    accent: CARD_ACCENTS.sky,
  },
  {
    name: "Cần Gia Hạn",
    value: "0",
    icon: ExclamationTriangleIcon,
    accent: CARD_ACCENTS.amber,
  },
  {
    name: "Hết Hạn",
    value: "0",
    icon: ArrowDownIcon,
    accent: CARD_ACCENTS.rose,
  },
  {
    name: "Đăng Ký Hôm Nay",
    value: "0",
    icon: ArrowUpIcon,
    accent: CARD_ACCENTS.emerald,
  },
] as const;

const API_BASE = API_BASE_URL;

export const useOrdersData = (dataset: OrderDatasetKey) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [orderToView, setOrderToView] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<EditableOrder | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [renewingOrderCode, setRenewingOrderCode] = useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const pendingRefundStatus = ORDER_STATUSES.CHO_HOAN;
  const isUnpaidStatus = (statusText: string) =>
    statusText === ORDER_STATUSES.CHUA_THANH_TOAN ||
    statusText === pendingRefundStatus;

  // --- HÀM FETCH DỮ LIỆU BAN ĐẦU ---
  const fetchOrders = useCallback(async () => {
    try {
      setFetchError(null);
      const endpoint = ORDER_DATASET_CONFIG[dataset].endpoint;
      const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: "include",
      });
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) {
        throw new Error(`Lỗi máy chủ: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setOrders(data as Order[]);
      } else {
        console.error("Dữ liệu nhận được không phải là mảng:", data);
      }
    } catch (error) {
      console.error("Lỗi khi tải đơn hàng:", error);
      const friendlyMessage =
        error instanceof TypeError
          ? "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại dịch vụ backend."
          : error instanceof Error
          ? error.message
          : "Có lỗi không xác định khi tải đơn hàng.";
      setFetchError(friendlyMessage);
    } finally {
      // no-op
    }
  }, [dataset]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setOrders([]);
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
    setIsCreateModalOpen(false);
    setOrderToView(null);
    setOrderToDelete(null);
    setOrderToEdit(null);
  }, [dataset]);

  const calculatedData = useMemo(() => {
    const ordersWithVirtualFields: Order[] = orders.map((order) => {
      const registrationSource = sanitizeDateLike(
        order.registration_date ?? order[ORDER_FIELDS.ORDER_DATE]
      );
      const expirySource = sanitizeDateLike(
        order.expiry_date ?? order[ORDER_FIELDS.ORDER_EXPIRED]
      );

      const formattedOrderDate = resolveDateDisplay(
        sanitizeDateLike(order.registration_date_display),
        registrationSource
      );
      const formattedExpiryDate = resolveDateDisplay(
        sanitizeDateLike(order.expiry_date_display),
        expirySource
      );

      const backendRemaining = parseNumeric(
        sanitizeNumberLike(order.so_ngay_con_lai)
      );
      const fallbackRemaining = Helpers.daysUntilDate(
        expirySource || formattedExpiryDate
      );
      const effectiveRemaining =
        backendRemaining !== null && backendRemaining !== undefined
          ? backendRemaining
          : fallbackRemaining ?? 0;

      const rawStatus =
        (order[ORDER_FIELDS.STATUS] as string | null) ||
        ORDER_STATUSES.CHUA_THANH_TOAN;
      const trangThaiText = String(rawStatus || "").trim();

      const giaBan = Helpers.roundGiaBanValue(
        Number.parseFloat(String(order[ORDER_FIELDS.PRICE] ?? 0)) || 0
      );
      const soNgayDangKy = Number(order[ORDER_FIELDS.DAYS]) || 0;
      const daysForValue = Math.max(0, effectiveRemaining);
      let giaTriConLai =
        soNgayDangKy > 0 ? (giaBan * daysForValue) / soNgayDangKy : 0;

      const rawRefund =
        order.can_hoan ??
        (order as Record<string, unknown>)[ORDER_FIELDS.REFUND] ??
        (order as Record<string, unknown>)["refund"];
      let canHoanValue =
        parseNumeric(rawRefund) ?? (Number.isFinite(giaTriConLai) ? giaTriConLai : null);

      // For Hoàn tiền dataset, always reflect the refund column exactly.
      if (dataset === "canceled") {
        const refundFromDb = parseNumeric(
          (order as Record<string, unknown>)["refund"]
        );
        if (refundFromDb !== null) {
          giaTriConLai = refundFromDb;
          canHoanValue = refundFromDb;
        }
      }

      return {
        ...order,
        [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: effectiveRemaining,
        [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: giaTriConLai,
        [VIRTUAL_FIELDS.TRANG_THAI_TEXT]: trangThaiText,
        [VIRTUAL_FIELDS.ORDER_DATE_DISPLAY]: formattedOrderDate,
        [VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY]: formattedExpiryDate,
        can_hoan: canHoanValue,
      } as Order;
    });

    const normalizedSearchTerm = normalizeSearchText(debouncedSearchTerm);
    const normalizedOrderSearchTerm = normalizeOrderCode(debouncedSearchTerm);
    const searchableFields =
      searchField === "all"
        ? [
            ORDER_FIELDS.CUSTOMER,
            ORDER_FIELDS.ID_ORDER,
            ORDER_FIELDS.ID_PRODUCT,
            ORDER_FIELDS.INFORMATION_ORDER,
            ORDER_FIELDS.SUPPLY,
            ORDER_FIELDS.CONTACT,
          ]
        : [searchField];
    const statusFilterValue =
      statusFilter === "all" ? "" : String(statusFilter || "").trim();
    const filteredOrders = ordersWithVirtualFields.filter((order) => {
        const matchesSearch =
          !normalizedSearchTerm ||
          searchableFields.some((field) => {
            const rawValue = (order as Record<string, unknown>)[field];
            const normalizedFieldValue = normalizeSearchText(rawValue);
          if (!normalizedFieldValue) return false;

          if (field === ORDER_FIELDS.ID_ORDER) {
            const normalizedOrderValue = normalizeOrderCode(rawValue);
            return (
              (!!normalizedOrderSearchTerm &&
                normalizedOrderValue.includes(normalizedOrderSearchTerm)) ||
              normalizedFieldValue.includes(normalizedSearchTerm)
            );
          }

          return normalizedFieldValue.includes(normalizedSearchTerm);
        });

        // Always allow searching by Mã đơn hàng, even if a narrower field is selected.
        const orderCodeFallbackMatch =
          !!normalizedOrderSearchTerm &&
          normalizeOrderCode(order[ORDER_FIELDS.ID_ORDER]).includes(
            normalizedOrderSearchTerm
          );
        const productFallbackMatch =
          !!normalizedSearchTerm &&
          normalizeSearchText(order[ORDER_FIELDS.ID_PRODUCT]).includes(
            normalizedSearchTerm
          );

        const orderStatusText = String(
          order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || ""
        ).trim();
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilterValue && orderStatusText === statusFilterValue);

        return (
          (matchesSearch || orderCodeFallbackMatch || productFallbackMatch) &&
          matchesStatus
        );
      });

    // --- LOGIC SẮP XẾP ---
    filteredOrders.sort((a, b) => {
      const statusA = String(a[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "").trim();
      const statusB = String(b[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "").trim();
      const unpaidA = isUnpaidStatus(statusA);
      const unpaidB = isUnpaidStatus(statusB);

      if (unpaidA !== unpaidB) {
        return unpaidA ? -1 : 1;
      }

      if (dataset === "expired") {
        const timeA = parseExpiryTime(a);
        const timeB = parseExpiryTime(b);
        if (timeA !== timeB) {
          return timeB - timeA;
        }
      }

      const priorityA = Helpers.getStatusPriority(statusA);
      const priorityB = Helpers.getStatusPriority(statusB);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const remainingA = Number(a[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);
      const remainingB = Number(b[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);

      if (remainingA !== remainingB) {
        return remainingA - remainingB;
      }

      const idA = a[ORDER_FIELDS.ID_ORDER] || "";
      const idB = b[ORDER_FIELDS.ID_ORDER] || "";

      if (idA < idB) return -1;
      if (idA > idB) return 1;
      return 0;
    });

    const totalOrders = ordersWithVirtualFields.length;
    const needsRenewal = ordersWithVirtualFields.filter((order) => {
      const remaining = Number(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);
      return Number.isFinite(remaining) && remaining > 0 && remaining <= 4;
    }).length;
    const expiredOrders = ordersWithVirtualFields.filter((order) => {
      const remaining = Number(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);
      return Number.isFinite(remaining) && remaining <= 0;
    }).length;

    const registeredTodayCount = ordersWithVirtualFields.filter((order) => {
      const registrationSource = sanitizeDateLike(
        order.registration_date ||
          order.registration_date_display ||
          order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] ||
          order[ORDER_FIELDS.ORDER_DATE]
      );
      return Helpers.isRegisteredToday(registrationSource);
    }).length;

    const updatedStats = [
      { ...BASE_STOCK_STATS[0], value: String(totalOrders) },
      { ...BASE_STOCK_STATS[1], value: String(needsRenewal) },
      { ...BASE_STOCK_STATS[2], value: String(expiredOrders) },
      { ...BASE_STOCK_STATS[3], value: String(registeredTodayCount) },
    ];

    const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstRow, indexOfLastRow);

    return {
      filteredOrders,
      currentOrders,
      totalPages,
      updatedStats,
      totalRecords: totalOrders,
    };
  }, [
    orders,
    debouncedSearchTerm,
    searchField,
    statusFilter,
    rowsPerPage,
    currentPage,
    dataset,
  ]);

  const { filteredOrders, totalPages } = calculatedData;

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, searchField, statusFilter, rowsPerPage]);

  const paginationPages = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    const clamp = (v: number, min: number, max: number) =>
      Math.min(Math.max(v, min), max);
    const start = clamp(currentPage - 1, 2, totalPages - 3);
    const end = clamp(currentPage + 1, 4, totalPages - 1);
    pages.push(1);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  const closeViewModal = useCallback(() => {
    setIsViewModalOpen(false);
    setOrderToView(null);
  }, []);
  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setOrderToEdit(null);
  }, []);
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setOrderToDelete(null);
  }, []);
  const handleViewOrder = useCallback((order: Order) => {
    setOrderToView(order);
    setIsViewModalOpen(true);
  }, []);
  const handleEditOrder = useCallback((order: Order) => {
    const converted: EditableOrder = {
      ...order,
      cost: Number(order[ORDER_FIELDS.COST] ?? 0) || 0,
      price: Number(order[ORDER_FIELDS.PRICE] ?? 0) || 0,
    };
    setOrderToEdit(converted);
    setIsEditModalOpen(true);
  }, []);
  const handleDeleteOrder = useCallback((order: Order) => {
    setOrderToDelete(order);
    setIsModalOpen(true);
  }, []);
  type CreateOrderPayload = Partial<EditableOrder> | EditableOrder;

  const handleSaveNewOrder = useCallback(
    async (newOrderData: CreateOrderPayload) => {
      closeCreateModal();

      try {
        const response = await fetch(`${API_BASE}${API_ENDPOINTS.ORDERS}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(newOrderData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Lỗi khi tạo đơn hàng mới từ Máy chủ"
          );
        }
        await fetchOrders();

        const createdOrder: Order = await response.json();
        handleViewOrder(createdOrder);
      } catch (error) {
        console.error("Lỗi khi tạo đơn hàng:", error);
        alert(
          `Lỗi khi tạo đơn hàng: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
    [closeCreateModal, fetchOrders, handleViewOrder]
  );

  const handleMarkPaid = useCallback(
    async (order: Order) => {
      if (!order || !order.id) return;
      const statusText = String(order[ORDER_FIELDS.STATUS] || "").trim();
      let payload: Partial<Order> | null = null;
      if (statusText === ORDER_STATUSES.CHUA_THANH_TOAN) {
        payload = {
          [ORDER_FIELDS.STATUS]: ORDER_STATUSES.DANG_XU_LY,
        };
      } else if (statusText === ORDER_STATUSES.DANG_XU_LY) {
        payload = {
          [ORDER_FIELDS.STATUS]: ORDER_STATUSES.DA_THANH_TOAN,
        };
      }

      if (!payload) return;
      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.ORDER_BY_ID(order.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          }
        );
        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new Error(
            errorMessage || "Lỗi khi cập nhật trạng thái từ máy chủ"
          );
        }
        await fetchOrders();
      } catch (error) {
        console.error("Lỗi khi đánh dấu đã thanh toán:", error);
        alert(
          `Không thể đánh dấu đã thanh toán: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
    [fetchOrders]
  );

  const handleRenewOrder = useCallback(
    async (order: Order) => {
      if (!order) return;
      const orderCode = String(order[ORDER_FIELDS.ID_ORDER] || "").trim();
      if (!orderCode) {
        alert("Không tìm thấy mã đơn để gia hạn.");
        return;
      }

      const renewUrl = `${API_BASE}${API_ENDPOINTS.ORDER_RENEW(orderCode)}`;
      console.log("[Renew] start", {
        orderCode,
        orderId: order.id,
        apiBase: API_BASE,
        renewUrl,
      });
      setRenewingOrderCode(orderCode);
      try {
        const response = await fetch(renewUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ forceRenewal: true }),
        });

        let responseBody: string | null = null;
        try {
          responseBody = await response.clone().text();
        } catch {
          responseBody = null;
        }
        console.log("[Renew] response", {
          orderCode,
          status: response.status,
          body: responseBody,
        });

        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new Error(
            errorMessage ||
              `Gia hạn thất bại (mã: ${response.status || "unknown"})`
          );
        }

        await fetchOrders();
        alert("Gia hạn thành công.");
      } catch (error) {
        console.error("Lỗi khi gia hạn đơn:", error);
        alert(
          `Gia hạn thất bại: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        setRenewingOrderCode(null);
      }
    },
    [fetchOrders]
  );

  const handleConfirmRefund = useCallback(
    async (order: Order) => {
      if (!order || !order.id) return;
      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.ORDER_CANCELED_REFUND(order.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }
        );
        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new Error(
            errorMessage || "Lỗi khi xác nhận hoàn tiền từ máy chủ"
          );
        }
        await fetchOrders();
      } catch (error) {
        console.error("Lỗi khi xác nhận hoàn tiền:", error);
        alert(
          `Lỗi khi xác nhận hoàn tiền: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
    [fetchOrders]
  );

  const handleSaveEdit = useCallback(
    async (updatedOrder: EditableOrder) => {
      closeEditModal();

      const dbFields: Partial<Order> = {
        [ORDER_FIELDS.ID_ORDER]: updatedOrder.id_order,
        [ORDER_FIELDS.ID_PRODUCT]: updatedOrder.id_product,
        [ORDER_FIELDS.INFORMATION_ORDER]: updatedOrder.information_order,
        [ORDER_FIELDS.CUSTOMER]: updatedOrder.customer,
        [ORDER_FIELDS.CONTACT]: updatedOrder.contact,
        [ORDER_FIELDS.SLOT]: updatedOrder.slot,
        [ORDER_FIELDS.SUPPLY]: updatedOrder.supply,
        [ORDER_FIELDS.COST]: Number(updatedOrder.cost ?? 0) || 0,
        [ORDER_FIELDS.PRICE]: Number(updatedOrder.price ?? 0) || 0,
        [ORDER_FIELDS.NOTE]: updatedOrder.note,
        [ORDER_FIELDS.STATUS]: updatedOrder.status,
      };

      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.ORDER_BY_ID(Number(updatedOrder.id))}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(dbFields),
          }
        );

        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new Error(errorMessage || "Lỗi khi cập nhật đơn hàng từ Máy chủ");
        }
        await fetchOrders();
      } catch (error) {
        console.error("Lỗi khi cập nhật đơn hàng:", error);
        alert(
          `Lỗi khi cập nhật đơn hàng: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
    [closeEditModal, fetchOrders]
  );

  const confirmDelete = useCallback(async () => {
    if (!orderToDelete) return;
    setIsModalOpen(false);

    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.ORDER_BY_ID(orderToDelete.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            can_hoan: orderToDelete[VIRTUAL_FIELDS.GIA_TRI_CON_LAI],
            gia_tri_con_lai: orderToDelete[VIRTUAL_FIELDS.GIA_TRI_CON_LAI],
          }),
        }
      );

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage || "Lỗi khi xóa đơn hàng từ Máy chủ");
      }

      setOrders((prevOrders) =>
        prevOrders.filter((order) => order.id !== orderToDelete.id)
      );
    } catch (error) {
      console.error("Lỗi khi xóa đơn hàng:", error);
      alert(
        `Lỗi khi xóa đơn hàng: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setOrderToDelete(null);
    }
  }, [orderToDelete]);

  return {
    ...calculatedData,
    filteredOrders,
    paginationPages,
    searchTerm,
    setSearchTerm,
    searchField,
    setSearchField,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    isModalOpen,
    isViewModalOpen,
    isEditModalOpen,
    isCreateModalOpen,
    orderToView,
    orderToDelete,
    orderToEdit,
    openCreateModal,
    closeCreateModal,
    closeViewModal,
    closeEditModal,
    closeModal,
    handleViewOrder,
    handleEditOrder,
    handleDeleteOrder,
    handleSaveNewOrder,
    handleSaveEdit,
    handleConfirmRefund,
    handleMarkPaid,
    handleRenewOrder,
    confirmDelete,
    fetchError,
    reloadOrders: fetchOrders,
    renewingOrderCode,
  };
};
