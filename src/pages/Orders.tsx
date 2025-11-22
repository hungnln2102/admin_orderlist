// Orders.tsx - Mã đã được làm sạch và đồng bộ với API Backend

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "../components/GradientButton";
import StatCard, { STAT_CARD_ACCENTS } from "../components/StatCard";

// Import Modal tùy chỉnh
import ConfirmModal from "../components/ConfirmModal";
import ViewOrderModal from "../components/ViewOrderModal";
import EditOrderModal from "../components/EditOrderModal";
import CreateOrderModal from "../components/CreateOrderModal";
import * as Helpers from "../lib/helpers";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  (process.env.VITE_API_BASE_URL as string) ||
  "http://localhost:3001";

// =======================================================
// 1. INTERFACES VÀ CONSTANTS
// =======================================================

// Khai báo lại các constants
const API_ENDPOINTS = {
  ORDERS: "/api/orders",
  ORDERS_EXPIRED: "/api/orders?scope=expired",
  ORDERS_CANCELED: "/api/orders?scope=canceled",
  ORDER_BY_ID: (id: number) => `/api/orders/${id}`,
  ORDER_CANCELED_REFUND: (id: number) => `/api/orders/canceled/${id}/refund`,
  // ... (Thêm các endpoints khác nếu cần)
};

const ORDER_FIELDS = {
  ID_DON_HANG: "id_don_hang",
  SAN_PHAM: "san_pham",
  THONG_TIN_SAN_PHAM: "thong_tin_san_pham",
  KHACH_HANG: "khach_hang",
  LINK_LIEN_HE: "link_lien_he",
  SLOT: "slot",
  NGAY_DANG_KI: "ngay_dang_ki",
  SO_NGAY_DA_DANG_KI: "so_ngay_da_dang_ki",
  HET_HAN: "het_han",
  NGUON: "nguon",
  GIA_NHAP: "gia_nhap",
  GIA_BAN: "gia_ban",
  NOTE: "note",
  TINH_TRANG: "tinh_trang",
  CHECK_FLAG: "check_flag",
};

const VIRTUAL_FIELDS = {
  SO_NGAY_CON_LAI: "so_ngay_con_lai_virtual",
  GIA_TRI_CON_LAI: "gia_tri_con_lai_virtual",
  TRANG_THAI_TEXT: "trang_thai_text_virtual",
  CHECK_FLAG_STATUS: "check_flag_status_virtual",
  ORDER_DATE_DISPLAY: "order_date_display_virtual",
  EXPIRY_DATE_DISPLAY: "expiry_date_display_virtual",
};

// Interface Order (dựa trên DB + trường ảo)
interface Order {
  id: number;
  id_don_hang: string;
  san_pham: string;
  thong_tin_san_pham: string;
  khach_hang: string;
  link_lien_he: string;
  slot: string;
  ngay_dang_ki: string;
  so_ngay_da_dang_ki: string;
  het_han: string;
  registration_date?: string;
  expiry_date?: string;
  registration_date_display?: string;
  expiry_date_display?: string;
  nguon: string;
  gia_nhap: string;
  gia_ban: string;
  note: string;
  tinh_trang: string;
  check_flag: boolean | null;
  so_ngay_con_lai: number | null;

  [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: number;
  [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: number;
  [VIRTUAL_FIELDS.TRANG_THAI_TEXT]: string;
  [VIRTUAL_FIELDS.CHECK_FLAG_STATUS]: boolean | null;
  [VIRTUAL_FIELDS.ORDER_DATE_DISPLAY]: string;
  [VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY]: string;
}

const STATUS_DISPLAY_LABELS: Record<string, string> = {
  "het han": "Hết Hạn",
  "can gia han": "Cần Gia Hạn",
};

const stockStats = [
  {
    name: "Tổng Đơn Hàng",
    value: "0",
    icon: CheckCircleIcon,
    accent: STAT_CARD_ACCENTS.sky,
  },
  {
    name: "Cần Gia Hạn",
    value: "0",
    icon: ExclamationTriangleIcon,
    accent: STAT_CARD_ACCENTS.amber,
  },
  {
    name: "Hết Hạn",
    value: "0",
    icon: ArrowDownIcon,
    accent: STAT_CARD_ACCENTS.rose,
  },
  {
    name: "Đăng Ký Hôm Nay",
    value: "0",
    icon: ArrowUpIcon,
    accent: STAT_CARD_ACCENTS.emerald,
  },
];

type OrderDatasetKey = "active" | "expired" | "canceled";

const ORDER_DATASET_CONFIG: Record<
  OrderDatasetKey,
  { label: string; description: string; endpoint: string }
> = {
  active: {
    label: "Đơn Hàng",
    description: "Danh sách đơn đang hoạt động",
    endpoint: API_ENDPOINTS.ORDERS,
  },
  expired: {
    label: "Hết Hạn",
    description: "Danh sách các đơn hàng đã hết hạn",
    endpoint: API_ENDPOINTS.ORDERS_EXPIRED,
  },
  canceled: {
    label: "Hoàn Tiền",
    description: "Đơn đã hủy/hoàn tiền",
    endpoint: API_ENDPOINTS.ORDERS_CANCELED,
  },
};

const ORDER_DATASET_SEQUENCE: OrderDatasetKey[] = [
  "active",
  "expired",
  "canceled",
];

const isRegisteredToday = (dateString: string): boolean => {
  if (!dateString) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let registerDate: Date;

  if (dateString.includes("-")) {
    registerDate = new Date(dateString);
  } else {
    const [day, month, year] = dateString.split("/").map(Number);
    if (!day || !month || !year) return false;
    registerDate = new Date(year, month - 1, day);
  }

  registerDate.setHours(0, 0, 0, 0);
  return registerDate.getTime() === today.getTime();
};

const getStatusColor = (status: string) => {
  const lowerStatus = (status || "").toLowerCase();
  switch (lowerStatus) {
    case "đã thanh toán":
      return "bg-green-100 text-green-800";
    case "chưa thanh toán":
    case "cần gia hạn":
      return "bg-yellow-100 text-yellow-800";
    case "hết hạn":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatCurrency = (value: number | string) => {
  const roundedNum = Helpers.roundGiaBanValue(value);
  return roundedNum.toLocaleString("vi-VN") + " VND";
};

// =======================================================
// 2. CUSTOM HOOK: useOrdersData
// =======================================================

const getStatusPriority = (status: string): number => {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus === "hết hạn") return 1;
  if (lowerStatus === "cần gia hạn") return 2;
  if (lowerStatus === "chưa thanh toán") return 3;
  if (lowerStatus === "đã thanh toán") return 4;
  return 5;
};

const useOrdersData = (dataset: OrderDatasetKey) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [orderToView, setOrderToView] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const parseErrorResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const data = await response.json();
        if (data?.error) return data.error;
        if (typeof data === "string") return data;
        return JSON.stringify(data);
      } catch {
        return response.statusText || "Lỗi không xác định từ máy chủ.";
      }
    }

    try {
      const text = await response.text();
      return text || response.statusText || "Lỗi không xác định từ máy chủ.";
    } catch {
      return response.statusText || "Lỗi không xác định từ máy chủ.";
    }
  };

  // --- HÀM FETCH DỮ LIỆU BAN ĐẦU ---
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const endpoint = ORDER_DATASET_CONFIG[dataset].endpoint;
      const response = await fetch(`${API_BASE}${endpoint}`);
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
      setLoading(false);
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

  // --- LOGIC TÍNH TOÁN CÁC TRƯỜNG ẢO VÀ LỌC ---
  const calculatedData = useMemo(() => {
    const resolveDateDisplay = (
      displayValue: unknown,
      fallbackValue: unknown
    ): string => {
      const value =
        displayValue !== undefined && displayValue !== null
          ? displayValue
          : fallbackValue;
      if (value === null || value === undefined) return "";
      return Helpers.formatDateToDMY(value as any) || String(value);
    };

    const parseNumeric = (value: unknown): number | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const normalizeCheckFlag = (value: unknown): boolean | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === "boolean") return value;
      if (typeof value === "number") {
        if (value === 1) return true;
        if (value === 0) return false;
      }
      if (typeof value === "string") {
        const lowered = value.trim().toLowerCase();
        if (["true", "t", "1"].includes(lowered)) return true;
        if (["false", "f", "0"].includes(lowered)) return false;
      }
      return null;
    };

    const normalizeStatusValue = (value: string): string => {
      if (!value) return "";
      return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    };
    const formatStatusDisplay = (value: string): string => {
      const normalized = normalizeStatusValue(value);
      if (normalized && STATUS_DISPLAY_LABELS[normalized]) {
        return STATUS_DISPLAY_LABELS[normalized];
      }
      return value;
    };

    const getDayStartTimestamp = (value: unknown): number | null => {
      if (value === null || value === undefined) return null;

      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const copy = new Date(
          value.getFullYear(),
          value.getMonth(),
          value.getDate()
        );
        copy.setHours(0, 0, 0, 0);
        return copy.getTime();
      }

      const raw = String(value).trim();
      if (!raw) return null;

      let year: number | undefined;
      let month: number | undefined;
      let day: number | undefined;

      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        [year, month, day] = raw.split("-").map(Number);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [d, m, y] = raw.split("/").map(Number);
        year = y;
        month = m;
        day = d;
      } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(raw)) {
        [year, month, day] = raw.split("/").map(Number);
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
        const [d, m, y] = raw.split("-").map(Number);
        year = y;
        month = m;
        day = d;
      }

      if (
        year === undefined ||
        month === undefined ||
        day === undefined ||
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day)
      ) {
        return null;
      }

      const result = new Date(year, month - 1, day);
      result.setHours(0, 0, 0, 0);
      return Number.isNaN(result.getTime()) ? null : result.getTime();
    };

    const registrationTimestampForOrder = (order: Order): number | null => {
      const rawValue =
        order.registration_date ||
        (order as any).registration_date_display ||
        order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY];
      return getDayStartTimestamp(rawValue);
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();

    const ordersWithVirtualFields: Order[] = orders.map((order) => {
      const registrationSource =
        order.registration_date ?? order[ORDER_FIELDS.NGAY_DANG_KI];
      const expirySource = order.expiry_date ?? order[ORDER_FIELDS.HET_HAN];

      const formattedOrderDate = resolveDateDisplay(
        order.registration_date_display,
        registrationSource
      );
      const formattedExpiryDate = resolveDateDisplay(
        order.expiry_date_display,
        expirySource
      );

      const backendRemaining = parseNumeric(
        (order as any).so_ngay_con_lai ?? order.so_ngay_con_lai
      );
      const fallbackRemaining = Helpers.daysUntilDate(
        expirySource || formattedExpiryDate
      );
      const effectiveRemaining =
        backendRemaining !== null && backendRemaining !== undefined
          ? backendRemaining
          : fallbackRemaining ?? 0;

      const rawStatus =
        (order[ORDER_FIELDS.TINH_TRANG] as string | null) || "Chưa Thanh Toán";
      const trangThaiText = formatStatusDisplay(rawStatus.trim());
      const checkFlagStatus = normalizeCheckFlag(
        order[ORDER_FIELDS.CHECK_FLAG]
      );

      const giaBan = Helpers.roundGiaBanValue(order[ORDER_FIELDS.GIA_BAN]);
      const soNgayDangKy = Number(order[ORDER_FIELDS.SO_NGAY_DA_DANG_KI]) || 0;
      const daysForValue = Math.max(0, effectiveRemaining);
      const giaTriConLai =
        soNgayDangKy > 0 ? (giaBan * daysForValue) / soNgayDangKy : 0;

      return {
        ...order,
        [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: effectiveRemaining,
        [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: giaTriConLai,
        [VIRTUAL_FIELDS.CHECK_FLAG_STATUS]: checkFlagStatus,
        [VIRTUAL_FIELDS.TRANG_THAI_TEXT]: trangThaiText,
        [VIRTUAL_FIELDS.ORDER_DATE_DISPLAY]: formattedOrderDate,
        [VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY]: formattedExpiryDate,
      } as Order;
    });

    const lowerSearchTerm = searchTerm.toLowerCase();
    const normalizedStatusFilter =
      statusFilter === "all" ? "" : normalizeStatusValue(statusFilter);
    const filteredOrders = ordersWithVirtualFields.filter((order) => {
      const matchesSearch =
        (order[ORDER_FIELDS.KHACH_HANG] || "")
          .toLowerCase()
          .includes(lowerSearchTerm) ||
        (order[ORDER_FIELDS.ID_DON_HANG] || "")
          .toLowerCase()
          .includes(lowerSearchTerm) ||
        (order[ORDER_FIELDS.THONG_TIN_SAN_PHAM] || "")
          .toLowerCase()
          .includes(lowerSearchTerm);

      const matchesStatus =
        statusFilter === "all" ||
        normalizeStatusValue(
          String(order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "")
        ) === normalizedStatusFilter;

      return matchesSearch && matchesStatus;
    });

    // --- LOGIC SẮP XẾP ---
    filteredOrders.sort((a, b) => {
      const statusA = a[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "";
      const statusB = b[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "";
      const priorityA = Helpers.getStatusPriority(statusA);
      const priorityB = Helpers.getStatusPriority(statusB);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const remainingA = a[VIRTUAL_FIELDS.SO_NGAY_CON_LAI];
      const remainingB = b[VIRTUAL_FIELDS.SO_NGAY_CON_LAI];

      if (remainingA !== remainingB) {
        return remainingA - remainingB;
      }

      const idA = a[ORDER_FIELDS.ID_DON_HANG] || "";
      const idB = b[ORDER_FIELDS.ID_DON_HANG] || "";

      if (idA < idB) return -1;
      if (idA > idB) return 1;
      return 0;
    });

    // Tính toán Stats
    const totalOrders = ordersWithVirtualFields.length;
    const needsRenewal = ordersWithVirtualFields.filter(
      (order) =>
        order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] > 0 &&
        order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] <= 4
    ).length;
    const expiredOrders = ordersWithVirtualFields.filter(
      (order) => order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] <= 0
    ).length;

    const maxHistoricalIdBeforeToday = ordersWithVirtualFields.reduce(
      (maxId, order) => {
        const registrationTs = registrationTimestampForOrder(order);
        if (
          registrationTs !== null &&
          registrationTs < todayStartTimestamp &&
          Number.isFinite(order.id)
        ) {
          return Math.max(maxId, Number(order.id) || 0);
        }
        return maxId;
      },
      0
    );

    const registeredTodayCount = ordersWithVirtualFields.filter((order) => {
      const registrationTs = registrationTimestampForOrder(order);
      if (registrationTs === null) return false;
      return (
        registrationTs === todayStartTimestamp &&
        Number(order.id) > maxHistoricalIdBeforeToday
      );
    }).length;

    // Cập nhật mảng stats
    const updatedStats = [
      { ...stockStats[0], value: String(totalOrders) },
      { ...stockStats[1], value: String(needsRenewal) },
      { ...stockStats[2], value: String(expiredOrders) },
      { ...stockStats[3], value: String(registeredTodayCount) },
    ];

    // Phân trang
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
  }, [orders, searchTerm, statusFilter, rowsPerPage, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, rowsPerPage]);

  // --- HÀM XỬ LÝ MODAL VÀ CRUD (giữ nguyên) ---

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);
  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setOrderToView(null);
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setOrderToEdit(null);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setOrderToDelete(null);
  };
  const handleViewOrder = (order: Order) => {
    setOrderToView(order);
    setIsViewModalOpen(true);
  };
  const handleEditOrder = (order: Order) => {
    setOrderToEdit(order);
    setIsEditModalOpen(true);
  };
  const handleDeleteOrder = (order: Order) => {
    setOrderToDelete(order);
    setIsModalOpen(true);
  };
  const handleSaveNewOrder = async (newOrderData: Partial<Order>) => {
    closeCreateModal();

    try {
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.ORDERS}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  };

  const handleConfirmRefund = async (order: Order) => {
    if (!order || !order.id) return;
    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.ORDER_CANCELED_REFUND(order.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage || "Lỗi khi xác nhận hoàn tiền từ máy chủ");
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
  };

  const handleSaveEdit = async (updatedOrder: Order) => {
    closeEditModal();

    const dbFields: Partial<Order> = {
      [ORDER_FIELDS.ID_DON_HANG]: updatedOrder.id_don_hang,
      [ORDER_FIELDS.SAN_PHAM]: updatedOrder.san_pham,
      [ORDER_FIELDS.THONG_TIN_SAN_PHAM]: updatedOrder.thong_tin_san_pham,
      [ORDER_FIELDS.KHACH_HANG]: updatedOrder.khach_hang,
      [ORDER_FIELDS.LINK_LIEN_HE]: updatedOrder.link_lien_he,
      [ORDER_FIELDS.SLOT]: updatedOrder.slot,
      [ORDER_FIELDS.NGAY_DANG_KI]: updatedOrder.ngay_dang_ki,
      [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: updatedOrder.so_ngay_da_dang_ki,
      [ORDER_FIELDS.HET_HAN]: updatedOrder.het_han,
      [ORDER_FIELDS.NGUON]: updatedOrder.nguon,
      [ORDER_FIELDS.GIA_NHAP]: updatedOrder.gia_nhap,
      [ORDER_FIELDS.GIA_BAN]: updatedOrder.gia_ban,
      [ORDER_FIELDS.NOTE]: updatedOrder.note,
      [ORDER_FIELDS.TINH_TRANG]: updatedOrder.tinh_trang,
      [ORDER_FIELDS.CHECK_FLAG]: updatedOrder.check_flag,
    };

    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.ORDER_BY_ID(updatedOrder.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dbFields),
        }
      );

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage || "Lỗi khi cập nhật đơn hàng từ Máy chủ");
      }
      // Refetch dữ liệu để đảm bảo tính toán mới nhất
      await fetchOrders();
    } catch (error) {
      console.error("Lỗi khi cập nhật đơn hàng:", error);
      alert(
        `Lỗi khi cập nhật đơn hàng: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    setIsModalOpen(false);

    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.ORDER_BY_ID(orderToDelete.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            can_hoan: orderToDelete[VIRTUAL_FIELDS.GIA_TRI_CON_LAI],
            gia_tri_con_lai: orderToDelete[VIRTUAL_FIELDS.GIA_TRI_CON_LAI],
            check_flag: orderToDelete[VIRTUAL_FIELDS.CHECK_FLAG_STATUS],
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
  };

  return {
    // Data & Logic
    ...calculatedData,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,

    // Modal State
    isModalOpen,
    isViewModalOpen,
    isEditModalOpen,
    isCreateModalOpen,
    orderToView,
    orderToDelete,
    orderToEdit,

    // Modal Actions
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
    confirmDelete,
    fetchError,
    reloadOrders: fetchOrders,
  };
};

// =======================================================
// 3. COMPONENT CHÍNH (Chỉ là UI)
// =======================================================

export default function Orders() {
  const [datasetKey, setDatasetKey] = useState<OrderDatasetKey>("active");
  const [datasetCounts, setDatasetCounts] = useState<
    Record<OrderDatasetKey, number>
  >({
    active: 0,
    expired: 0,
    canceled: 0,
  });
  const {
    currentOrders,
    totalPages,
    updatedStats,
    searchTerm,
    setSearchTerm,
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
    confirmDelete,
    fetchError,
    reloadOrders,
    filteredOrders, // Dùng để hiển thị tổng số dòng
    totalRecords,
  } = useOrdersData(datasetKey);

  useEffect(() => {
    setDatasetCounts((prev) => {
      if (prev[datasetKey] === totalRecords) {
        return prev;
      }
      return { ...prev, [datasetKey]: totalRecords };
    });
  }, [datasetKey, totalRecords]);

  const isActiveDataset = datasetKey === "active";

  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const handleToggleDetails = (orderId: number) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  // --- Render Giao diện (Sử dụng ORDER_FIELDS và VIRTUAL_FIELDS) ---
  return (
    <div className="space-y-6">
      {fetchError && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={reloadOrders}
            className="rounded-md border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-100"
          >
            Thử Lại
          </button>
        </div>
      )}
      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản Lý Đơn Hàng</h1>

          <p className="mt-1 text-sm text-gray-500">
            Quản lý và theo dõi tất cả các đơn hàng của khách hàng
          </p>
        </div>

        <div className="mt-4 sm:mt-0">
          {isActiveDataset && (
            <GradientButton icon={PlusIcon} onClick={openCreateModal}>
              Tạo Đơn Hàng Mới
            </GradientButton>
          )}
        </div>
      </div>

      {/* Dataset Switcher */}

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {ORDER_DATASET_SEQUENCE.map((key) => {
            const config = ORDER_DATASET_CONFIG[key];

            const isActive = datasetKey === key;

            const count = datasetCounts[key] ?? 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setDatasetKey(key)}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-transparent bg-gradient-to-r from-indigo-50 to-green-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-indigo-200"
                }`}
              >
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      isActive ? "text-indigo-600" : "text-gray-700"
                    }`}
                  >
                    {config.label}
                  </p>

                  <p className="text-xs text-gray-500">{config.description}</p>
                </div>

                <div
                  className={`text-2xl font-bold ${
                    isActive ? "text-indigo-600" : "text-gray-400"
                  }`}
                >
                  {count.toLocaleString("vi-VN")}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {updatedStats.map((stat) => (
          <StatCard
            key={stat.name}
            title={stat.name}
            value={stat.value}
            icon={stat.icon}
            accent={stat.accent}
          />
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm đơn hàng, khách hàng..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Status Filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Đã Thanh Toán">Đã thanh toán</option>
              <option value="Chưa Thanh Toán">Chưa thanh toán</option>
              <option value="Cần Gia Hạn">Cần gia hạn</option>
              <option value="Hết Hạn">Hết hạn</option>
            </select>
          </div>
          {/* Date Range removed as requested */}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            {/* thead: Áp dụng width cố định, whitespace-nowrap và truncate, text-center */}
            <thead className="bg-gray-50">
              <tr>
                {/* 1. GỘP ORDER + PRODUCT */}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px] whitespace-nowrap truncate">
                  ĐƠN HÀNG/SẢN PHẨM
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px] whitespace-nowrap truncate">
                  THÔNG TIN ĐƠN HÀNG
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px] whitespace-nowrap truncate">
                  KHÁCH HÀNG
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px] whitespace-nowrap truncate">
                  HẠN ĐƠN HÀNG
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[60px] whitespace-nowrap truncate">
                  CÒN LẠI
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[90px] whitespace-nowrap truncate">
                  TRẠNG THÁI
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[90px] whitespace-nowrap truncate">
                  THAO TÁC
                </th>
              </tr>
            </thead>
            {/* tbody: Áp dụng text-center và text-right cho các cột cụ thể */}
            <tbody className="bg-white divide-y divide-gray-200">
              {currentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="text-gray-400 text-lg mb-2">
                      Không tìm thấy đơn hàng
                    </div>
                    <div className="text-gray-500">
                      Thử thay đổi bộ lọc tìm kiếm
                    </div>
                  </td>
                </tr>
              ) : (
                currentOrders.map((order) => {
                  const {
                    [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: soNgayConLai,
                    [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: giaTriConLai,
                    [VIRTUAL_FIELDS.TRANG_THAI_TEXT]: trangThaiText,
                    [VIRTUAL_FIELDS.CHECK_FLAG_STATUS]: check_flag_status,
                  } = order;
                  const normalizedStatus = (trangThaiText || "")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase();
                  const canConfirmRefund =
                    datasetKey === "canceled" &&
                    !normalizedStatus.includes("hoàn") &&
                    !normalizedStatus.includes("hoàn tiền");

                  const orderDateDisplay =
                    order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] || "";
                  const expiryDateDisplay =
                    order[VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY] || "";
                  const isExpanded = expandedOrderId === order.id;

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        onClick={() => handleToggleDetails(order.id)}
                        className={`cursor-pointer hover:bg-gray-50 ${
                          isExpanded ? "bg-indigo-50/60" : ""
                        }`}
                      >
                        {/* 1. GỘP ORDER + PRODUCT */}
                        <td className="px-4 py-4 text-sm font-medium text-gray-900 w-[150px] text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold whitespace-nowrap truncate max-w-[150px]">
                              {order[ORDER_FIELDS.ID_DON_HANG] || ""}
                            </span>
                            <span className="text-gray-500 text-xs mt-0.5 whitespace-nowrap truncate max-w-[150px]">
                              {order[ORDER_FIELDS.SAN_PHAM] || ""}
                            </span>
                          </div>
                        </td>

                        {/* INFORMATION + SLOT (text-center) */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 w-[140px] text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-gray-600 text-xs whitespace-nowrap truncate max-w-[150px]">
                              {order[ORDER_FIELDS.THONG_TIN_SAN_PHAM] || ""}
                            </span>
                            {order[ORDER_FIELDS.SLOT] ? (
                              <span className="text-gray-500 text-xs mt-0.5 whitespace-nowrap truncate max-w-[150px]">
                                {order[ORDER_FIELDS.SLOT]}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 2. GỘP CUSTOMER + CONTACT */}
                        <td className="px-4 py-4 text-sm text-gray-900 w-[150px] text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-medium whitespace-nowrap truncate max-w-[150px]">
                              {order[ORDER_FIELDS.KHACH_HANG] || ""}
                            </span>
                            <span
                              className="text-gray-500 text-xs mt-0.5 whitespace-nowrap truncate max-w-[150px]"
                              title={order[ORDER_FIELDS.LINK_LIEN_HE] || ""}
                            >
                              {order[ORDER_FIELDS.LINK_LIEN_HE] || ""}
                            </span>
                          </div>
                        </td>

                        {/* ORDER RANGE (text-center) */}
                        <td className="px-4 py-4 whitespace-nowrap truncate text-sm text-gray-500 w-[150px] text-center">
                          {orderDateDisplay && expiryDateDisplay
                            ? `${orderDateDisplay} - ${expiryDateDisplay}`
                            : orderDateDisplay || expiryDateDisplay || ""}
                        </td>
                        {/* REMAINING (text-center) */}
                        <td className="px-4 py-4 whitespace-nowrap truncate text-sm font-bold w-[60px] text-center">
                          <span
                            className={
                              soNgayConLai <= 0
                                ? "text-red-600"
                                : soNgayConLai <= 4
                                ? "text-orange-500"
                                : "text-indigo-600"
                            }
                          >
                            {soNgayConLai}
                          </span>
                        </td>

                        {/* STATUS (text-center) */}
                        <td className="px-4 py-4 whitespace-nowrap truncate w-[90px] text-center">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${Helpers.getStatusColor(
                              trangThaiText
                            )}`}
                          >
                            {trangThaiText}
                          </span>
                        </td>
                        {/* ACTION (text-right) */}
                        <td className="px-4 py-4 whitespace-nowrap truncate text-right text-sm font-medium w-[90px]">
                          <div className="flex space-x-2 justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewOrder(order);
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            {canConfirmRefund && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmRefund(order);
                                }}
                                className="text-emerald-600 hover:text-emerald-800 p-1 rounded"
                                title="Xác nhận đã giải/hoàn tiền"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                            )}
                            {isActiveDataset && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditOrder(order);
                                  }}
                                  className="text-green-600 hover:text-green-900 p-1 rounded"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteOrder(order);
                                  }}
                                  className="text-red-600 hover:text-red-900 p-1 rounded"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-6 pb-6 pt-0">
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 shadow-sm">
                              <div className="mb-4 flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-700">
                                  Chi tiết thanh toán
                                </p>
                                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                  #{order[ORDER_FIELDS.ID_DON_HANG] || ""}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-center">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Nguồn
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-gray-900">
                                    {order[ORDER_FIELDS.NGUON] || "N/A"}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-center">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Giá nhập
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-gray-900">
                                    {Helpers.formatCurrency(
                                      order[ORDER_FIELDS.GIA_NHAP]
                                    )}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-center">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Giá bán
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-gray-900">
                                    {Helpers.formatCurrency(
                                      order[ORDER_FIELDS.GIA_BAN]
                                    )}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-center">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Giá trị còn lại
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-gray-900">
                                    {Helpers.formatCurrency(giaTriConLai)}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-center">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Số ngày
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-gray-900">
                                    {order[ORDER_FIELDS.SO_NGAY_DA_DANG_KI] ||
                                      0}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-center sm:col-span-2 lg:col-span-5 flex flex-col items-center justify-center">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Ghi chú
                                  </p>
                                  <p className="mt-1 text-sm text-gray-700 text-center">
                                    {order[ORDER_FIELDS.NOTE] ||
                                      "Không có ghi chú."}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-center sm:col-span-2 lg:col-span-5 flex flex-col items-center justify-center">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Kiểm tra
                                  </p>
                                  {check_flag_status === null ? (
                                    <div className="mt-3 h-5" />
                                  ) : (
                                    <div className="mt-3 flex items-center justify-center">
                                      <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={check_flag_status}
                                        readOnly
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh phân trang */}
        {filteredOrders.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            {/* Bộ chọn số dòng / trang */}
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <span>Hiển thị</span>
              <select
                id="rowsPerPage"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="rounded-md border border-gray-300 py-1 pl-2 pr-7 text-gray-700 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>dòng</span>
            </div>
            {/* Nút bấm chuyển trang */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Trang {currentPage} của {totalPages} (Tổng:{" "}
                {filteredOrders.length} kết quả)
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa đơn hàng: ${orderToDelete?.id_don_hang}?`}
      />
      <ViewOrderModal
        isOpen={isViewModalOpen}
        onClose={closeViewModal}
        order={orderToView}
        formatCurrency={formatCurrency}
      />
      <EditOrderModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        order={orderToEdit}
        onSave={handleSaveEdit}
      />
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSave={handleSaveNewOrder}
      />
    </div>
  );
}