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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChartPoint {
  label: string;
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
  const [period, setPeriod] = useState<"day" | "month" | "year" | "custom">("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

    if (period === "day") {
      params.set("date", selectedDate);
    } else if (period === "month") {
      params.set("month", selectedMonth);
    } else if (period === "year") {
      params.set("year", selectedYear);
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
  }, [period, selectedMonth, selectedYear, selectedDate, startDate, endDate]);

  const summary = data?.summary || {
    totalOrders: 0,
    canceledOrders: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalRefund: 0,
    totalProfit: 0,
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
    const max = Math.max(
      ...chartData.map((d) => Math.max(d.revenue, d.cost, Math.abs(d.profit)))
    );
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

  // Helper xác định mốc nhãn được hiển thị (hiện toàn bộ cho 12 mốc chuẩn)
  const isTickVisible = (_label: string, _index: number, _totalItems: number, _activeIdx: number | null): boolean => {
    return true;
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
                { key: "day", label: "Hôm nay" },
                { key: "month", label: "Tháng này" },
                { key: "year", label: "Năm nay" },
                { key: "custom", label: "Tùy chỉnh" },
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
            {period === "day" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500 transition-colors w-[150px]"
              />
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
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500 transition-colors w-[130px] cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
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
          subtitle={`Biên lợi nhuận ${summary.profitMargin}%`}
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

      {/* 2 Stat Line Charts Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Doanh Thu, Chi Phí & Lợi Nhuận */}
        <GlassCard className="space-y-4" glow="cyan">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Biểu Đồ Doanh Thu, Chi Phí & Lợi Nhuận</span>
              </h3>
              <p className="text-xs text-slate-400">{data?.chartSubtitle || "Xu hướng biến động tài chính theo thời gian"}</p>
            </div>
            {/* Chart Legend */}
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="text-slate-300">Doanh thu</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span className="text-slate-300">Lợi nhuận</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="text-slate-300">Chi phí</span>
              </div>
            </div>
          </div>

          {/* SVG Financial Line & Area Chart */}
          <div className="h-72 rounded-xl bg-slate-950/80 border border-slate-800/80 p-4 relative overflow-hidden flex flex-col justify-between">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-20">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
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

                {/* SVG Curves & Area Gradients */}
                <svg className="w-full h-48 overflow-visible z-10" preserveAspectRatio="none" viewBox={`0 0 ${chartData.length * 50} 200`}>
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

                  {/* Pre-calculate point positions */}
                  {(() => {
                    const revPts = chartData.map((d, i) => ({
                      x: i * 50 + 25,
                      y: Math.max(15, Math.min(175, 175 - (d.revenue / financialMaxVal) * 155)),
                    }));
                    const profPts = chartData.map((d, i) => ({
                      x: i * 50 + 25,
                      y: Math.max(15, Math.min(175, 175 - (d.profit / financialMaxVal) * 155)),
                    }));
                    const costPts = chartData.map((d, i) => ({
                      x: i * 50 + 25,
                      y: Math.max(15, Math.min(175, 175 - (d.cost / financialMaxVal) * 155)),
                    }));

                    return (
                      <>
                        {/* Area Fill for Revenue */}
                        <path d={getSmoothAreaPath(revPts, 175)} fill="url(#revenueGrad)" />

                        {/* Revenue Bezier Path */}
                        <path d={getSmoothPath(revPts)} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />

                        {/* Profit Bezier Path */}
                        <path d={getSmoothPath(profPts)} fill="none" stroke="#c084fc" strokeWidth="3" strokeLinecap="round" />

                        {/* Cost Bezier Path */}
                        <path d={getSmoothPath(costPts)} fill="none" stroke="#fb7185" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />

                        {/* Guideline on column hover / pin */}
                        {activeFinancialIdx !== null && (
                          <line
                            x1={activeFinancialIdx * 50 + 25}
                            y1={10}
                            x2={activeFinancialIdx * 50 + 25}
                            y2={180}
                            stroke="#38bdf8"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                            opacity="0.7"
                          />
                        )}

                        {/* Nodes (Circles with concentric overlap handling + Click Target) */}
                        {chartData.map((d, i) => {
                          const x = i * 50 + 25;
                          const revY = revPts[i].y;
                          const profY = profPts[i].y;
                          const costY = costPts[i].y;
                          const isActive = activeFinancialIdx === i;
                          const isOverlap = Math.abs(revY - profY) < 3;

                          return (
                            <g key={i}>
                              {/* Cost circle */}
                              <circle cx={x} cy={costY} r={isActive ? "6" : "3.5"} fill="#fb7185" stroke="#0f172a" strokeWidth="1.5" pointerEvents="none" />

                              {/* Overlap concentric circle vs separate circles */}
                              {isOverlap ? (
                                <g pointerEvents="none">
                                  <circle cx={x} cy={revY} r={isActive ? "8" : "5.5"} fill="#22d3ee" stroke="#0f172a" strokeWidth="2" />
                                  <circle cx={x} cy={profY} r={isActive ? "4.5" : "3"} fill="#c084fc" />
                                </g>
                              ) : (
                                <g pointerEvents="none">
                                  <circle cx={x} cy={revY} r={isActive ? "6" : "4"} fill="#22d3ee" stroke="#0f172a" strokeWidth="2" />
                                  <circle cx={x} cy={profY} r={isActive ? "6" : "4"} fill="#c084fc" stroke="#0f172a" strokeWidth="2" />
                                </g>
                              )}

                              {/* Interactive Hit Target Circle */}
                              <circle
                                cx={x}
                                cy={revY}
                                r="18"
                                fill="transparent"
                                className="cursor-pointer"
                                onClick={() => handlePointClick(i, d.label, true)}
                                onMouseEnter={() => setHoveredFinancialIdx(i)}
                                onMouseLeave={() => setHoveredFinancialIdx(null)}
                              />
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                {/* X-Axis Labels & Unified Column Hover Tooltip */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800 z-10">
                  {chartData.map((d, i) => {
                    const totalItems = chartData.length;
                    const isVisible = isTickVisible(d.label, i, totalItems, activeFinancialIdx);

                    return (
                      <div
                        key={i}
                        className="flex-1 text-center cursor-pointer relative group py-1"
                        onClick={() => handlePointClick(i, d.label, true)}
                        onMouseEnter={() => setHoveredFinancialIdx(i)}
                        onMouseLeave={() => setHoveredFinancialIdx(null)}
                      >
                        <span className={`text-[11px] font-bold transition-all inline-block ${activeFinancialIdx === i ? "text-cyan-400 font-black scale-110" : isVisible ? "text-slate-400" : "text-slate-600 text-[9px]"}`}>
                          {isVisible ? d.label : "•"}
                        </span>

                        {/* Unified Floating Glass Tooltip */}
                        {activeFinancialIdx === i && (
                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 p-2.5 rounded-xl shadow-2xl z-30 min-w-[160px] pointer-events-none">
                            <p className="text-[11px] font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1.5 flex justify-between items-center">
                              <span>Mốc: {period === "month" ? `Ngày ${d.label}` : d.label}</span>
                              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            </p>
                            <div className="space-y-1">
                              <p className="text-[11px] text-cyan-400 font-semibold flex justify-between gap-3">
                                <span>Doanh thu:</span>
                                <span className="font-mono">{formatVND(d.revenue)}</span>
                              </p>
                              <p className="text-[11px] text-purple-400 font-semibold flex justify-between gap-3">
                                <span>Lợi nhuận:</span>
                                <span className="font-mono">{formatVND(d.profit)}</span>
                              </p>
                              <p className="text-[11px] text-rose-400 font-semibold flex justify-between gap-3">
                                <span>Chi phí:</span>
                                <span className="font-mono">{formatVND(d.cost)}</span>
                              </p>
                            </div>
                            <p className="text-[9px] text-sky-400/90 border-t border-slate-800/80 pt-1 mt-1.5 italic font-sans flex items-center justify-between">
                              <span>💡 {period === "month" || period === "year" ? "Click mốc để xem chi tiết" : "Click mốc để ghim số liệu"}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">Không có dữ liệu trong khoảng thời gian này</div>
            )}
          </div>
        </GlassCard>

        {/* Chart 2: Biểu Đồ Số Lượng Đơn Hàng */}
        <GlassCard className="space-y-4" glow="emerald">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
            <div>
              <h3 className="text-base font-bold text-white">Biểu Đồ Số Lượng Đơn Hàng</h3>
              <p className="text-xs text-slate-400">{data?.chartSubtitle || "Biến động lượng đơn hàng theo thời gian"}</p>
            </div>
            {/* Chart Legend */}
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
          </div>

          {/* SVG Order Count Chart */}
          <div className="h-72 rounded-xl bg-slate-950/80 border border-slate-800/80 p-4 relative overflow-hidden flex flex-col justify-between">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-20">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
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

                {/* SVG Lines */}
                <svg className="w-full h-48 overflow-visible z-10" preserveAspectRatio="none" viewBox={`0 0 ${chartData.length * 50} 200`}>
                  <defs>
                    <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Pre-calculate point positions */}
                  {(() => {
                    const orderPts = chartData.map((d, i) => ({
                      x: i * 50 + 25,
                      y: Math.max(15, Math.min(175, 175 - (d.orders / orderMaxVal) * 155)),
                    }));
                    const cancelPts = chartData.map((d, i) => ({
                      x: i * 50 + 25,
                      y: Math.max(15, Math.min(175, 175 - ((d.canceled || 0) / orderMaxVal) * 155)),
                    }));

                    return (
                      <>
                        {/* Area Fill for Total Orders */}
                        <path d={getSmoothAreaPath(orderPts, 175)} fill="url(#orderGrad)" />

                        {/* Total Orders Bezier Path */}
                        <path d={getSmoothPath(orderPts)} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />

                        {/* Canceled Orders Bezier Path */}
                        <path d={getSmoothPath(cancelPts)} fill="none" stroke="#fb7185" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />

                        {/* Guideline on column hover / pin */}
                        {activeOrderIdx !== null && (
                          <line
                            x1={activeOrderIdx * 50 + 25}
                            y1={10}
                            x2={activeOrderIdx * 50 + 25}
                            y2={180}
                            stroke="#34d399"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                            opacity="0.7"
                          />
                        )}

                        {/* Nodes (Circles with concentric overlap handling + Click Target) */}
                        {chartData.map((d, i) => {
                          const x = i * 50 + 25;
                          const orderY = orderPts[i].y;
                          const cancelY = cancelPts[i].y;
                          const isActive = activeOrderIdx === i;
                          const isOverlap = Math.abs(orderY - cancelY) < 3;

                          return (
                            <g key={i}>
                              {isOverlap ? (
                                <g pointerEvents="none">
                                  <circle cx={x} cy={orderY} r={isActive ? "8" : "5.5"} fill="#10b981" stroke="#0f172a" strokeWidth="2" />
                                  <circle cx={x} cy={cancelY} r={isActive ? "4.5" : "3"} fill="#fb7185" />
                                </g>
                              ) : (
                                <g pointerEvents="none">
                                  <circle cx={x} cy={orderY} r={isActive ? "6" : "4"} fill="#10b981" stroke="#0f172a" strokeWidth="2" />
                                  <circle cx={x} cy={cancelY} r={isActive ? "6" : "4"} fill="#fb7185" stroke="#0f172a" strokeWidth="2" />
                                </g>
                              )}

                              {/* Interactive Hit Target Circle */}
                              <circle
                                cx={x}
                                cy={orderY}
                                r="18"
                                fill="transparent"
                                className="cursor-pointer"
                                onClick={() => handlePointClick(i, d.label, false)}
                                onMouseEnter={() => setHoveredOrderIdx(i)}
                                onMouseLeave={() => setHoveredOrderIdx(null)}
                              />
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                {/* X-Axis Labels & Unified Tooltip */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800 z-10">
                  {chartData.map((d, i) => {
                    const totalItems = chartData.length;
                    const isVisible = isTickVisible(d.label, i, totalItems, activeOrderIdx);

                    return (
                      <div
                        key={i}
                        className="flex-1 text-center cursor-pointer relative group py-1"
                        onClick={() => handlePointClick(i, d.label, false)}
                        onMouseEnter={() => setHoveredOrderIdx(i)}
                        onMouseLeave={() => setHoveredOrderIdx(null)}
                      >
                        <span className={`text-[11px] font-bold transition-all inline-block ${activeOrderIdx === i ? "text-emerald-400 font-black scale-110" : isVisible ? "text-slate-400" : "text-slate-600 text-[9px]"}`}>
                          {isVisible ? d.label : "•"}
                        </span>

                        {/* Unified Floating Glass Tooltip */}
                        {activeOrderIdx === i && (
                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 p-2.5 rounded-xl shadow-2xl z-30 min-w-[140px] pointer-events-none">
                            <p className="text-[11px] font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1.5 flex justify-between items-center">
                              <span>Mốc: {period === "month" ? `Ngày ${d.label}` : d.label}</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            </p>
                            <div className="space-y-1">
                              <p className="text-[11px] text-emerald-400 font-semibold flex justify-between gap-3">
                                <span>Tổng đơn:</span>
                                <span className="font-mono">{d.orders} đơn</span>
                              </p>
                              <p className="text-[11px] text-rose-400 font-semibold flex justify-between gap-3">
                                <span>Đơn hủy:</span>
                                <span className="font-mono">{d.canceled || 0} đơn</span>
                              </p>
                            </div>
                            <p className="text-[9px] text-emerald-400/90 border-t border-slate-800/80 pt-1 mt-1.5 italic font-sans flex items-center justify-between">
                              <span>💡 {period === "month" || period === "year" ? "Click mốc để xem chi tiết" : "Click mốc để ghim số liệu"}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">Không có dữ liệu đơn hàng</div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
