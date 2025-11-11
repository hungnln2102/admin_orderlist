import React, { useEffect, useMemo, useState } from "react";
import {
  ShoppingBagIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarDaysIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import GlassPanel from "../components/GlassPanel";
import StatCard, {
  STAT_CARD_ACCENTS,
  type StatAccent,
} from "../components/StatCard";
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
  accent: StatAccent;
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
): Omit<ProcessedStat, "icon" | "accent" | "changeType"> & {
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
          accent: STAT_CARD_ACCENTS.sky,
        },
        {
          name: "Đơn sắp hết hạn",
          value: stats.overdueOrders.count.toLocaleString("vi-VN"),
          change: "Cần xử lý",
          changeType: "alert",
          icon: CalendarDaysIcon,
          accent: STAT_CARD_ACCENTS.rose,
        },
        {
          ...calculateStat(
            "Tổng nhập hàng",
            stats.totalImports.current,
            stats.totalImports.previous,
            true
          ),
          icon: ArchiveBoxIcon,
          accent: STAT_CARD_ACCENTS.amber,
        },
        {
          ...calculateStat(
            "Tổng lợi nhuận",
            stats.totalProfit.current,
            stats.totalProfit.previous,
            true
          ),
          icon: ChartBarIcon,
          accent: STAT_CARD_ACCENTS.emerald,
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
          <StatCard
            key={`${item.name}-${index}`}
            title={item.name}
            value={item.value}
            icon={item.icon}
            accent={item.accent}
          >
            <div
              className={`flex items-center text-sm font-semibold ${
                item.changeType === "increase"
                  ? "text-emerald-600"
                  : item.changeType === "decrease"
                  ? "text-rose-600"
                  : "text-amber-600"
              }`}
            >
              {item.changeType === "alert" ? (
                <span className="uppercase tracking-wide">Alert</span>
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
          </StatCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GlassPanel glow="sky" className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Doanh thu theo tháng (Tổng giá bán)
            </h3>
            <select
              className="rounded-2xl border border-white/60 bg-white/80 px-3 py-1 text-sm text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
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
        </GlassPanel>

        <GlassPanel glow="violet" className="p-6">
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
        </GlassPanel>
      </div>
    </div>
  );
};

export default Dashboard;
