import React, { useState, useEffect } from "react";
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

// Import Constants
import { API_ENDPOINTS, ORDER_FIELDS, VIRTUAL_FIELDS } from "../constants";

// Import Modal tùy chỉnh
import ConfirmModal from "../components/ConfirmModal";
import ViewOrderModal from "../components/ViewOrderModal";
import EditOrderModal from "../components/EditOrderModal";
import CreateOrderModal from "../components/CreateOrderModal";

// Interface Order (dựa trên DB) - Vẫn giữ nguyên cấu trúc này
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
  nguon: string;
  gia_nhap: number;
  gia_ban: number;
  note: string;
  tinh_trang: string;
  check_flag: boolean;
  [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]?: number;
  [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]?: number;
  [VIRTUAL_FIELDS.TRANG_THAI_TEXT]?: string;
  [VIRTUAL_FIELDS.CHECK_FLAG_STATUS]?: boolean | null;
}

// Cấu trúc Stats đã được cập nhật với tên mới và giá trị tạm thời
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
  {
    name: "Hết Hạn",
    value: "0",
    icon: ArrowDownIcon,
    color: "bg-red-500",
  },
  {
    name: "Đăng Ký Hôm Nay",
    value: "0",
    icon: ArrowUpIcon,
    color: "bg-green-500",
  },
];

// Hàm Helper để xử lý ngày tháng (dd/mm/yyyy)
const parseDMY = (dateString: string): Date => {
  if (!dateString) return new Date(NaN);
  const [day, month, year] = dateString.split("/").map(Number);
  // Tháng trong JavaScript bắt đầu từ 0
  return new Date(year, month - 1, day);
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Hàm Helper để kiểm tra ngày đăng ký có phải là hôm nay không (dd/mm/yyyy)
  const isRegisteredToday = (dateString: string): boolean => {
    if (!dateString) return false;
    const [day, month, year] = dateString.split("/").map(Number);
    if (!day || !month || !year) return false;

    const registerDate = new Date(year, month - 1, day);
    // Chuẩn hóa giờ về 0:0:0:0 để so sánh chỉ ngày
    registerDate.setHours(0, 0, 0, 0);

    return registerDate.getTime() === today.getTime();
  };

  // useEffect để tải dữ liệu ban đầu
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // SỬ DỤNG HẰNG SỐ API
        const response = await fetch(
          `http://localhost:3001${API_ENDPOINTS.ORDERS}`
        );
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setOrders(data);
        } else {
          console.error("Dữ liệu nhận được không phải là mảng:", data);
        }
      } catch (error) {
        console.error("Lỗi khi tải đơn hàng:", error);
      }
    };

    fetchOrders();
  }, []);

  // --- Hàm xử lý cho Modal Tạo Mới ---
  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  // Hàm MỚI cho View Modal (để hiển thị đơn hàng vừa tạo)
  const openViewModal = (order: Order) => {
    setOrderToView(order);
    setIsViewModalOpen(true);
  };

  const handleSaveNewOrder = async (newOrderData: Partial<Order>) => {
    console.log("Tạo đơn hàng mới:", newOrderData);
    closeCreateModal();

    try {
      const response = await fetch(
        `http://localhost:3001${API_ENDPOINTS.ORDERS}`, // POST không cần ID
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

      const createdOrder: Order = await response.json();

      // Cập nhật danh sách orders trên frontend
      setOrders((prevOrders) => [createdOrder, ...prevOrders]);

      // 🛑 THAY THẾ ALERT BẰNG VIỆC MỞ MODAL VIEW 🛑
      openViewModal(createdOrder);
    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng:", error);
      alert(
        `Lỗi khi tạo đơn hàng: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // --- Hàm xử lý cho Modal Edit/Delete ---

  const handleViewOrder = (orderWithVirtualFields: Order) => {
    console.log(
      "Mở modal xem chi tiết cho đơn hàng ID:",
      orderWithVirtualFields.id
    );
    setOrderToView(orderWithVirtualFields);
    setIsViewModalOpen(true);
  };

  const handleEditOrder = (orderToEdit: Order) => {
    // SỬA: Nhận đủ object Order
    console.log("Mở modal sửa cho đơn hàng ID:", orderToEdit.id);
    setOrderToEdit(orderToEdit);
    setIsEditModalOpen(true);
  };

  const handleDeleteOrder = (order: Order) => {
    console.log("Mở modal xác nhận xóa cho đơn hàng ID:", order.id);
    setOrderToDelete(order);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;

    console.log("Xác nhận xóa đơn hàng ID:", orderToDelete.id);
    setIsModalOpen(false);

    try {
      // SỬ DỤNG HẰNG SỐ API
      const response = await fetch(
        `http://localhost:3001${API_ENDPOINTS.ORDER_BY_ID(orderToDelete.id)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Lỗi khi xóa đơn hàng từ server");
      }

      setOrders((prevOrders) =>
        prevOrders.filter((order) => order.id !== orderToDelete.id)
      );
      console.log(`Đã xóa đơn hàng ID ${orderToDelete.id} thành công.`);
      // TODO: Hiển thị thông báo thành công
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

  const closeModal = () => {
    setIsModalOpen(false);
    setOrderToDelete(null);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setOrderToEdit(null);
  };

  // --- HÀM CẬP NHẬT ĐÃ SỬA ĐỂ LỌC BỎ TRƯỜNG ẢO (SỬ DỤNG HẰNG SỐ) ---
  const handleSaveEdit = async (updatedOrder: Order) => {
    console.log("Lưu đơn hàng đã chỉnh sửa:", updatedOrder);
    closeEditModal(); // Đóng modal ngay lập tức

    // Lọc bỏ các trường ảo (virtual fields) trước khi gửi
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
      // KHÔNG BAO GỒM VIRTUAL_FIELDS
    };

    try {
      // SỬ DỤNG HẰNG SỐ API
      const response = await fetch(
        `http://localhost:3001${API_ENDPOINTS.ORDER_BY_ID(updatedOrder.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dbFields), // <-- CHỈ GỬI CÁC TRƯỜNG CỦA DB
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Lỗi khi cập nhật đơn hàng từ server"
        );
      }

      // Cập nhật state trên frontend với dữ liệu mới
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        )
      );
      console.log(`Đã cập nhật đơn hàng ID ${updatedOrder.id} thành công.`);
      // TODO: Hiển thị thông báo thành công
    } catch (error) {
      console.error("Lỗi khi cập nhật đơn hàng:", error);
      alert(
        `Lỗi khi cập nhật đơn hàng: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // --- Các hàm Helper (Giữ nguyên) ---

  const getStatusColor = (status: string) => {
    const lowerStatus = (status || "").toLowerCase();
    switch (lowerStatus) {
      case "đã thanh toán":
        return "bg-green-100 text-green-800";
      case "chưa thanh toán":
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

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setOrderToView(null);
  };

  // --- Logic Tính toán & Lọc (Sử dụng ORDER_FIELDS và VIRTUAL_FIELDS) ---

  const ordersWithVirtualFields = orders.map((order) => {
    const expirationDate = parseDMY(order[ORDER_FIELDS.HET_HAN]); // SỬ DỤNG HẰNG SỐ
    const diffTime = expirationDate.getTime() - today.getTime();
    let soNgayConLai = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (isNaN(soNgayConLai)) soNgayConLai = 0;

    const dbStatus = order[ORDER_FIELDS.TINH_TRANG] || "Chưa Thanh Toán"; // SỬ DỤNG HẰNG SỐ
    let trangThaiText = "";
    let check_flag_status: boolean | null = null;

    if (soNgayConLai <= 0) {
      trangThaiText = "Hết Hạn";
      check_flag_status = null;
      soNgayConLai = 0;
    } else if (soNgayConLai <= 4) {
      trangThaiText = "Chưa Thanh Toán";
      check_flag_status = null;
    } else {
      trangThaiText = dbStatus;
      check_flag_status = dbStatus.toLowerCase() === "đã thanh toán";
    }

    const giaBan = Number(order[ORDER_FIELDS.GIA_BAN]) || 0; // SỬ DỤNG HẰNG SỐ
    const soNgayDangKy = Number(order[ORDER_FIELDS.SO_NGAY_DA_DANG_KI]) || 0; // SỬ DỤNG HẰNG SỐ
    let giaTriConLai = 0;
    if (soNgayDangKy > 0) {
      giaTriConLai = (giaBan * soNgayConLai) / soNgayDangKy;
    }

    return {
      ...order,
      [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: soNgayConLai,
      [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: giaTriConLai,
      [VIRTUAL_FIELDS.CHECK_FLAG_STATUS]: check_flag_status,
      [VIRTUAL_FIELDS.TRANG_THAI_TEXT]: trangThaiText,
    } as Order; // Cast lại về Order để khớp với interface
  });

  // --- Tính toán giá trị cho Stats (Sử dụng VIRTUAL_FIELDS) ---
  const totalOrders = ordersWithVirtualFields.length;
  // Cần Gia Hạn: Ngày còn lại > 0 và <= 4
  const needsRenewal = ordersWithVirtualFields.filter(
    (order) =>
      order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] > 0 &&
      order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] <= 4
  ).length;
  // Hết Hạn: Ngày còn lại <= 0
  const expiredOrders = ordersWithVirtualFields.filter(
    (order) => order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] <= 0
  ).length;
  // Đăng Ký Hôm Nay: Ngày đăng ký là ngày hôm nay
  const registeredToday = ordersWithVirtualFields.filter((order) =>
    isRegisteredToday(order[ORDER_FIELDS.NGAY_DANG_KI])
  ).length;

  // Cập nhật mảng stats với giá trị đã tính toán (Giữ nguyên)
  const updatedStats = [
    {
      ...stockStats[0],
      value: String(totalOrders),
    },
    {
      ...stockStats[1],
      value: String(needsRenewal),
    },
    {
      ...stockStats[2],
      value: String(expiredOrders),
    },
    {
      ...stockStats[3],
      value: String(registeredToday),
    },
  ];

  // --- Logic Lọc (Sử dụng ORDER_FIELDS và VIRTUAL_FIELDS) ---

  const filteredOrders = ordersWithVirtualFields.filter((order) => {
    const lowerSearchTerm = searchTerm.toLowerCase();
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
      (order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "").toLowerCase() ===
        statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstRow, indexOfLastRow);

  // --- Render Giao diện (Sử dụng ORDER_FIELDS và VIRTUAL_FIELDS) ---
  return (
    <div className="space-y-6">
      {/* Header (Giữ nguyên) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý và theo dõi tất cả đơn hàng của khách hàng
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={openCreateModal} // <-- Mở modal Tạo Mới
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Tạo đơn hàng mới
          </button>
        </div>
      </div>

      {/* Stats (Giữ nguyên) */}
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

      {/* Filters (Giữ nguyên) */}
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
              <option value="Hết Hạn">Hết Hạn</option>
            </select>
          </div>
          {/* Date Range */}
          <div>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {/* thead (Giữ nguyên) */}
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ORDER
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PRODUCT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  INFORMATION
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CUSTOMER
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CONTACT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ORDER DATE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DAYS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EXPIRED
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  REMAINING
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SUPPLY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IMPORT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PRICE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Residual Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NOTE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  STATUS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ACTION
                </th>
              </tr>
            </thead>
            {/* tbody */}
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
                      {/* Cột 1-9 (Sử dụng ORDER_FIELDS) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order[ORDER_FIELDS.ID_DON_HANG] || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                        {order[ORDER_FIELDS.SAN_PHAM] || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {order[ORDER_FIELDS.THONG_TIN_SAN_PHAM] || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order[ORDER_FIELDS.KHACH_HANG] || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {order[ORDER_FIELDS.LINK_LIEN_HE] || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                        {order[ORDER_FIELDS.SLOT] || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order[ORDER_FIELDS.NGAY_DANG_KI] || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order[ORDER_FIELDS.SO_NGAY_DA_DANG_KI] || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order[ORDER_FIELDS.HET_HAN] || ""}
                      </td>
                      {/* Cột 10 (Sử dụng VIRTUAL_FIELDS) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {soNgayConLai}
                      </td>
                      {/* Cột 11 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {order[ORDER_FIELDS.NGUON] || ""}
                      </td>
                      {/* Cột 12-14 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(order[ORDER_FIELDS.GIA_NHAP])}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(order[ORDER_FIELDS.GIA_BAN])}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(giaTriConLai)}
                      </td>
                      {/* Cột 15 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {order[ORDER_FIELDS.NOTE] || ""}
                      </td>
                      {/* Cột 16 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            trangThaiText
                          )}`}
                        >
                          {trangThaiText}
                        </span>
                      </td>
                      {/* Cột 17 */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {check_flag_status !== null && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={check_flag_status}
                            readOnly
                          />
                        )}
                      </td>
                      {/* Cột 18 (Hành động) */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          {/* Nút VIEW (Giữ nguyên) */}
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>

                          {/* Nút EDIT: Đảm bảo truyền đối tượng 'order' đầy đủ */}
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="text-green-600 hover:text-green-900 p-1 rounded"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>

                          {/* Nút DELETE (Giữ nguyên) */}
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

        {/* Thanh Phân trang (Giữ nguyên) */}
        {filteredOrders.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            {/* Bộ chọn số dòng / trang */}
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <span>Hiển thị</span>
              <select
                id="rowsPerPage"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
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

      {/* Render Modal Xác nhận Xóa */}
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
        onSave={handleSaveNewOrder} // <-- Truyền hàm lưu đơn hàng mới
      />
    </div>
  );
}
