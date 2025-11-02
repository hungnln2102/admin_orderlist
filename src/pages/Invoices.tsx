import React, { useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const invoices = [
  {
    id: "INV-001",
    orderId: "#ORD-001",
    customer: "Nguyễn Văn A",
    email: "nguyenvana@email.com",
    amount: 1250000,
    tax: 125000,
    total: 1375000,
    status: "paid",
    statusText: "Đã thanh toán",
    method: "Chuyển khoản",
    issueDate: "15/12/2024",
    dueDate: "22/12/2024",
    paidDate: "16/12/2024",
  },
  {
    id: "INV-002",
    orderId: "#ORD-002",
    customer: "Trần Thị B",
    email: "tranthib@email.com",
    amount: 850000,
    tax: 85000,
    total: 935000,
    status: "pending",
    statusText: "Chờ thanh toán",
    method: "Tiền mặt",
    issueDate: "15/12/2024",
    dueDate: "22/12/2024",
    paidDate: null,
  },
  {
    id: "INV-003",
    orderId: "#ORD-003",
    customer: "Lê Văn C",
    email: "levanc@email.com",
    amount: 2100000,
    tax: 210000,
    total: 2310000,
    status: "overdue",
    statusText: "Quá hạn",
    method: "Chuyển khoản",
    issueDate: "10/12/2024",
    dueDate: "17/12/2024",
    paidDate: null,
  },
  {
    id: "INV-004",
    orderId: "#ORD-004",
    customer: "Phạm Thị D",
    email: "phamthid@email.com",
    amount: 675000,
    tax: 67500,
    total: 742500,
    status: "paid",
    statusText: "Đã thanh toán",
    method: "Ví điện tử",
    issueDate: "14/12/2024",
    dueDate: "21/12/2024",
    paidDate: "14/12/2024",
  },
  {
    id: "INV-005",
    orderId: "#ORD-005",
    customer: "Hoàng Văn E",
    email: "hoangvane@email.com",
    amount: 1450000,
    tax: 145000,
    total: 1595000,
    status: "partial",
    statusText: "Thanh toán 1 phần",
    method: "Chuyển khoản",
    issueDate: "13/12/2024",
    dueDate: "20/12/2024",
    paidDate: null,
  },
];

const invoiceStats = [
  {
    name: "Tổng hóa đơn",
    value: "2,847",
    icon: CheckCircleIcon,
    color: "bg-blue-500",
  },
  {
    name: "Đã thanh toán",
    value: "₫98M",
    icon: CheckCircleIcon,
    color: "bg-green-500",
  },
  {
    name: "Chờ thanh toán",
    value: "₫12M",
    icon: ClockIcon,
    color: "bg-yellow-500",
  },
  {
    name: "Quá hạn",
    value: "₫2.3M",
    icon: XCircleIcon,
    color: "bg-red-500",
  },
];

import * as Helpers from "../lib/helpers";

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || invoice.status === statusFilter;
    const matchesMethod =
      methodFilter === "all" || invoice.method === methodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "partial":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case "pending":
        return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case "overdue":
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      case "partial":
        return <ClockIcon className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Biên lai thanh toán
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý hóa đơn và theo dõi thanh toán
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            Tạo hóa đơn mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {invoiceStats.map((stat) => (
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm hóa đơn, khách hàng..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="paid">Đã thanh toán</option>
            <option value="pending">Chờ thanh toán</option>
            <option value="overdue">Quá hạn</option>
            <option value="partial">Thanh toán 1 phần</option>
          </select>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">Tất cả phương thức</option>
            <option value="Chuyển khoản">Chuyển khoản</option>
            <option value="Tiền mặt">Tiền mặt</option>
            <option value="Ví điện tử">Ví điện tử</option>
          </select>

          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hóa đơn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Khách hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tổng tiền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phương thức
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hạn thanh toán
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.id}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.orderId}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.customer}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(invoice.status)}
                      <span
                        className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${Helpers.getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.statusText}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">
                      ₫{invoice.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Thuế: ₫{invoice.tax.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.method}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.issueDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {invoice.dueDate}
                    </div>
                    {invoice.paidDate && (
                      <div className="text-xs text-green-600">
                        Đã thanh toán: {invoice.paidDate}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Xem chi tiết"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        className="text-green-600 hover:text-green-900 p-1 rounded"
                        title="In hóa đơn"
                      >
                        <PrinterIcon className="h-4 w-4" />
                      </button>
                      <button
                        className="text-purple-600 hover:text-purple-900 p-1 rounded"
                        title="Tải xuống"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">
              Không tìm thấy hóa đơn
            </div>
            <div className="text-gray-500">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

