import React, { useEffect, useMemo, useState } from "react";
import {
  ShoppingBagIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarDaysIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
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
import {
  fetchChartData,
  fetchAvailableYears,
  apiFetch,
  type ChartsApiResponse,
  type RevenueData,
  type OrderStatusData,
} from "../lib/api";

interface StatsApiResponse {
  totalOrders: { current: number; previous: number };
  totalImports: { current: number; previous: number };
  totalProfit: { current: number; previous: number };
  overdueOrders: { count: number };
}

interface ProcessedStat {
  name: string;
  value: string;
  change: string;
  changeType: "increase" | "decrease" | "alert";
  icon: React.ElementType;
  color: string;
}

const formatCurrency = (value: number) =>
  `₫${value.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}`;

const toChangeLabel = (diff: number) => {
  if (!Number.isFinite(diff)) return "N/A";
  const prefix = diff >= 0 ? "+" : "-";
  return `${prefix}${Math.abs(diff).toFixed(1)}%`;
};

const calculateStat = (
  name: string,
  current: number,
  previous: number,
  isCurrency: boolean
): Omit<ProcessedStat, "icon" | "color" | "changeType"> & {
  changeType: "increase" | "decrease";
} => {
  const displayValue = isCurrency
    ? formatCurrency(current)
    : current.toLocaleString("vi-VN");

  let diff = 0;
  if (previous !== 0) {
    diff = ((current - previous) / previous) * 100;
  } else if (current > 0) {
    diff = 100;
  }

  return {
    name,
    value: displayValue,
    change: toChangeLabel(diff),
    changeType: diff >= 0 ? "increase" : "decrease",
  };
};

const Dashboard: React.FC = () => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [statsData, setStatsData] = useState<ProcessedStat[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<RevenueData[]>([]);
  const [orderChartData, setOrderChartData] = useState<OrderStatusData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboardData = async (year: number) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const statsResponse = await apiFetch("/api/dashboard/stats");
      if (!statsResponse.ok) {
        throw new Error("Không thể tải thống kê tổng quan.");
      }
      const stats: StatsApiResponse = await statsResponse.json();

      const formattedStats: ProcessedStat[] = [
        {
          ...calculateStat(
            "Tổng đơn hàng",
            stats.totalOrders.current,
            stats.totalOrders.previous,
            false
          ),
          icon: ShoppingBagIcon,
          color: "bg-blue-500",
        },
        {
          name: "Đơn sắp hết hạn",
          value: stats.overdueOrders.count.toLocaleString("vi-VN"),
          change: "Cần xử lý",
          changeType: "alert",
          icon: CalendarDaysIcon,
          color: "bg-red-500",
        },
        {
          ...calculateStat(
            "Tổng nhập hàng",
            stats.totalImports.current,
            stats.totalImports.previous,
            true
          ),
          icon: ArchiveBoxIcon,
          color: "bg-orange-500",
        },
        {
          ...calculateStat(
            "Tổng lợi nhuận",
            stats.totalProfit.current,
            stats.totalProfit.previous,
            true
          ),
          icon: ChartBarIcon,
          color: "bg-green-500",
        },
      ];
      setStatsData(formattedStats);

      const charts: ChartsApiResponse = await fetchChartData(year);
      setRevenueChartData(charts.revenueData);
      setOrderChartData(charts.orderStatusData);
    } catch (err) {
      console.error("Loi khi lay du lieu dashboard:", err);
      setErrorMessage(
        "Đã có lỗi khi tải dữ liệu dashboard. Vui lòng thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadYears = async () => {
      try {
        const years = await fetchAvailableYears();
        if (years.length > 0) {
          setAvailableYears(years);
          setSelectedYear((prev) => (years.includes(prev) ? prev : years[0]));
        } else {
          setAvailableYears([currentYear]);
          setSelectedYear(currentYear);
        }
      } catch (err) {
        console.error("Lỗi khi lấy danh sách năm Dashboard:", err);
        setAvailableYears([currentYear]);
        setSelectedYear(currentYear);
      }
    };

    loadYears();
  }, [currentYear]);

  useEffect(() => {
    fetchDashboardData(selectedYear);
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="py-10 text-center">
        <p className="text-lg font-medium text-gray-700">
          Đang tải dữ liệu dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white sm:p-8">
        <h1 className="text-3xl font-bold">Bảng điều khiển</h1>
        <p className="text-sm text-blue-100">
          Tổng quan hoạt động kinh doanh của bạn
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsData.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${item.color}`}
              >
                <item.icon className="h-6 w-6 text-white" />
              </div>
              <div
                className={`flex items-center text-sm font-medium ${
                  item.changeType === "increase"
                    ? "text-green-600"
                    : item.changeType === "decrease"
                    ? "text-red-600"
                    : "text-orange-600"
                }`}
              >
                {item.changeType === "alert" ? (
                  <span className="font-semibold uppercase">Alert</span>
                ) : item.changeType === "increase" ? (
                  <>
                    <ArrowUpIcon className="mr-1 h-4 w-4" />
                    {item.change}
                  </>
                ) : (
                  <>
                    <ArrowDownIcon className="mr-1 h-4 w-4" />
                    {item.change}
                  </>
                )}
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600">{item.name}</h3>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Doanh thu theo tháng (Tổng giá bán)
            </h3>
            <select
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            >
              {availableYears.length === 0 ? (
                <option value={selectedYear}>{selectedYear}</option>
              ) : (
                availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) =>
                    `${Math.round((value as number) / 1_000_000)}M`
                  }
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Doanh thu",
                  ]}
                  labelStyle={{ color: "#111827" }}
                />
                <Line
                  type="monotone"
                  dataKey="total_sales"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#3b82f6" }}
                  activeDot={{ r: 6, stroke: "#2563eb", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-semibold text-gray-900">
            Tổng đơn hàng và đơn hủy theo tháng
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  formatter={(value: number, _name: string, props: any) => [
                    value,
                    props?.dataKey === "total_orders" ? "Tổng đơn" : "Đơn hủy",
                  ]}
                  labelStyle={{ color: "#111827" }}
                />
                <Bar
                  dataKey="total_orders"
                  name="Tổng đơn"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="total_canceled"
                  name="Đơn hủy"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
