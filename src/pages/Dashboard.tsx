import React from "react";
import {
  ShoppingBagIcon,
  CurrencyDollarIcon,
  TruckIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const statsData = [
  {
    name: "Tổng đơn hàng",
    value: "2,847",
    change: "+12.5%",
    changeType: "increase",
    icon: ShoppingBagIcon,
    color: "bg-blue-500",
  },
  {
    name: "Doanh thu tháng",
    value: "₫98,000,000",
    change: "+8.2%",
    changeType: "increase",
    icon: CurrencyDollarIcon,
    color: "bg-green-500",
  },
  {
    name: "Đang vận chuyển",
    value: "232",
    change: "-2.4%",
    changeType: "decrease",
    icon: TruckIcon,
    color: "bg-orange-500",
  },
  {
    name: "Hoàn thành",
    value: "2,654",
    change: "+15.3%",
    changeType: "increase",
    icon: CheckCircleIcon,
    color: "bg-purple-500",
  },
];

const revenueData = [
  { month: "T1", revenue: 45000000 },
  { month: "T2", revenue: 52000000 },
  { month: "T3", revenue: 48000000 },
  { month: "T4", revenue: 61000000 },
  { month: "T5", revenue: 55000000 },
  { month: "T6", revenue: 67000000 },
  { month: "T7", revenue: 72000000 },
  { month: "T8", revenue: 69000000 },
  { month: "T9", revenue: 76000000 },
  { month: "T10", revenue: 82000000 },
  { month: "T11", revenue: 89000000 },
  { month: "T12", revenue: 98000000 },
];

const orderStatusData = [
  { status: "Chờ xử lý", count: 45 },
  { status: "Đang giao", count: 32 },
  { status: "Hoàn thành", count: 128 },
  { status: "Đã hủy", count: 8 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
          Bảng điều khiển
        </h1>
        <p className="text-blue-100 text-sm sm:text-base">
          Tổng quan về hoạt động kinh doanh của bạn
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statsData.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div
                className={`flex items-center text-sm font-medium ${
                  stat.changeType === "increase"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {stat.changeType === "increase" ? (
                  <ArrowUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 mr-1" />
                )}
                {stat.change}
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">
              {stat.name}
            </h3>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Doanh thu theo tháng
            </h3>
            <select className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>2024</option>
              <option>2023</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <Tooltip
                  formatter={(value) => [
                    `₫${(value as number).toLocaleString()}`,
                    "Doanh thu",
                  ]}
                  labelStyle={{ color: "#374151" }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Trạng thái đơn hàng
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="status" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  formatter={(value) => [value, "Số đơn"]}
                  labelStyle={{ color: "#374151" }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Hoạt động gần đây
        </h3>
        <div className="space-y-4">
          {[
            {
              action: "Đơn hàng mới",
              details: "#DH-2024-001 - Nguyễn Văn A",
              time: "2 phút trước",
              status: "new",
            },
            {
              action: "Thanh toán",
              details: "Đơn hàng #DH-2024-002 đã thanh toán",
              time: "15 phút trước",
              status: "success",
            },
            {
              action: "Cập nhật kho",
              details: "Sản phẩm SP001 đã nhập thêm 50 cái",
              time: "1 giờ trước",
              status: "info",
            },
            {
              action: "Giao hàng",
              details: "Đơn hàng #DH-2024-003 đang giao",
              time: "2 giờ trước",
              status: "warning",
            },
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    activity.status === "new"
                      ? "bg-blue-500"
                      : activity.status === "success"
                      ? "bg-green-500"
                      : activity.status === "info"
                      ? "bg-purple-500"
                      : "bg-orange-500"
                  }`}
                ></div>
                <div>
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.details}</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
