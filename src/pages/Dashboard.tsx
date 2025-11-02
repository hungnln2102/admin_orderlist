import React, { useState, useEffect } from "react";
import {
  ShoppingBagIcon,
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

// Định nghĩa kiểu dữ liệu cho dữ liệu thống kê nhận được từ API
interface StatsApiResponse {
  totalOrders: { current: number; previous: number };
  totalImports: { current: number; previous: number };
  totalProfit: { current: number; previous: number };
  overdueOrders: { count: number };
}

// Định nghĩa kiểu dữ liệu cho dữ liệu thống kê đã xử lý
interface ProcessedStat {
  name: string;
  value: string;
  change: string;
  changeType: "increase" | "decrease" | "alert";
  icon: React.ElementType;
  color: string;
}

/**
 * Hàm tính toán giá trị và tỷ lệ thay đổi cho mục thống kê
 * dựa trên dữ liệu hiện tại và dữ liệu chu kỳ trước.
 */
const calculateStat = (
  name: string,
  current: number,
  previous: number,
  isCurrency: boolean
): Omit<ProcessedStat, "icon" | "color" | "changeType"> & {
  changeType: "increase" | "decrease";
} => {
  const value = isCurrency
    ? current.toLocaleString("vi-VN")
    : current.toLocaleString();
  let change = 0;
  if (previous !== 0) {
    change = ((current - previous) / previous) * 100;
  } else if (current > 0) {
    change = 100; // Tăng 100% nếu tháng trước bằng 0
  }

  const changeType: "increase" | "decrease" =
    change >= 0 ? "increase" : "decrease";
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

// Dữ liệu biểu đồ vẫn giữ nguyên (MOCK DATA)
const revenueData = [
  { month: "T1", revenue: 45000000 },
  { month: "T2", revenue: 50000000 },
  { month: "T3", revenue: 62000000 },
  { month: "T4", revenue: 55000000 },
  { month: "T5", revenue: 70000000 },
  { month: "T6", revenue: 68000000 },
  { month: "T7", revenue: 75000000 },
  { month: "T8", revenue: 80000000 },
  { month: "T9", revenue: 90000000 },
  { month: "T10", revenue: 85000000 },
  { month: "T11", revenue: 92000000 },
  { month: "T12", revenue: 98000000 },
];

const orderStatusData = [
  { status: "Chờ xử lý", count: 45 },
  { status: "Đang xử lý", count: 120 },
  { status: "Đang giao", count: 75 },
  { status: "Hoàn thành", count: 450 },
  { status: "Đã hủy", count: 8 },
];

export default function Dashboard() {
  const [statsData, setStatsData] = useState<ProcessedStat[]>([]);
  const [loading, setLoading] = useState(true);

  const API_BASE =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
    (process.env.VITE_API_BASE_URL as string) ||
    "http://localhost:3001";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/dashboard/stats`
        );
        if (!response.ok) {
          throw new Error("Lỗi khi tải dữ liệu thống kê từ API.");
        }
        const data: StatsApiResponse = await response.json();

        // Xử lý dữ liệu và định dạng lại
        const newStats: ProcessedStat[] = [
          {
            ...calculateStat(
              "Tổng đơn hàng",
              data.totalOrders.current,
              data.totalOrders.previous,
              false
            ),
            icon: ShoppingBagIcon,
            color: "bg-blue-500",
          },
          {
            name: "Đơn Đến Hạn",
            value: data.overdueOrders.count.toLocaleString(),
            change: "Cần xử lý",
            changeType: "alert",
            icon: CalendarDaysIcon,
            color: "bg-red-500",
          },
          {
            ...calculateStat(
              "Tổng Nhập Hàng",
              data.totalImports.current,
              data.totalImports.previous,
              true
            ),
            icon: ArchiveBoxIcon,
            color: "bg-orange-500",
          },
          {
            ...calculateStat(
              "Tổng Lợi Nhuận",
              data.totalProfit.current,
              data.totalProfit.previous,
              true
            ),
            icon: ChartBarIcon,
            color: "bg-green-500",
          },
        ];

        setStatsData(newStats);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu dashboard:", error);
        // Có thể thêm logic hiển thị lỗi cho người dùng ở đây
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []); // Chỉ chạy một lần khi component mount

  if (loading) {
    return (
      <div className="text-center py-10">
        <p className="text-lg font-medium text-gray-700">Đang tải dữ liệu...</p>
      </div>
    );
  }

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
