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
} from "@heroicons/react/24/outline";

// Interface (dựa trên DB image_14f83a.png)
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
  check_flag: string;
}

// Hàm Helper để xử lý ngày tháng (dd/mm/yyyy)
const parseDMY = (dateString: string): Date => {
  if (!dateString) return new Date(NaN);
  const [day, month, year] = dateString.split("/").map(Number);
  return new Date(year, month - 1, day);
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/orders");
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

  // Filter
  const filteredOrders = orders.filter((order) => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const matchesSearch =
      (order.khach_hang || "").toLowerCase().includes(lowerSearchTerm) ||
      (order.id_don_hang || "").toLowerCase().includes(lowerSearchTerm) ||
      (order.thong_tin_san_pham || "").toLowerCase().includes(lowerSearchTerm);
    const matchesStatus =
      statusFilter === "all" ||
      (order.tinh_trang || "").toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Hàm lấy màu
  const getStatusColor = (status: string) => {
    const lowerStatus = (status || "").toLowerCase();
    switch (lowerStatus) {
      case "đã thanh toán":
        return "bg-green-100 text-green-800";
      case "chưa thanh toán":
        return "bg-yellow-100 text-yellow-800";
      case "hết hạn": // Thêm case "Hết Hạn"
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  const formatCurrency = (value: number | string) => {
    const num = Number(value) || 0;
    const roundedNum = Math.round(num);
    return roundedNum.toLocaleString("vi-VN") + "đ";
  };
  // Logic Phân trang
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstRow, indexOfLastRow);

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
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            Tạo đơn hàng mới
          </button>
        </div>
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
            {/* thead (18 cột) */}
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Đơn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sản Phẩm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thông Tin Đơn Hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Khách Hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thông Tin Liên Hệ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đặt Hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số Ngày
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hết Hạn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Còn Lại
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nguồn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nhập
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bán
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá Trị Còn Lại
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ghi Chú
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng Thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành Động
                </th>
              </tr>
            </thead>

            {/* Dùng 'currentOrders' để map */}
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
                  // --- Bắt đầu tính toán ---
                  const expirationDate = parseDMY(order.het_han);
                  const diffTime = expirationDate.getTime() - today.getTime();
                  let soNgayConLai = Math.ceil(
                    diffTime / (1000 * 60 * 60 * 24)
                  );

                  // Logic cho "Hết Hạn"
                  let trangThaiText = order.tinh_trang || "Không xác định";
                  if (soNgayConLai <= 0 && trangThaiText !== "Đã Thanh Toán") {
                    soNgayConLai = 0;
                    // Nếu đã hết hạn VÀ chưa thanh toán, thì cập nhật trạng thái
                    trangThaiText = "Hết Hạn";
                  }

                  const giaBan = Number(order.gia_ban) || 0;
                  const soNgayDangKy = Number(order.so_ngay_da_dang_ki) || 0;
                  let giaTriConLai = 0;
                  if (soNgayDangKy > 0) {
                    giaTriConLai = (giaBan * soNgayConLai) / soNgayDangKy;
                  }
                  // --- Kết thúc tính toán ---

                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      {/* Cột 1 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.id_don_hang || ""}
                      </td>
                      {/* Cột 2 (CSS) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                        {order.san_pham || ""}
                      </td>
                      {/* Cột 3 (CSS) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {order.thong_tin_san_pham || ""}
                      </td>
                      {/* Cột 4 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.khach_hang || ""}
                      </td>
                      {/* Cột 5 (CSS) - ĐÃ SỬA */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {order.link_lien_he || ""}
                      </td>
                      {/* Cột 6 (CSS) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                        {order.slot || ""}
                      </td>
                      {/* Cột 7 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.ngay_dang_ki || ""}
                      </td>
                      {/* Cột 8 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.so_ngay_da_dang_ki || ""}
                      </td>
                      {/* Cột 9 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.het_han || ""}
                      </td>
                      {/* Cột 10 (Tính toán) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {soNgayConLai}
                      </td>
                      {/* Cột 11 (CSS) - ĐÃ SỬA */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {order.nguon || ""}
                      </td>
                      {/* Cột 12 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(order.gia_nhap) || ""}
                      </td>
                      {/* Cột 13 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(order.gia_ban) || ""}
                      </td>
                      {/* Cột 14 (Tính toán) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(giaTriConLai)}
                      </td>
                      {/* Cột 15 (CSS) - ĐÃ SỬA */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {order.note || ""}
                      </td>
                      {/* Cột 16 (Trạng thái) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            trangThaiText
                          )}`}
                        >
                          {trangThaiText}
                        </span>
                      </td>
                      {/* Cột 17 (Checkbox) */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={
                            (order.check_flag || "").toLowerCase() ===
                            "đã check"
                          }
                          readOnly
                        />
                      </td>
                      {/* Cột 18 (Hành động) */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900 p-1 rounded">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-900 p-1 rounded">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900 p-1 rounded">
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

        {/* Thanh Phân trang (Pagination) */}
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
                  setCurrentPage(1); // Reset về trang 1 khi đổi số dòng
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
    </div>
  );
}
