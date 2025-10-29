import React, { useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

const sources = [
  {
    id: "SUP-001",
    name: "Apple Store Vietnam",
    category: "Điện tử",
    contact: "Nguyễn Văn A",
    phone: "024-3825-6789",
    email: "contact@apple.vn",
    address: "Hà Nội, Việt Nam",
    rating: 5,
    totalOrders: 245,
    totalValue: 15600000000,
    status: "active",
    lastOrder: "15/12/2024",
  },
  {
    id: "SUP-002",
    name: "Samsung Vietnam",
    category: "Điện tử",
    contact: "Trần Thị B",
    phone: "028-3827-4567",
    email: "business@samsung.vn",
    address: "TP.HCM, Việt Nam",
    rating: 4.8,
    totalOrders: 189,
    totalValue: 12400000000,
    status: "active",
    lastOrder: "14/12/2024",
  },
  {
    id: "SUP-003",
    name: "Dell Technologies",
    category: "Máy tính",
    contact: "Lê Văn C",
    phone: "024-3654-7890",
    email: "sales@dell.vn",
    address: "Hà Nội, Việt Nam",
    rating: 4.5,
    totalOrders: 156,
    totalValue: 8900000000,
    status: "active",
    lastOrder: "13/12/2024",
  },
  {
    id: "SUP-004",
    name: "Phụ kiện Tech Store",
    category: "Phụ kiện",
    contact: "Phạm Thị D",
    phone: "0236-3789-1234",
    email: "info@techstore.vn",
    address: "Đà Nẵng, Việt Nam",
    rating: 4.2,
    totalOrders: 89,
    totalValue: 2100000000,
    status: "active",
    lastOrder: "12/12/2024",
  },
  {
    id: "SUP-005",
    name: "Global Electronics",
    category: "Điện tử",
    contact: "Hoàng Văn E",
    phone: "0292-3456-7891",
    email: "contact@globalelec.vn",
    address: "Cần Thơ, Việt Nam",
    rating: 3.8,
    totalOrders: 45,
    totalValue: 1200000000,
    status: "inactive",
    lastOrder: "28/11/2024",
  },
];

const supplierStats = [
  { name: "Tổng nhà cung cấp", value: "24", color: "bg-blue-500" },
  { name: "Đang hoạt động", value: "19", color: "bg-green-500" },
  { name: "Đơn hàng tháng này", value: "156", color: "bg-purple-500" },
  { name: "Giá trị nhập hàng", value: "₫2.4B", color: "bg-orange-500" },
];

export default function Sources() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSources = sources.filter((source) => {
    const matchesSearch =
      source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      source.contact.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || source.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" || source.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? "text-yellow-400 fill-current"
            : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bảng thông tin nguồn
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý thông tin nhà cung cấp và đối tác
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            Thêm nhà cung cấp
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {supplierStats.map((stat, index) => (
          <div key={stat.name} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3`}>
                <div className="text-white text-xl font-bold">{index + 1}</div>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nhà cung cấp..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Tất cả danh mục</option>
            <option value="Điện tử">Điện tử</option>
            <option value="Máy tính">Máy tính</option>
            <option value="Phụ kiện">Phụ kiện</option>
          </select>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>

          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Xuất danh sách
          </button>
        </div>
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nhà cung cấp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liên hệ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đánh giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thống kê
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đơn hàng cuối
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSources.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {source.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {source.category}
                      </div>
                      <div className="text-xs text-gray-400">{source.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {source.phone}
                      </div>
                      <div className="flex items-center text-sm text-gray-900">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {source.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {source.address}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex">{renderStars(source.rating)}</div>
                      <span className="ml-2 text-sm text-gray-600">
                        {source.rating}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>{source.totalOrders} đơn hàng</div>
                      <div className="text-xs text-gray-500">
                        ₫{(source.totalValue / 1000000000).toFixed(1)}B
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        source.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {source.status === "active" ? "Hoạt động" : "Ngừng"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {source.lastOrder}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      Xem
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      Liên hệ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
