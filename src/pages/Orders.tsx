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

// Import Modal tùy chỉnh
import ConfirmModal from "../components/ConfirmModal";
import ViewOrderModal from "../components/ViewOrderModal";
import EditOrderModal from "../components/EditOrderModal";
import CreateOrderModal from "../components/CreateOrderModal";
import * as Helpers from "../lib/helpers";

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
  (process.env.VITE_API_BASE_URL as string) ||
  "http://localhost:3001";

// =======================================================
// 1. INTERFACES VÀ CONSTANTS
// =======================================================

// Khai báo lại các constants
const API_ENDPOINTS = {
  ORDERS: "/api/orders",
  ORDER_BY_ID: (id: number) => `/api/orders/${id}`,
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
  ngay_dang_ki: string; // Đã là YYYY-MM-DD nếu DB đã chuẩn hóa
  so_ngay_da_dang_ki: string;
  het_han: string; // Đã là YYYY-MM-DD nếu DB đã chuẩn hóa
  nguon: string;
  gia_nhap: string; // String/Numeric từ DB
  gia_ban: string; // String/Numeric từ DB
  note: string;
  tinh_trang: string;
  check_flag: boolean | null;
  // Trường từ Backend:
  so_ngay_con_lai: number;
  // Trường ảo Frontend:
  [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: number;
  [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: number;
  [VIRTUAL_FIELDS.TRANG_THAI_TEXT]: string;
  [VIRTUAL_FIELDS.CHECK_FLAG_STATUS]: boolean | null;
}

// Cấu trúc Stats
const stockStats = [
  {
    name: "Tổng đơn hàng",
    value: "0",
    icon: CheckCircleIcon,
    color: "bg-blue-500",
  },
  {
    name: "Cần Gia Hạn",
    value: "0",
    icon: ExclamationTriangleIcon,
    color: "bg-yellow-500",
  },
  { name: "Hết Hạn", value: "0", icon: ArrowDownIcon, color: "bg-red-500" },
  {
    name: "Đăng Ký Hôm Nay",
    value: "0",
    icon: ArrowUpIcon,
    color: "bg-green-500",
  },
];

// Hàm Helper để kiểm tra ngày đăng ký có phải là hôm nay không (DD/MM/YYYY hoặc YYYY-MM-DD)
// Giữ lại hàm này để logic tính Stats Đăng ký Hôm Nay vẫn hoạt động
const isRegisteredToday = (dateString: string): boolean => {
  if (!dateString) return false;

  // Tạo ngày hiện tại (chỉ ngày, không giờ)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let registerDate: Date;

  if (dateString.includes("-")) {
    // Nếu là YYYY-MM-DD (định dạng chuẩn từ DB sau chuẩn hóa)
    registerDate = new Date(dateString);
  } else {
    // Nếu là DD/MM/YYYY (trường hợp cũ)
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
  const num = Number(value) || 0;
  const roundedNum = Math.round(num);
  return roundedNum.toLocaleString("vi-VN") + " " + "đ";
};

// =======================================================
// 2. CUSTOM HOOK: useOrdersData
// =======================================================

// Hàm Helper để gán giá trị ưu tiên cho trạng thái sắp xếp
const getStatusPriority = (status: string): number => {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus === "hết hạn") return 1;
  if (lowerStatus === "cần gia hạn") return 2;
  if (lowerStatus === "chưa thanh toán") return 3;
  if (lowerStatus === "đã thanh toán") return 4;
  return 5; // Giá trị mặc định thấp nhất
};

const useOrdersData = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ... (Các state Modal giữ nguyên)
  const [isModalOpen, setIsModalOpen] = useState(false); // Confirm Delete
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [orderToView, setOrderToView] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  // ... (Các state Modal giữ nguyên)

  // --- HÀM FETCH DỮ LIỆU BAN ĐẦU ---
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.ORDERS}`);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        // Ép kiểu dữ liệu so_ngay_con_lai từ DB (number) vào state
        setOrders(data as Order[]);
      } else {
        console.error("Dữ liệu nhận được không phải là mảng:", data);
      }
    } catch (error) {
      console.error("Lỗi khi tải đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // --- LOGIC TÍNH TOÁN CÁC TRƯỜNG ẢO VÀ LỌC ---
  const calculatedData = useMemo(() => {
    // Không cần today: const today = new Date(); today.setHours(0, 0, 0, 0);

    const ordersWithVirtualFields: Order[] = orders.map((order) => {
      // FIX: Lấy trực tiếp so_ngay_con_lai từ API
      const soNgayConLai = Number(order.so_ngay_con_lai) || 0;

      const dbStatus = order[ORDER_FIELDS.TINH_TRANG] || "Chưa Thanh Toán";
      let trangThaiText = "";
      let check_flag_status: boolean | null = null;

      // Logic trạng thái dựa trên soNgayConLai từ Backend
      if (soNgayConLai <= 0) {
        trangThaiText = "Hết Hạn";
        check_flag_status = null;
      } else if (soNgayConLai <= 4 && soNgayConLai > 0) {
        trangThaiText = "Cần Gia Hạn";
        check_flag_status = null;
      } else {
        trangThaiText = dbStatus;
        check_flag_status = dbStatus.toLowerCase() === "đã thanh toán";
      }

      const giaBan = Number(order[ORDER_FIELDS.GIA_BAN]) || 0;
      const soNgayDangKy = Number(order[ORDER_FIELDS.SO_NGAY_DA_DANG_KI]) || 0;
      let giaTriConLai = 0;

      // Tính Giá Trị Còn Lại (Không tính giá trị khi đã hết hạn)
      const daysForValue = Math.max(0, soNgayConLai);
      if (soNgayDangKy > 0) {
        giaTriConLai = (giaBan * daysForValue) / soNgayDangKy;
      }

      return {
        ...order,
        [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: soNgayConLai, // Gán giá trị Backend
        [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: giaTriConLai,
        [VIRTUAL_FIELDS.CHECK_FLAG_STATUS]: check_flag_status,
        [VIRTUAL_FIELDS.TRANG_THAI_TEXT]: trangThaiText,
      } as Order;
    });

    const lowerSearchTerm = searchTerm.toLowerCase();
    const filteredOrders = ordersWithVirtualFields.filter((order) => {
      // Logic lọc tìm kiếm (giữ nguyên)
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

      // Logic lọc trạng thái (giữ nguyên)
      let matchesStatus = statusFilter === "all";

      if (!matchesStatus) {
        const statusText = (
          order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || ""
        ).toLowerCase();
        const filterLower = statusFilter.toLowerCase();

        if (
          filterLower === "chưa thanh toán" &&
          statusText === "chưa thanh toán"
        ) {
          matchesStatus = true;
        } else if (
          filterLower === "đã thanh toán" &&
          statusText === "đã thanh toán"
        ) {
          matchesStatus = true;
        } else if (filterLower === "hết hạn" && statusText === "hết hạn") {
          matchesStatus = true;
        } else if (
          filterLower === "cần gia hạn" &&
          statusText === "cần gia hạn"
        ) {
          matchesStatus = true;
        }
      }

      return matchesSearch && matchesStatus;
    });

    // --- LOGIC SẮP XẾP ---
    filteredOrders.sort((a, b) => {
      const statusA = a[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "";
      const statusB = b[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "";

      // 1. Sắp xếp CHÍNH theo Trạng thái (Priority: 1 -> 4)
      const priorityA = Helpers.getStatusPriority(statusA);
      const priorityB = Helpers.getStatusPriority(statusB);

      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Sắp xếp từ ưu tiên cao (số nhỏ) đến thấp
      }

      // 2. Sắp xếp PHỤ theo Số Ngày Còn Lại (từ nhỏ đến lớn)
      const remainingA = a[VIRTUAL_FIELDS.SO_NGAY_CON_LAI];
      const remainingB = b[VIRTUAL_FIELDS.SO_NGAY_CON_LAI];

      if (remainingA !== remainingB) {
        return remainingA - remainingB; // Sắp xếp số từ nhỏ đến lớn
      }

      // 3. Sắp xếp PHỤ theo ID Đơn Hàng (từ nhỏ đến lớn) nếu 2 mục trên bằng nhau
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
    // Cập nhật: Dùng hàm isRegisteredToday mới
    const registeredTodayCount = ordersWithVirtualFields.filter((order) =>
      Helpers.isRegisteredToday(order[ORDER_FIELDS.NGAY_DANG_KI])
    ).length;

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

    return { filteredOrders, currentOrders, totalPages, updatedStats };
  }, [orders, searchTerm, statusFilter, rowsPerPage, currentPage]);

  // Reset trang khi lọc/tìm kiếm thay đổi (giữ nguyên)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, rowsPerPage]);

  // --- HÀM XỬ LÝ MODAL VÀ CRUD (giữ nguyên) ---

  // Modals (giữ nguyên)
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

  // Hành động (giữ nguyên)
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

  // Lưu đơn hàng mới (giữ nguyên, nhưng cần đảm bảo EditOrderModal xử lý ngày)
  const handleSaveNewOrder = async (newOrderData: Partial<Order>) => {
    closeCreateModal();

    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.ORDERS}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newOrderData),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Lỗi khi tạo đơn hàng mới từ server"
        );
      }

      // Refetch dữ liệu để đảm bảo tính toán mới nhất
      await fetchOrders();

      const createdOrder: Order = await response.json();
      handleViewOrder(createdOrder); // Mở Modal View cho đơn hàng vừa tạo
    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng:", error);
      alert(
        `Lỗi khi tạo đơn hàng: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Lưu đơn hàng đã chỉnh sửa (giữ nguyên)
  const handleSaveEdit = async (updatedOrder: Order) => {
    closeEditModal();

    // Lọc bỏ các trường ảo trước khi gửi
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
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Lỗi khi cập nhật đơn hàng từ server"
        );
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

  // Xác nhận xóa (giữ nguyên)
  const confirmDelete = async () => {
    if (!orderToDelete) return;
    setIsModalOpen(false);

    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.ORDER_BY_ID(orderToDelete.id)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Lỗi khi xóa đơn hàng từ server");
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
  };
};

// =======================================================
// 3. COMPONENT CHÍNH (Chỉ là UI)
// =======================================================

export default function Orders() {
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
    filteredOrders, // Dùng để hiển thị tổng số dòng
  } = useOrdersData();

  // --- Render Giao diện (Sử dụng ORDER_FIELDS và VIRTUAL_FIELDS) ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý và theo dõi tất cả đơn hàng của khách hàng
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Tạo đơn hàng mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {updatedStats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <option value="Đã Thanh Toán">Đã Thanh Toán</option>
              <option value="Chưa Thanh Toán">Chưa Thanh Toán</option>
              <option value="Cần Gia Hạn">Cần Gia Hạn</option>
              <option value="Hết Hạn">Hết Hạn</option>
            </select>
          </div>
          {/* Date Range - Tạm thời chưa có logic */}
          <div>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled
            />
          </div>
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[180px] whitespace-nowrap truncate">
                  ORDER/PRODUCT
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px] whitespace-nowrap truncate">
                  INFORMATION
                </th>
                {/* 2. GỘP CUSTOMER + CONTACT */}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px] whitespace-nowrap truncate">
                  CUSTOMER/CONTACT
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[60px] whitespace-nowrap truncate">
                  Slot
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px] whitespace-nowrap truncate">
                  ORDER DATE
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[50px] whitespace-nowrap truncate">
                  DAYS
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[90px] whitespace-nowrap truncate">
                  EXPIRED
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[70px] whitespace-nowrap truncate">
                  REMAINING
                </th>
                {/* 3. GỘP SUPPLY + IMPORT */}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px] whitespace-nowrap truncate">
                  SUPPLY/IMPORT
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[110px] whitespace-nowrap truncate">
                  PRICE
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px] whitespace-nowrap truncate">
                  Residual Value
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[70px] whitespace-nowrap truncate">
                  NOTE
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px] whitespace-nowrap truncate">
                  STATUS
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[50px] whitespace-nowrap truncate">
                  Check
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[110px] whitespace-nowrap truncate">
                  ACTION
                </th>
              </tr>
            </thead>
            {/* tbody: Áp dụng text-center và text-right cho các cột cụ thể */}
            <tbody className="bg-white divide-y divide-gray-200">
              {currentOrders.length === 0 ? (
                <tr>
                  <td colSpan={18} className="text-center py-12">
                    <div className="text-gray-400 text-lg mb-2">
                      Không tìm thấy đơn hàng
                    </div>
                    <div className="text-gray-500">
                      Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
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
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      {/* 1. GỘP ORDER + PRODUCT */}
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 w-[180px] text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold whitespace-nowrap truncate max-w-full">
                            {order[ORDER_FIELDS.ID_DON_HANG] || ""}
                          </span>
                          <span className="text-gray-500 text-xs mt-0.5 whitespace-nowrap truncate max-w-full">
                            {order[ORDER_FIELDS.SAN_PHAM] || ""}
                          </span>
                        </div>
                      </td>

                      {/* INFORMATION (text-center) */}
                      <td className="px-6 py-4 whitespace-nowrap truncate text-sm text-gray-500 w-[120px] text-center">
                        {order[ORDER_FIELDS.THONG_TIN_SAN_PHAM] || ""}
                      </td>

                      {/* 2. GỘP CUSTOMER + CONTACT */}
                      <td className="px-6 py-4 text-sm text-gray-900 w-[200px] text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-medium whitespace-nowrap truncate max-w-full">
                            {order[ORDER_FIELDS.KHACH_HANG] || ""}
                          </span>
                          <span
                            className="text-gray-500 text-xs mt-0.5 whitespace-nowrap truncate max-w-full"
                            title={order[ORDER_FIELDS.LINK_LIEN_HE] || ""}
                          >
                            {order[ORDER_FIELDS.LINK_LIEN_HE] ||
                              "Chưa có liên hệ"}
                          </span>
                        </div>
                      </td>

                      {/* SLOT (text-center) */}
                      <td className="px-6 py-4 whitespace-nowrap truncate text-sm text-gray-900 w-[60px] text-center">
                        {order[ORDER_FIELDS.SLOT] || ""}
                      </td>

                      {/* ORDER DATE (text-center) */}
                      <td className="px-6 py-4 whitespace-nowrap truncate text-sm text-gray-500 w-[100px] text-center">
                        {order[ORDER_FIELDS.NGAY_DANG_KI] || ""}
                      </td>
                      {/* DAYS (text-center) */}
                      <td className="px-6 py-4 whitespace-nowrap truncate text-sm text-gray-500 w-[50px] text-center">
                        {order[ORDER_FIELDS.SO_NGAY_DA_DANG_KI] || ""}
                      </td>
                      {/* EXPIRED (text-center) */}
                      <td className="px-6 py-4 whitespace-nowrap truncate text-sm text-gray-500 w-[90px] text-center">
                        {order[ORDER_FIELDS.HET_HAN] || ""}
                      </td>
                      {/* REMAINING (text-center) */}
                      <td className="px-6 py-4 whitespace-nowrap truncate text-sm font-bold w-[70px] text-center">
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

                      {/* 3. GỘP SUPPLY + IMPORT */}
                      <td className="px-6 py-4 text-sm text-gray-900 w-[150px] text-right">
                        <div className="flex flex-col items-center">
                          <span className="font-medium whitespace-nowrap truncate max-w-full">
                            {order[ORDER_FIELDS.NGUON] || "N/A"}
                          </span>
                          <span className="text-gray-500 text-xs mt-0.5 whitespace-nowrap truncate max-w-full">
                            {Helpers.formatCurrency(order[ORDER_FIELDS.GIA_NHAP])}
                          </span>
                        </div>
                      </td>

                      {/* PRICE (text-right) */}
                      <td className="px-6 py-4 whitespace-nowrap truncate text-sm text-gray-900 w-[110px] text-right">
                        {Helpers.formatCurrency(order[ORDER_FIELDS.GIA_BAN])}
                      </td>

                      {/* RESIDUAL VALUE (text-right) */}
                      <td className="px-6 py-4 whitespace-nowrap truncate text-sm text-gray-900 w-[120px] text-right">
                        {Helpers.formatCurrency(giaTriConLai)}
                      </td>

                      {/* NOTE (text-center) */}
                      <td className="px-6 py-4 whitespace-nowrap truncate text-sm text-gray-500 w-[70px] text-center">
                        {order[ORDER_FIELDS.NOTE] || ""}
                      </td>

                      {/* STATUS (text-center) */}
                      <td className="px-6 py-4 whitespace-nowrap truncate w-[100px] text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${Helpers.getStatusColor(
                            trangThaiText
                          )}`}
                        >
                          {trangThaiText}
                        </span>
                      </td>

                      {/* CHECK (text-center) */}
                      <td className="px-6 py-4 whitespace-nowrap truncate text-center w-[50px]">
                        {check_flag_status !== null && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={check_flag_status}
                            readOnly
                          />
                        )}
                      </td>

                      {/* ACTION (text-right) */}
                      <td className="px-6 py-4 whitespace-nowrap truncate text-right text-sm font-medium w-[110px]">
                        <div className="flex space-x-2 justify-end">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="text-green-600 hover:text-green-900 p-1 rounded"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh Phân trang */}
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
                Trang {currentPage} trên {totalPages} (Tổng:{" "}
                {filteredOrders.length} dòng)
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

