import React from "react";
import {
  ShoppingBagIcon,
  CurrencyDollarIcon,
  TruckIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarDaysIcon, // Icon mới cho Đơn Đến Hạn
  ArchiveBoxIcon, // Icon mới cho Nhập Hàng
  ChartBarIcon, // Icon mới cho Tổng Lợi Nhuận
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

// --- MÔ PHỎNG LOGIC TÍNH TOÁN DỮ LIỆU THỐNG KÊ ---
// Trong một ứng dụng thực tế, hàm này sẽ gọi API để lấy dữ liệu.
// Tôi đang giả định ngày hiện tại là ngày 15/10 để mô phỏng logic tính toán so sánh chu kỳ.

interface StatData {
  name: string;
  current: number;
  previous: number;
  isCurrency: boolean;
  unit?: string;
}

/**
 * Hàm mô phỏng tính toán giá trị và tỷ lệ thay đổi cho mục thống kê
 * dựa trên dữ liệu hiện tại và dữ liệu chu kỳ trước.
 */
const calculateStat = ({
  name,
  current,
  previous,
  isCurrency = false,
  unit = "",
}: StatData) => {
  const value = isCurrency
    ? current.toLocaleString("vi-VN") + unit
    : current.toLocaleString();
  let change = 0;
  if (previous !== 0) {
    change = ((current - previous) / previous) * 100;
  } else if (current > 0) {
    change = 100; // Tăng 100% nếu tháng trước bằng 0
  }

  const changeType = change >= 0 ? "increase" : "decrease";
  const changeValue = `${change >= 0 ? "+" : ""}${Math.abs(change).toFixed(
    1
  )}%`;

  return {
    name,
    value: isCurrency ? `₫${value}` : value,
    change: changeValue,
    changeType,
  };
};

// --- DỮ LIỆU MẪU ĐƯỢC MÔ PHỎNG VỚI LOGIC MỚI ---
// Giả định dữ liệu thực tế cho chu kỳ 1/10 - 15/10 so với 1/9 - 15/9

const totalOrdersData = calculateStat({
  name: "Tổng đơn hàng",
  current: 1547, // Tổng đơn hàng 1/10 - 15/10
  previous: 1350, // Tổng đơn hàng 1/9 - 15/9
  isCurrency: false,
});

const overdueOrdersData = {
  // Đơn Đến Hạn: tổng hợp lại các đơn đang Cần Gia Hạn (con_lai <=4). Không có so sánh chu kỳ tháng trước.
  name: "Đơn Đến Hạn",
  value: "45", // Giá trị cố định mô phỏng
  change: "Cần xử lý", // Thay đổi thông báo trạng thái thay vì %
  changeType: "alert", // Loại thay đổi mới để áp dụng màu sắc cảnh báo
};

const totalImportsData = calculateStat({
  name: "Tổng Nhập Hàng",
  current: 65000000, // Tổng tiền giá nhập 1/10 - 15/10
  previous: 58000000, // Tổng tiền giá nhập 1/9 - 15/9
  isCurrency: true,
  unit: "", // Đơn vị tiền tệ sẽ được thêm vào trong hàm calculateStat
});

const totalProfitData = calculateStat({
  name: "Tổng Lợi Nhuận",
  current: 25000000, // Tổng (giá bán - giá nhập) 1/10 - 15/10
  previous: 21000000, // Tổng (giá bán - giá nhập) 1/9 - 15/9
  isCurrency: true,
  unit: "",
});

const statsData = [
  {
    ...totalOrdersData,
    icon: ShoppingBagIcon,
    color: "bg-blue-500",
  },
  {
    ...overdueOrdersData,
    icon: CalendarDaysIcon, // Icon mới
    color: "bg-red-500", // Màu mới cho cảnh báo
  },
  {
    ...totalImportsData,
    icon: ArchiveBoxIcon, // Icon mới
    color: "bg-orange-500",
  },
  {
    ...totalProfitData,
    icon: ChartBarIcon, // Icon mới
    color: "bg-green-500", // Thay đổi màu sắc phù hợp hơn với lợi nhuận
  },
];

// Dữ liệu biểu đồ vẫn giữ nguyên
const revenueData = [
  { month: "T1", revenue: 45000000 },
  // ... (Dữ liệu khác giữ nguyên)
  { month: "T12", revenue: 98000000 },
];

const orderStatusData = [
  { status: "Chờ xử lý", count: 45 },
  // ... (Dữ liệu khác giữ nguyên)
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
                // Cập nhật logic màu sắc cho mục "Đơn Đến Hạn" (alert)
                className={`flex items-center text-sm font-medium ${
                  stat.changeType === "increase"
                    ? "text-green-600"
                    : stat.changeType === "decrease"
                    ? "text-red-600"
                    : "text-red-600 font-bold" // Màu cho trạng thái alert
                }`}
              >
                {/* Ẩn icon Tăng/Giảm cho mục "Đơn Đến Hạn" */}
                {stat.changeType !== "alert" &&
                  (stat.changeType === "increase" ? (
                    <ArrowUpIcon className="w-4 h-4 mr-1" />
                  ) : (
                    <ArrowDownIcon className="w-4 h-4 mr-1" />
                  ))}
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
