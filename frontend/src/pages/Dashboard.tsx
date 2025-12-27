import React, { useEffect, useMemo, useState } from "react";
import {
  ShoppingBagIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarDaysIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BellAlertIcon,
  CheckBadgeIcon,
  EllipsisHorizontalIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import StatCard, { STAT_CARD_ACCENTS, type StatAccent } from "../components/ui/StatCard";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import {
  fetchChartData,
  fetchAvailableYears,
  apiFetch,
  type ChartsApiResponse,
  type RevenueData,
  type OrderStatusData,
} from "../lib/api";
import * as Helpers from "../lib/helpers";
import { normalizeErrorMessage } from "../lib/textUtils";

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

const formatCurrency = Helpers.formatCurrency;

const toChangeLabel = (diff: number) => {
  if (!Number.isFinite(diff)) return "N/A";
  const prefix = diff >= 0 ? "+" : "-";
  return `${prefix}${Math.abs(diff).toFixed(1)}%`;
};

const percentChange = (current: number, previous: number): number => {
  if (previous !== 0) {
    return ((current - previous) / previous) * 100;
  }
  return current > 0 ? 100 : 0;
};

const calculateStat = (
  name: string,
  current: number | string,
  previous: number | string,
  isCurrency: boolean
): Omit<ProcessedStat, "icon" | "accent" | "changeType"> & {
  changeType: "increase" | "decrease";
} => {
  const currentValue = Number.isFinite(Number(current))
    ? Number(current)
    : 0;
  const previousValue = Number.isFinite(Number(previous))
    ? Number(previous)
    : 0;

  const displayValue = isCurrency
    ? formatCurrency(currentValue)
    : currentValue.toLocaleString("vi-VN");

  const diff = percentChange(currentValue, previousValue);

  return {
    name,
    value: displayValue,
    change: toChangeLabel(diff),
    changeType: diff >= 0 ? "increase" : "decrease",
  };
};

// ------- Extra finance/budget data (static demo) -------
const financeSummary = [
  {
    title: "Tổng chi tiêu",
    value: "89,935",
    delta: "+1.01% tháng này",
    trend: "up" as const,
    accent: "amber" as const,
    icon: ArrowTrendingUpIcon,
  },
  {
    title: "Tổng thu nhập",
    value: "23,283.5",
    delta: "+0.49% tháng này",
    trend: "up" as const,
    accent: "emerald" as const,
    icon: ArrowTrendingUpIcon,
  },
];

const expenseBreakdown = [
  { name: "Nhà cửa & Tiện ích", value: 8_000_000, color: "#F8C573" },
  { name: "Thực phẩm", value: 5_120_000, color: "#9BE7C4" },
  { name: "Chăm sóc cá nhân", value: 5_380_000, color: "#7CB3FF" },
  { name: "Phụ kiện", value: 4_120_000, color: "#F48FB1" },
  { name: "Dịch vụ khác", value: 3_030_000, color: "#C7D2FE" },
];

const budgets = [
  { name: "Nhà cửa & Tiện ích", used: 3_150_000, total: 4_500_000 },
  { name: "Thực phẩm & Thiết yếu", used: 2_260_000, total: 4_500_000 },
  { name: "Chăm sóc cá nhân", used: 1_890_000, total: 4_500_000 },
  { name: "Phụ kiện", used: 1_520_000, total: 4_500_000 },
];

const savingGoals = [
  {
    name: "Laptop mới",
    progress: 50,
    saved: 3_375_000,
    target: 6_750_000,
    accent: "#f8c573",
  },
  {
    name: "Du lịch",
    progress: 70,
    saved: 4_740_000,
    target: 6_750_000,
    accent: "#9be7c4",
  },
];

const fundRows = [
  { time: "01/12/2025", momo: 1_500_000, bank: 3_250_000, supper: 2_200_000, gold: 1_800_000 },
  { time: "05/12/2025", momo: 900_000, bank: 2_000_000, supper: 1_600_000, gold: 1_450_000 },
  { time: "10/12/2025", momo: 1_250_000, bank: 2_800_000, supper: 2_100_000, gold: 1_700_000 },
  { time: "14/12/2025", momo: 1_100_000, bank: 2_600_000, supper: 1_850_000, gold: 1_500_000 },
];

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

const FinanceSummaryCard: React.FC<{
  title: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  accent: "amber" | "emerald";
  icon: React.ElementType;
}> = ({ title, value, delta, trend, accent, icon: Icon }) => {
  const accentStyle =
    accent === "amber"
      ? { iconBg: "bg-amber-100 text-amber-600", chip: "bg-amber-50 text-amber-700" }
      : { iconBg: "bg-emerald-100 text-emerald-600", chip: "bg-emerald-50 text-emerald-700" };
  const TrendIcon = trend === "up" ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <div className="stats-card p-5 flex items-center justify-between gap-4 bg-white/70 border border-white/40 shadow-lg">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
          {title}
        </p>
        <p className="text-3xl font-bold text-white">{value}</p>
        <div
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${accentStyle.chip}`}
        >
          <TrendIcon className="h-4 w-4" />
          <span>{delta}</span>
        </div>
      </div>
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${accentStyle.iconBg}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
};

const BudgetRow: React.FC<{ name: string; used: number; total: number }> = ({
  name,
  used,
  total,
}) => {
  const percent = Math.min(100, Math.round((used / total) * 100));
  const remaining = total - used;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm font-semibold text-white">
        <span>{name}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-white/70">
        Còn lại {currencyFormatter.format(remaining)} / {currencyFormatter.format(total)}
      </p>
    </div>
  );
};

const GoalRing: React.FC<{ progress: number; color: string }> = ({ progress, color }) => (
  <div className="relative h-14 w-14">
    <div
      className="absolute inset-0 rounded-full"
      style={{
        background: `conic-gradient(${color} ${progress}%, #e2e8f0 ${progress}%)`,
      }}
    />
    <div className="absolute inset-[6px] rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-xs font-semibold text-white shadow-inner shadow-black/30">
      {Math.round(progress)}%
    </div>
  </div>
);

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
        const message = await statsResponse.text();
        throw new Error(
          normalizeErrorMessage(message, {
            fallback: "Không thể tải thống kê tổng quan.",
          })
        );
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

      // Fallback: derive change for total orders from the last two months of chart data.
      const orderPoints = charts.orderStatusData.filter((p) =>
        Number.isFinite(Number(p.total_orders))
      );
      if (orderPoints.length >= 2) {
        const currentOrders =
          Number(orderPoints[orderPoints.length - 1].total_orders) || 0;
        const previousOrders =
          Number(orderPoints[orderPoints.length - 2].total_orders) || 0;
        const fallbackDiff = percentChange(currentOrders, previousOrders);

        setStatsData((prev) =>
          prev.map((item, idx) =>
            idx === 0
              ? {
                  ...item,
                  change: toChangeLabel(fallbackDiff),
                  changeType:
                    fallbackDiff >= 0 ? "increase" : ("decrease" as const),
                }
              : item
          )
        );
      }
    } catch (err) {
      console.error("Lỗi khi lấy dữ liệu dashboard:", err);
      setErrorMessage(
        err instanceof Error
          ? normalizeErrorMessage(err.message, {
              fallback:
                "Đã có lỗi khi tải dữ liệu dashboard. Vui lòng thử lại sau.",
            })
          : "Đã có lỗi khi tải dữ liệu dashboard. Vui lòng thử lại sau."
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

  const totalExpense = useMemo(
    () => expenseBreakdown.reduce((sum, item) => sum + item.value, 0),
    []
  );

  if (loading) {
    return (
      <div className="py-10 text-center">
        <p className="text-lg font-medium text-white/80">
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

      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-6 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
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
                    ? "text-emerald-200"
                    : item.changeType === "decrease"
                    ? "text-rose-200"
                    : "text-amber-200"
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
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="relative rounded-3xl border border-white/20 bg-gradient-to-br from-indigo-200/40 via-indigo-300/35 to-slate-200/40 p-6 shadow-[0_20px_55px_-28px_rgba(0,0,0,0.65),0_14px_36px_-24px_rgba(255,255,255,0.2)] backdrop-blur">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Doanh thu theo tháng (Tổng giá bán)
            </h3>
            <select
              className="rounded-2xl border border-white/60 bg-white/80 px-3 py-1 text-sm text-white/80 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
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

          <div className="w-full">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e166" />
                <XAxis
                  dataKey="month"
                  stroke="#e5e7eb"
                  tick={{ fill: "#e5e7eb", fontSize: 12 }}
                />
                <YAxis
                  stroke="#e5e7eb"
                  tick={{ fill: "#e5e7eb", fontSize: 12 }}
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

        <div className="relative rounded-3xl border border-white/20 bg-gradient-to-br from-indigo-200/40 via-indigo-300/35 to-slate-200/40 p-6 shadow-[0_20px_55px_-28px_rgba(0,0,0,0.65),0_14px_36px_-24px_rgba(255,255,255,0.2)] backdrop-blur">
          <h3 className="mb-6 text-lg font-semibold text-white">
            Tổng đơn hàng và đơn hủy theo tháng
          </h3>

          <div className="w-full">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={orderChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e166" />
                <XAxis
                  dataKey="month"
                  stroke="#e5e7eb"
                  tick={{ fill: "#e5e7eb", fontSize: 12 }}
                />
                <YAxis
                  stroke="#e5e7eb"
                  tick={{ fill: "#e5e7eb", fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number, _name: string, props?: Payload<number, string>) => [
                    value,
                    props?.dataKey === "total_orders"
                      ? "Tổng đơn"
                      : "Đơn hủy",
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

      {/* Finance & Budget section (merged) */}
      <div className="space-y-6 rounded-[32px] bg-white/5 border border-white/10 p-6 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.7)] backdrop-blur">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Chi tiêu & Ngân sách</h2>
            <p className="text-sm text-white/70">Tổng quan tài chính cá nhân (demo)</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {financeSummary.map((item) => (
              <FinanceSummaryCard key={item.title} {...item} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="rounded-3xl bg-white/70 p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Chi tiêu hàng tháng</p>
                <p className="text-xs text-white/70">Tổng quan tháng hiện tại</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-semibold text-white shadow-inner shadow-indigo-900/30">
                <RocketLaunchIcon className="h-4 w-4" />
                <span>Đang theo dõi</span>
              </div>
            </div>

            <div className="grid items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div className="relative h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="60%"
                      outerRadius="85%"
                      paddingAngle={4}
                      cornerRadius={12}
                      stroke="none"
                    >
                      {expenseBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => currencyFormatter.format(value)}
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        color: "#0f172a",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {currencyFormatter.format(totalExpense)}
                    </p>
                    <p className="text-sm text-white/70">Tổng</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/80 p-3 shadow-inner">
                <div className="grid grid-cols-12 text-xs font-semibold text-white/75">
                  <span className="col-span-6">Nhóm</span>
                  <span className="col-span-4 text-right">Giá trị</span>
                  <span className="col-span-2 text-right">%</span>
                </div>
                {expenseBreakdown.map((item) => {
                  const percent = (item.value / totalExpense) * 100;
                  return (
                    <div
                      key={item.name}
                      className="grid grid-cols-12 items-center rounded-xl px-3 py-2 transition-colors hover:bg-white/60"
                    >
                      <div className="col-span-6 flex items-center gap-2 text-sm font-semibold text-white">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </div>
                      <div className="col-span-4 text-right text-sm font-semibold text-white">
                        {currencyFormatter.format(item.value)}
                      </div>
                      <div className="col-span-2 text-right text-xs text-white/75">
                        {percentFormatter.format(percent)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/70 p-4 shadow-inner space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Dòng tiền</p>
                <span className="text-xs text-white/70">Tổng hợp theo nguồn</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/40 text-white/80 text-xs uppercase tracking-[0.08em]">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Thời gian</th>
                      <th className="px-3 py-2 text-right font-semibold">Momo</th>
                      <th className="px-3 py-2 text-right font-semibold">Ngân hàng</th>
                      <th className="px-3 py-2 text-right font-semibold">Supper sinh lời</th>
                      <th className="px-3 py-2 text-right font-semibold">Vàng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/40 text-white">
                    {fundRows.map((row, idx) => (
                      <tr key={`${row.time}-${idx}`} className="hover:bg-white/50 transition-colors">
                        <td className="px-3 py-2 font-semibold">{row.time}</td>
                        <td className="px-3 py-2 text-right text-white/90">
                          {currencyFormatter.format(row.momo)}
                        </td>
                        <td className="px-3 py-2 text-right text-white/90">
                          {currencyFormatter.format(row.bank)}
                        </td>
                        <td className="px-3 py-2 text-right text-white/90">
                          {currencyFormatter.format(row.supper)}
                        </td>
                        <td className="px-3 py-2 text-right text-white/90">
                          {currencyFormatter.format(row.gold)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="stats-card bg-white/80 p-4 flex items-start gap-3 shadow-xl">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border border-amber-100">
                <BellAlertIcon className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Chi tiêu thực phẩm tăng 20% trong tháng này
                </p>
                <p className="text-xs text-amber-700">
                  Xem lại hạn mức để tránh vượt ngân sách.
                </p>
              </div>
            </div>

            <div className="stats-card bg-white/80 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Ngân sách</p>
                <EllipsisHorizontalIcon className="h-5 w-5 text-white/70" />
              </div>
              <div className="space-y-3">
                {budgets.map((budget) => (
                  <BudgetRow key={budget.name} {...budget} />
                ))}
              </div>
              <button
                type="button"
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.45)] hover:bg-slate-800 transition-colors"
              >
                Tạo ngân sách
              </button>
            </div>

            <div className="stats-card bg-white/80 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Mục tiêu tiết kiệm</p>
                <CheckBadgeIcon className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="space-y-3">
                {savingGoals.map((goal) => (
                  <div
                    key={goal.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/40 bg-white/60 px-3 py-2 shadow-[0_12px_32px_-26px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex items-center gap-3">
                      <GoalRing progress={goal.progress} color={goal.accent} />
                      <div>
                        <p className="text-sm font-semibold text-white">{goal.name}</p>
                        <p className="text-xs text-white/75">
                          {currencyFormatter.format(goal.saved)} / {currencyFormatter.format(goal.target)}
                        </p>
                      </div>
                    </div>
                    <RocketLaunchIcon className="h-5 w-5 text-white/70" />
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="w-full rounded-xl bg-slate-900/80 py-3 text-sm font-semibold text-white border border-white/30 hover:bg-slate-900 transition-colors shadow-[0_12px_30px_-24px_rgba(0,0,0,0.45)]"
              >
                Đặt mục tiêu mới
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;




