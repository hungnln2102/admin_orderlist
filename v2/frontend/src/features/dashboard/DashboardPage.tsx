import React, { useEffect, useState, useMemo } from "react";
import { StatCard } from "@/shared/components/StatCard";
import { GlassCard } from "@/shared/components/GlassCard";
import { DateRangePicker } from "@/shared/components/DateRangePicker";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Receipt,
  RotateCcw,
  XCircle,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChartPoint {
  label: string;
  fullDate?: string;
  dateKey?: string;
  orders: number;
  canceled: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface DashboardData {
  summary: {
    totalOrders: number;
    canceledOrders: number;
    totalRevenue: number;
    totalCost: number;
    totalRefund: number;
    totalProfit: number;
    grossProfit: number;
    financeCosts: number;
    ordersGrowth: number;
    canceledGrowth: number;
    revenueGrowth: number;
    profitGrowth: number;
    costGrowth: number;
    refundGrowth: number;
    profitMargin: number;
  };
  chartSubtitle?: string;
  chartData: ChartPoint[];
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Filter state
  const [period, setPeriod] = useState<"week" | "month" | "year" | "custom" | "day">("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Chart Tab state: "financial" or "orders"
  const [activeChartTab, setActiveChartTab] = useState<"financial" | "orders">("financial");

  // Hover & Pin states for chart column items
  const [hoveredFinancialIdx, setHoveredFinancialIdx] = useState<number | null>(null);
  const [hoveredOrderIdx, setHoveredOrderIdx] = useState<number | null>(null);
  const [pinnedFinancialIdx, setPinnedFinancialIdx] = useState<number | null>(null);
  const [pinnedOrderIdx, setPinnedOrderIdx] = useState<number | null>(null);

  // Active indices (hover priority over pin)
  const activeFinancialIdx = hoveredFinancialIdx !== null ? hoveredFinancialIdx : pinnedFinancialIdx;
  const activeOrderIdx = hoveredOrderIdx !== null ? hoveredOrderIdx : pinnedOrderIdx;

  const fetchDashboardData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("period", period);

    if (period === "month") {
      params.set("month", selectedMonth);
    } else if (period === "custom") {
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
    }

    fetch(`/api/dashboard/summary?${params.toString()}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          setData(resData.data);
        }
      })
      .catch((err) => console.error("Lỗi lấy dữ liệu Dashboard:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period, selectedMonth, startDate, endDate]);

  const summary = data?.summary || {
    totalOrders: 0,
    canceledOrders: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalRefund: 0,
    totalProfit: 0,
    grossProfit: 0,
    financeCosts: 0,
    ordersGrowth: 0,
    canceledGrowth: 0,
    revenueGrowth: 0,
    profitGrowth: 0,
    costGrowth: 0,
    refundGrowth: 0,
    profitMargin: 0,
  };

  const chartData = data?.chartData || [];

  // SVG scaling max values
  const financialMaxVal = useMemo(() => {
    if (!chartData.length) return 100;
    const max = Math.max(...chartData.map((d) => d.revenue));
    return max > 0 ? max * 1.15 : 100;
  }, [chartData]);

  const orderMaxVal = useMemo(() => {
    if (!chartData.length) return 10;
    const max = Math.max(...chartData.map((d) => Math.max(d.orders, d.canceled || 0)));
    return max > 0 ? Math.ceil(max * 1.2) : 10;
  }, [chartData]);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(Math.round(num)) + " ₫";
  };

  const formatShorthand = (num: number): string => {
    if (!num || num === 0) return "0";
    const abs = Math.abs(num);
    if (abs >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
    if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (abs >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return `${Math.round(num)}`;
  };

  // Helper cho đường cong mượt Bezier
  const getSmoothPath = (pts: { x: number; y: number }[]): string => {
    if (!pts || pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      path += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
    }
    return path;
  };

  const getSmoothAreaPath = (pts: { x: number; y: number }[], baselineY = 180): string => {
    if (!pts || pts.length === 0) return "";
    const linePath = getSmoothPath(pts);
    const first = pts[0];
    const last = pts[pts.length - 1];
    return `${linePath} L ${last.x},${baselineY} L ${first.x},${baselineY} Z`;
  };

  // Helper click drilldown / ghim mốc khi bấm vào mốc/dấu chấm trên biểu đồ
  const handlePointClick = (index: number, label: string, isFinancial: boolean) => {
    if (period === "year") {
      const monthNum = label.replace(/\D/g, "").padStart(2, "0");
      if (monthNum) {
        const year = selectedYear || String(new Date().getFullYear());
        setSelectedMonth(`${year}-${monthNum}`);
        setPeriod("month");
      }
    } else if (period === "month") {
      const dayNum = label.replace(/\D/g, "").padStart(2, "0");
      if (dayNum) {
        const yearMonth = selectedMonth || new Date().toISOString().slice(0, 7);
        setSelectedDate(`${yearMonth}-${dayNum}`);
        setPeriod("day");
      }
    } else {
      // Toggle ghim tooltip mốc được chọn ngay trên trang Dashboard
      if (isFinancial) {
        setPinnedFinancialIdx((prev) => (prev === index ? null : index));
      } else {
        setPinnedOrderIdx((prev) => (prev === index ? null : index));
      }
    }
  };

  // Helper định dạng mốc thời gian hiển thị đầy đủ ngày/tháng/năm trong Tooltip
  const formatPointDate = (point: ChartPoint): string => {
    if (point.fullDate) return point.fullDate;
    if (point.dateKey) {
      const datePart = point.dateKey.split("T")[0];
      const parts = datePart.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      if (parts.length === 2) return `Tháng ${parts[1]}/${parts[0]}`;
    }
    if (period === "month") {
      const parts = (selectedMonth || "").split("-");
      if (parts.length === 2) {
        return `${point.label.padStart(2, "0")}/${parts[1]}/${parts[0]}`;
      }
      return `Ngày ${point.label}`;
    }
    if (period === "year") {
      return `Tháng ${point.label.replace(/\D/g, "")}/${selectedYear}`;
    }
    return point.label;
  };

  // Helper xác định mốc nhãn được hiển thị theo yêu cầu (1, 5, 10, 15, 20, 25, 30/31 cho tháng; toàn bộ cho năm/ngày)
  const isTickVisible = (label: string, index: number, totalItems: number, activeIdx: number | null): boolean => {
    if (activeIdx === index) return true;
    if (totalItems <= 15) return true;
    const num = parseInt(label.replace(/\D/g, ""), 10);
    if (!isNaN(num)) {
      return num === 1 || num === 5 || num === 10 || num === 15 || num === 20 || num === 25 || num === 30 || num === 31 || index === 0 || index === totalItems - 1;
    }
    return index % 3 === 0;
  };

  const getVisibleTicks = () => {
    if (chartData.length <= 15) return chartData.map((d, i) => ({ ...d, index: i }));
    const step = Math.max(1, Math.floor(chartData.length / 6));
    const ticks = [];
    for (let i = 0; i < chartData.length; i += step) {
      ticks.push({ ...chartData[i], index: i });
    }
    if (ticks[ticks.length - 1].index !== chartData.length - 1) {
      ticks.push({ ...chartData[chartData.length - 1], index: chartData.length - 1 });
    }
    return ticks;
  };

  const svgWidth = 1000;
  const paddingX = 40;
  const usableWidth = svgWidth - paddingX * 2; // 920
  const getX = (i: number, len: number = chartData.length) => {
    if (len <= 1) return svgWidth / 2;
    return paddingX + (i / (len - 1)) * usableWidth;
  };

  const handleSvgMouseMove = (e: React.MouseEvent<any>, isFinancial: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const svgX = Math.max(0, Math.min(1000, (clickX / rect.width) * 1000));
    
    let closestIdx = 0;
    let minDiff = Infinity;
    chartData.forEach((_, i) => {
      const ptX = getX(i);
      const diff = Math.abs(ptX - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });

    if (isFinancial) {
      setHoveredFinancialIdx(closestIdx);
    } else {
      setHoveredOrderIdx(closestIdx);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1650px] mx-auto">
      {/* Page Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Tổng Quan Báo Cáo</span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
              Hệ Thống Live
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Thống kê doanh thu, chi phí, hoàn tiền, đơn hủy và lợi nhuận thực tế
          </p>
        </div>

        {/* Dynamic Filter Controls - Fixed width slot to eliminate layout shift */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main Period Selector Tabs */}
          <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800/90 shadow-inner">
            {(
              [
                { key: "week", label: "Tuần" },
                { key: "month", label: "Tháng" },
                { key: "year", label: "Năm" },
                { key: "custom", label: "Tùy Chỉnh" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => setPeriod(item.key)}
                className={`px-3.5 py-1.5 text-xs rounded-lg transition-all duration-200 select-none ${
                  period === item.key
                    ? "bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 font-medium"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Sub-filter Input Container with Fixed Stable Height & Alignment */}
          <div className="flex items-center min-h-[34px] min-w-[150px] justify-start">
            {period === "week" && (
              <span className="text-xs text-slate-400 font-medium px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl">
                7 ngày gần đây
              </span>
            )}

            {period === "month" && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500 transition-colors w-[150px]"
              />
            )}

            {period === "year" && (
              <span className="text-xs text-slate-400 font-medium px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl">
                1 năm qua
              </span>
            )}

            {period === "custom" && (
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
              />
            )}
          </div>

          {/* Refresh Action Button */}
          <button
            onClick={fetchDashboardData}
            className="p-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-xl transition border border-slate-700/50 hover:text-white"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 6 Core Metrics Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-4 sm:gap-5">
        <StatCard
          title="Tổng Doanh Thu"
          value={formatVND(summary.totalRevenue)}
          subtitle="Doanh số bán hàng thực tế"
          icon={DollarSign}
          trend={{
            value: `${Math.abs(summary.revenueGrowth)}%`,
            isPositive: summary.revenueGrowth >= 0,
          }}
          accent="cyan"
        />
        <StatCard
          title="Tổng Lợi Nhuận"
          value={formatVND(summary.totalProfit)}
          subtitle={`Sau chi phí tài chính · Biên ${summary.profitMargin}%`}
          icon={TrendingUp}
          trend={{
            value: `${Math.abs(summary.profitGrowth)}%`,
            isPositive: summary.profitGrowth >= 0,
          }}
          accent="purple"
        />
        <StatCard
          title="Tổng Chi Phí"
          value={formatVND(summary.totalCost)}
          subtitle="Tổng giá vốn & nhập hàng"
          icon={Receipt}
          trend={{
            value: `${Math.abs(summary.costGrowth)}%`,
            isPositive: summary.costGrowth <= 0,
          }}
          accent="amber"
        />
        <StatCard
          title="Tổng Đơn Hàng"
          value={summary.totalOrders.toLocaleString("vi-VN")}
          subtitle="Đơn hàng được ghi nhận"
          icon={ShoppingCart}
          trend={{
            value: `${Math.abs(summary.ordersGrowth)}%`,
            isPositive: summary.ordersGrowth >= 0,
          }}
          accent="emerald"
        />
        <StatCard
          title="Tổng Đơn Hủy"
          value={summary.canceledOrders.toLocaleString("vi-VN")}
          subtitle="Số đơn hàng bị hủy"
          icon={XCircle}
          trend={{
            value: `${Math.abs(summary.canceledGrowth)}%`,
            isPositive: summary.canceledGrowth <= 0,
          }}
          accent="rose"
        />
        <StatCard
          title="Tổng Hoàn Tiền"
          value={formatVND(summary.totalRefund)}
          subtitle="Tổng tiền hoàn đơn hàng"
          icon={RotateCcw}
          trend={{
            value: `${Math.abs(summary.refundGrowth)}%`,
            isPositive: summary.refundGrowth <= 0,
          }}
          accent="fuchsia"
        />
      </div>

      {/* Single Full-Width Interactive Chart with Tab Switcher */}
      <GlassCard className="space-y-4" glow={activeChartTab === "financial" ? "cyan" : "emerald"}>
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{activeChartTab === "financial" ? "Biểu Đồ Doanh Thu, Chi Phí & Lợi Nhuận" : "Biểu Đồ Số Lượng Đơn Hàng"}</span>
              </h3>
              <p className="text-xs text-slate-400">{data?.chartSubtitle || "Xu hướng biến động theo thời gian"}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Tab Switcher Buttons */}
            <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800/80">
              <button
                onClick={() => setActiveChartTab("financial")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeChartTab === "financial"
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Doanh Thu & Tài Chính</span>
              </button>
              <button
                onClick={() => setActiveChartTab("orders")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeChartTab === "orders"
                    ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Số Lượng Đơn Hàng</span>
              </button>
            </div>

            {/* Dynamic Chart Legend */}
            {activeChartTab === "financial" ? (
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                  <span className="text-cyan-300 font-bold">Đường Doanh Thu</span>
                  <span className="text-slate-400 text-[10px] italic">(Hover để xem Chi phí & Lợi nhuận)</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-300">Tổng đơn</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="text-slate-300">Đơn hủy</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SVG Chart Box */}
        <div className="h-80 rounded-xl bg-slate-950/80 border border-slate-800/80 p-4 relative overflow-visible flex flex-col justify-between">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-20 rounded-xl">
              <RefreshCw className={`w-6 h-6 animate-spin ${activeChartTab === "financial" ? "text-cyan-400" : "text-emerald-400"}`} />
            </div>
          ) : null}

          {chartData.length > 0 ? (
            <div className="relative w-full h-full flex flex-col justify-between">
              {/* Y-axis grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-b border-slate-700 w-full" />
                <div className="border-b border-slate-700 w-full" />
                <div className="border-b border-slate-700 w-full" />
                <div className="border-b border-slate-700 w-full" />
              </div>

              {activeChartTab === "financial" ? (
                /* Financial Chart View */
                <>
                  <svg 
                    className="w-full h-56 overflow-visible z-10 cursor-crosshair" 
                    preserveAspectRatio="none" 
                    viewBox="0 0 1000 200"
                    onMouseMove={(e) => handleSvgMouseMove(e, true)}
                    onMouseLeave={() => setHoveredFinancialIdx(null)}
                  >
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c084fc" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {(() => {
                      const revPts = chartData.map((d, i) => ({
                        x: getX(i),
                        y: Math.max(20, Math.min(175, 175 - (d.revenue / financialMaxVal) * 150)),
                      }));
                      const profPts = chartData.map((d, i) => ({
                        x: getX(i),
                        y: Math.max(20, Math.min(175, 175 - (d.profit / financialMaxVal) * 150)),
                      }));
                      const costPts = chartData.map((d, i) => ({
                        x: getX(i),
                        y: Math.max(20, Math.min(175, 175 - (d.cost / financialMaxVal) * 150)),
                      }));

                      return (
                        <>
                          <path d={getSmoothAreaPath(revPts, 175)} fill="url(#revenueGrad)" />
                          <path d={getSmoothPath(revPts)} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />

                          {activeFinancialIdx !== null && (
                            <line
                              x1={getX(activeFinancialIdx)}
                              y1={10}
                              x2={getX(activeFinancialIdx)}
                              y2={180}
                              stroke="#38bdf8"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                              opacity="0.7"
                            />
                          )}

                          {chartData.map((d, i) => {
                            const x = getX(i);
                            const revY = revPts[i].y;
                            const isActive = activeFinancialIdx === i;

                            return (
                              <g key={i}>
                                {isActive && (
                                  <>
                                    <circle cx={x} cy={revY} r="10" fill="#22d3ee" opacity="0.25" />
                                    <circle cx={x} cy={revY} r="6" fill="#22d3ee" stroke="#0f172a" strokeWidth="2.5" />
                                  </>
                                )}
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>

                  {/* Floating Glass Tooltip */}
                  {activeFinancialIdx !== null && (
                    <div
                      className={`absolute top-2 z-30 p-3 bg-slate-950/95 backdrop-blur-md border border-cyan-500/50 rounded-xl shadow-2xl pointer-events-none transition-all duration-200 text-xs min-w-[190px] ${
                        activeFinancialIdx > chartData.length / 2 ? "left-4" : "right-4"
                      }`}
                    >
                      <p className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
                        <span>Mốc: {formatPointDate(chartData[activeFinancialIdx])}</span>
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      </p>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        <p className="text-cyan-400 font-semibold flex justify-between gap-4">
                          <span>Doanh thu:</span>
                          <span>{formatVND(chartData[activeFinancialIdx].revenue)}</span>
                        </p>
                        <p className="text-purple-400 font-semibold flex justify-between gap-4">
                          <span>Lợi nhuận:</span>
                          <span>{formatVND(chartData[activeFinancialIdx].profit)}</span>
                        </p>
                        <p className="text-rose-400 font-semibold flex justify-between gap-4">
                          <span>Chi phí:</span>
                          <span>{formatVND(chartData[activeFinancialIdx].cost)}</span>
                        </p>
                      </div>
                      <p className="text-[9px] text-sky-400/90 border-t border-slate-800/80 pt-1.5 mt-2 italic font-sans flex items-center justify-between">
                        <span>💡 {period === "month" || period === "year" ? "Click mốc để xem chi tiết" : "Click mốc để ghim số liệu"}</span>
                      </p>
                    </div>
                  )}

                  {/* X-Axis Labels */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 z-10 px-2">
                    {getVisibleTicks().map((t) => (
                      <div
                        key={t.index}
                        className="text-center cursor-pointer py-1"
                        onClick={() => handlePointClick(t.index, t.label, true)}
                        onMouseEnter={() => setHoveredFinancialIdx(t.index)}
                        onMouseLeave={() => setHoveredFinancialIdx(null)}
                      >
                        <span className={`text-[10px] sm:text-xs font-bold transition-all inline-block ${activeFinancialIdx === t.index ? "text-cyan-400 font-black scale-110" : "text-slate-400"}`}>
                          {t.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Orders Chart View */
                <>
                  <svg 
                    className="w-full h-56 overflow-visible z-10 cursor-crosshair" 
                    preserveAspectRatio="none" 
                    viewBox="0 0 1000 200"
                    onMouseMove={(e) => handleSvgMouseMove(e, false)}
                    onMouseLeave={() => setHoveredOrderIdx(null)}
                  >
                    <defs>
                      <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {(() => {
                      const orderPts = chartData.map((d, i) => ({
                        x: getX(i),
                        y: Math.max(20, Math.min(175, 175 - (d.orders / orderMaxVal) * 150)),
                      }));
                      const cancelPts = chartData.map((d, i) => ({
                        x: getX(i),
                        y: Math.max(20, Math.min(175, 175 - ((d.canceled || 0) / orderMaxVal) * 150)),
                      }));

                      return (
                        <>
                          <path d={getSmoothAreaPath(orderPts, 175)} fill="url(#orderGrad)" />
                          <path d={getSmoothPath(orderPts)} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                          <path d={getSmoothPath(cancelPts)} fill="none" stroke="#fb7185" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />

                          {activeOrderIdx !== null && (
                            <line
                              x1={getX(activeOrderIdx)}
                              y1={10}
                              x2={getX(activeOrderIdx)}
                              y2={180}
                              stroke="#34d399"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                              opacity="0.7"
                            />
                          )}

                          {chartData.map((d, i) => {
                            const x = getX(i);
                            const orderY = orderPts[i].y;
                            const cancelY = cancelPts[i].y;
                            const isActive = activeOrderIdx === i;
                            const isShowText = chartData.length <= 15 || i % 3 === 0 || isActive;

                            return (
                              <g key={i}>
                                {isActive && (
                                  <>
                                    <circle cx={x} cy={orderY} r="6" fill="#10b981" stroke="#0f172a" strokeWidth="2" />
                                    <circle cx={x} cy={cancelY} r="6" fill="#fb7185" stroke="#0f172a" strokeWidth="2" />
                                  </>
                                )}
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>

                  {/* Floating Glass Tooltip */}
                  {activeOrderIdx !== null && (
                    <div
                      className={`absolute top-2 z-30 p-3 bg-slate-950/95 backdrop-blur-md border border-emerald-500/50 rounded-xl shadow-2xl pointer-events-none transition-all duration-200 text-xs min-w-[170px] ${
                        activeOrderIdx > chartData.length / 2 ? "left-4" : "right-4"
                      }`}
                    >
                      <p className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
                        <span>Mốc: {formatPointDate(chartData[activeOrderIdx])}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </p>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        <p className="text-emerald-400 font-semibold flex justify-between gap-4">
                          <span>Tổng đơn:</span>
                          <span>{chartData[activeOrderIdx].orders} đơn</span>
                        </p>
                        <p className="text-rose-400 font-semibold flex justify-between gap-4">
                          <span>Đơn hủy:</span>
                          <span>{chartData[activeOrderIdx].canceled || 0} đơn</span>
                        </p>
                      </div>
                      <p className="text-[9px] text-emerald-400/90 border-t border-slate-800/80 pt-1.5 mt-2 italic font-sans flex items-center justify-between">
                        <span>💡 {period === "month" || period === "year" ? "Click mốc để xem chi tiết" : "Click mốc để ghim số liệu"}</span>
                      </p>
                    </div>
                  )}

                  {/* X-Axis Labels */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 z-10 px-2">
                    {getVisibleTicks().map((t) => (
                      <div
                        key={t.index}
                        className="text-center cursor-pointer py-1"
                        onClick={() => handlePointClick(t.index, t.label, false)}
                        onMouseEnter={() => setHoveredOrderIdx(t.index)}
                        onMouseLeave={() => setHoveredOrderIdx(null)}
                      >
                        <span className={`text-[10px] sm:text-xs font-bold transition-all inline-block ${activeOrderIdx === t.index ? "text-emerald-400 font-black scale-110" : "text-slate-400"}`}>
                          {t.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">Không có dữ liệu trong khoảng thời gian này</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
