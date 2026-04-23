import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArchiveBoxIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import {
  fetchAvailableYears,
  fetchChartData,
  fetchChartDataRange,
  fetchDashboardStats,
  type ChartsApiResponse,
  type OrderStatusData,
  type RevenueData,
  type ProfitData,
  type RefundData,
  type TaxData,
} from "@/features/dashboard/api/dashboardApi";
import * as Helpers from "@/lib/helpers";
import { normalizeErrorMessage } from "@/lib/textUtils";
import { type OverviewStat } from "../components/OverviewStats";
import { STAT_CARD_ACCENTS } from "@/components/ui/StatCard";

interface StatsApiResponse {
  totalOrders: { current: number; previous: number };
  totalRevenue: { current: number; previous: number };
  totalImports: { current: number; previous: number };
  totalRefund: { current: number; previous: number };
  monthlyProfit?: { current: number; previous: number };
  monthlyTax?: { current: number; previous: number };
  availableProfit?: { current: number; previous: number };
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
  if (current === 0) return 0;
  return current > 0 ? 100 : -100;
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

const buildStats = (stats: StatsApiResponse): OverviewStat[] => {
  const profitPair = stats.monthlyProfit ?? { current: 0, previous: 0 };
  const taxPair = stats.monthlyTax ?? { current: 0, previous: 0 };

  return [
  {
    ...calculateStat("Tổng đơn hàng", stats.totalOrders.current, stats.totalOrders.previous, false),
    icon: ShoppingBagIcon,
    accent: "sky",
  },
  {
    ...calculateStat("Doanh thu", stats.totalRevenue.current, stats.totalRevenue.previous, true),
    icon: BanknotesIcon,
    accent: "rose",
  },
  {
    ...calculateStat("Hoàn tiền", stats.totalRefund.current, stats.totalRefund.previous, true),
    icon: CurrencyDollarIcon,
    accent: "emerald",
  },
  {
    ...calculateStat("Tổng nhập hàng", stats.totalImports.current, stats.totalImports.previous, true),
    icon: ArchiveBoxIcon,
    accent: "amber",
  },
  {
    ...calculateStat("Lợi nhuận tháng", profitPair.current, profitPair.previous, true),
    icon: ArrowTrendingUpIcon,
    accent: "teal",
  },
  {
    ...calculateStat("Thuế", taxPair.current, taxPair.previous, true),
    icon: ReceiptPercentIcon,
    accent: "violet",
  },
];
};

export type DashboardDateRange = { from: string; to: string };

export const useDashboardStats = () => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []); // 1-based

  const [statsData, setStatsData] = useState<OverviewStat[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<RevenueData[]>([]);
  const [orderChartData, setOrderChartData] = useState<OrderStatusData[]>([]);
  const [profitChartData, setProfitChartData] = useState<ProfitData[]>([]);
  const [refundChartData, setRefundChartData] = useState<RefundData[]>([]);
  const [taxChartData, setTaxChartData] = useState<TaxData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [dashboardRange, setDashboardRange] = useState<DashboardDateRange | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableProfit, setAvailableProfit] = useState<{ current: number; previous: number }>({
    current: 0,
    previous: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const stats: StatsApiResponse = await fetchDashboardStats(dashboardRange);

      const charts: ChartsApiResponse = dashboardRange
        ? await fetchChartDataRange(dashboardRange.from, dashboardRange.to)
        : await fetchChartData(selectedYear);
      setStatsData(buildStats(stats));
      setAvailableProfit({
        current: Number(stats.availableProfit?.current || 0),
        previous: Number(stats.availableProfit?.previous || 0),
      });

      setRevenueChartData(charts.revenueData);
      setOrderChartData(charts.orderStatusData);
      setProfitChartData(charts.profitData);
      setRefundChartData(charts.refundData);
      setTaxChartData(charts.taxData ?? []);

      if (!dashboardRange) {
        const monthLimit = selectedYear === currentYear ? currentMonth : 12;
        const orderPoints = charts.orderStatusData
          .filter((p, idx) => idx < monthLimit && Number.isFinite(Number(p.total_orders)));
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
                    changeType: fallbackDiff >= 0 ? "increase" : "decrease",
                  }
                : item
            )
          );
        }
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
  }, [currentMonth, currentYear, dashboardRange, selectedYear]);

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
    void fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    statsData,
    revenueChartData,
    orderChartData,
    profitChartData,
    refundChartData,
    taxChartData,
    availableYears,
    selectedYear,
    setSelectedYear,
    dashboardRange,
    setDashboardRange,
    loading,
    errorMessage,
    availableProfit,
    refetchDashboardStats: fetchDashboardData,
  };
};
