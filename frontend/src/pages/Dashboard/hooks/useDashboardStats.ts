import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArchiveBoxIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import {
  apiFetch,
  fetchAvailableYears,
  fetchChartData,
  type ChartsApiResponse,
  type OrderStatusData,
  type RevenueData,
} from "../../../lib/api";
import * as Helpers from "../../../lib/helpers";
import { normalizeErrorMessage } from "../../../lib/textUtils";
import { type OverviewStat } from "../components/OverviewStats";

interface StatsApiResponse {
  totalOrders: { current: number; previous: number };
  totalImports: { current: number; previous: number };
  totalProfit: { current: number; previous: number };
  overdueOrders: { count: number };
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
): Omit<OverviewStat, "icon" | "accent"> & { accent: keyof typeof STAT_CARD_ACCENTS } => {
  const currentValue = Number.isFinite(Number(current)) ? Number(current) : 0;
  const previousValue = Number.isFinite(Number(previous)) ? Number(previous) : 0;

  const displayValue = isCurrency ? formatCurrency(currentValue) : currentValue.toLocaleString("vi-VN");

  const diff = percentChange(currentValue, previousValue);

  return {
    name,
    value: displayValue,
    change: toChangeLabel(diff),
    changeType: diff >= 0 ? "increase" : "decrease",
    accent: "sky",
  };
};

const buildStats = (stats: StatsApiResponse): OverviewStat[] => [
  {
    ...calculateStat("Tổng đơn hàng", stats.totalOrders.current, stats.totalOrders.previous, false),
    icon: ShoppingBagIcon,
    accent: "sky",
  },
  {
    name: "Đơn sắp hết hạn",
    value: stats.overdueOrders.count.toLocaleString("vi-VN"),
    change: "Cần xử lý",
    changeType: "alert",
    icon: CalendarDaysIcon,
    accent: "rose",
  },
  {
    ...calculateStat("Tổng nhập hàng", stats.totalImports.current, stats.totalImports.previous, true),
    icon: ArchiveBoxIcon,
    accent: "amber",
  },
  {
    ...calculateStat("Tổng lợi nhuận", stats.totalProfit.current, stats.totalProfit.previous, true),
    icon: ChartBarIcon,
    accent: "emerald",
  },
];

export const useDashboardStats = () => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []); // 1-based

  const [statsData, setStatsData] = useState<OverviewStat[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<RevenueData[]>([]);
  const [orderChartData, setOrderChartData] = useState<OrderStatusData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboardData = useCallback(
    async (year: number) => {
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
        setStatsData(buildStats(stats));

        const charts: ChartsApiResponse = await fetchChartData(year);
        setRevenueChartData(charts.revenueData);
        setOrderChartData(charts.orderStatusData);

        const monthLimit = year === currentYear ? currentMonth : 12;
        const orderPoints = charts.orderStatusData
          .filter((p, idx) => idx < monthLimit && Number.isFinite(Number(p.total_orders)));
        if (orderPoints.length >= 2) {
          const currentOrders = Number(orderPoints[orderPoints.length - 1].total_orders) || 0;
          const previousOrders = Number(orderPoints[orderPoints.length - 2].total_orders) || 0;
          const fallbackDiff = percentChange(currentOrders, previousOrders);

          setStatsData((prev) =>
            prev.map((item, idx) =>
              idx === 0
                ? {
                    ...item,
                    change: toChangeLabel(fallbackDiff),
                    changeType: fallbackDiff >= 0 ? "increase" : "decrease",
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
                fallback: "Đã có lỗi khi tải dữ liệu dashboard. Vui lòng thử lại sau.",
              })
            : "Đã có lỗi khi tải dữ liệu dashboard. Vui lòng thử lại sau."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const loadYearsAndData = async () => {
      try {
        const years = await fetchAvailableYears();
        const fallbackYears = years.length ? years : [currentYear];
        if (!cancelled) {
          setAvailableYears(fallbackYears);
          setSelectedYear((prev) =>
            fallbackYears.includes(prev) ? prev : fallbackYears[0] ?? currentYear
          );
        }
      } catch (err) {
        console.error("Failed to load available years:", err);
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? normalizeErrorMessage(err.message, {
                  fallback: "Không thể tải năm dữ liệu dashboard.",
                })
              : "Không thể tải năm dữ liệu dashboard."
          );
          setLoading(false);
        }
      }
    };

    void loadYearsAndData();
    return () => {
      cancelled = true;
    };
  }, [currentYear]);

  useEffect(() => {
    void fetchDashboardData(selectedYear);
  }, [selectedYear, fetchDashboardData]);

  return {
    statsData,
    revenueChartData,
    orderChartData,
    availableYears,
    selectedYear,
    setSelectedYear,
    loading,
    errorMessage,
  };
};
