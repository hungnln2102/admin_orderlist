import React, { useState, useEffect, useMemo } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { StatCard } from "@/shared/components/StatCard";
import {
  Eye,
  Users,
  Activity,
  Clock,
  Percent,
  UserCheck,
  RefreshCw,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  ExternalLink,
  Calendar,
  Share2,
  FileText,
  MapPin,
  CheckCircle2,
  Info,
  BarChart3,
  Layers,
} from "lucide-react";

interface DailyTrafficItem {
  date: string;
  fullDate?: string;
  visitors: number;
  sessions: number;
  pageviews: number;
  bounceRate: number;
  avgDuration: string;
}

interface SourceItem {
  name: string;
  channel?: string;
  sessions: number;
  users: number;
  newUsers?: number;
  bounceRate: string;
  share: number;
}

interface TopPageItem {
  path: string;
  title: string;
  views: number;
  users: number;
  time: string;
  bounceRate: string;
}

interface DeviceItem {
  device: string;
  name?: string;
  os: string;
  browser: string;
  sessions: number;
  users: number;
  share: number;
  color?: string;
}

interface LocationItem {
  city: string;
  country: string;
  sessions: number;
  users: number;
  share: number;
}

interface TrafficApiResponse {
  source: string;
  domain: string;
  days: number;
  lastUpdated: string;
  kpi: {
    pageviews: string;
    pageviewsChange: string;
    visitors: string;
    visitorsChange: string;
    sessions: string;
    sessionsChange: string;
    avgDuration: string;
    avgDurationChange: string;
    bounceRate: string;
    bounceRateChange: string;
    returningRate: string;
    returningRateChange: string;
  };
  trafficData: DailyTrafficItem[];
  sourceData: SourceItem[];
  topPages: TopPageItem[];
  deviceData: DeviceItem[];
  locationData: LocationItem[];
  newVsReturning: { name: string; value: number; share: number; color?: string }[];
}

export const TrafficPage: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<TrafficApiResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Tab cho 5 bảng stat
  const [activeTab, setActiveTab] = useState<"daily" | "sources" | "pages" | "devices" | "locations">("daily");

  // Search filter trong bảng
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Sắp xếp bảng
  const [sortField, setSortField] = useState<string>("views");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Hover index trên biểu đồ SVG
  const [hoveredChartIdx, setHoveredChartIdx] = useState<number | null>(null);

  // Fetch dữ liệu Traffic
  const fetchTrafficData = async (selectedDays: number) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/traffic/stats?days=${selectedDays}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.message || "Không thể tải dữ liệu traffic");
      }
    } catch (err: any) {
      console.error("Lỗi khi tải traffic stats:", err);
      setErrorMsg(err.message || "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrafficData(days);
  }, [days]);

  // Reset trang và search khi đổi tab
  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm("");
    if (activeTab === "daily") setSortField("date");
    else if (activeTab === "sources" || activeTab === "devices" || activeTab === "locations") setSortField("sessions");
    else if (activeTab === "pages") setSortField("views");
  }, [activeTab]);

  // Dữ liệu bảng theo Tab hiện tại kèm Search & Sort
  const processedTableData = useMemo(() => {
    if (!data) return [];

    let list: any[] = [];
    const term = searchTerm.trim().toLowerCase();

    if (activeTab === "daily") {
      list = [...(data.trafficData || [])];
      if (term) {
        list = list.filter((item) => item.date.toLowerCase().includes(term));
      }
      list.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    } else if (activeTab === "sources") {
      list = [...(data.sourceData || [])];
      if (term) {
        list = list.filter((item) => item.name.toLowerCase().includes(term) || (item.channel && item.channel.toLowerCase().includes(term)));
      }
      list.sort((a, b) => {
        const valA = a[sortField] ?? 0;
        const valB = b[sortField] ?? 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      });
    } else if (activeTab === "pages") {
      list = [...(data.topPages || [])];
      if (term) {
        list = list.filter((item) => item.path.toLowerCase().includes(term) || item.title.toLowerCase().includes(term));
      }
      list.sort((a, b) => {
        const valA = a[sortField] ?? 0;
        const valB = b[sortField] ?? 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      });
    } else if (activeTab === "devices") {
      list = [...(data.deviceData || [])];
      if (term) {
        list = list.filter((item) => item.device.toLowerCase().includes(term) || item.os.toLowerCase().includes(term) || item.browser.toLowerCase().includes(term));
      }
      list.sort((a, b) => {
        const valA = a[sortField] ?? 0;
        const valB = b[sortField] ?? 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      });
    } else if (activeTab === "locations") {
      list = [...(data.locationData || [])];
      if (term) {
        list = list.filter((item) => item.city.toLowerCase().includes(term) || item.country.toLowerCase().includes(term));
      }
      list.sort((a, b) => {
        const valA = a[sortField] ?? 0;
        const valB = b[sortField] ?? 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      });
    }

    return list;
  }, [data, activeTab, searchTerm, sortField, sortDirection]);

  // Phân trang dữ liệu
  const totalPages = Math.max(1, Math.ceil(processedTableData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedTableData.slice(start, start + pageSize);
  }, [processedTableData, currentPage]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Xuất file CSV cho tab hiện tại
  const handleExportCSV = () => {
    if (!processedTableData.length) return;
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === "daily") {
      headers = ["Ngày", "Lượt xem (Views)", "Khách (Users)", "Số phiên (Sessions)", "Tỷ lệ thoát (%)", "Thời lượng TB"];
      rows = processedTableData.map((d) => [d.date, d.pageviews, d.visitors, d.sessions, `${d.bounceRate}%`, d.avgDuration]);
    } else if (activeTab === "sources") {
      headers = ["Kênh / Nguồn", "Phân loại", "Số phiên", "Người dùng", "Khách mới", "Tỷ lệ thoát", "Tỷ trọng (%)"];
      rows = processedTableData.map((d) => [d.name, d.channel || "", d.sessions, d.users, d.newUsers || 0, d.bounceRate, `${d.share}%`]);
    } else if (activeTab === "pages") {
      headers = ["Đường dẫn URL", "Tiêu đề trang", "Lượt xem", "Khách xem", "Thời gian trên trang", "Tỷ lệ thoát"];
      rows = processedTableData.map((d) => [d.path, `"${d.title.replace(/"/g, '""')}"`, d.views, d.users, d.time, d.bounceRate]);
    } else if (activeTab === "devices") {
      headers = ["Thiết bị", "Hệ điều hành", "Trình duyệt", "Số phiên", "Người dùng", "Tỷ trọng (%)"];
      rows = processedTableData.map((d) => [d.device, d.os, d.browser, d.sessions, d.users, `${d.share}%`]);
    } else if (activeTab === "locations") {
      headers = ["Tỉnh / Thành phố", "Quốc gia", "Số phiên", "Người dùng", "Tỷ trọng (%)"];
      rows = processedTableData.map((d) => [d.city, d.country, d.sessions, d.users, `${d.share}%`]);
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `traffic_report_${activeTab}_${days}days.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper tính tọa độ SVG cho biểu đồ đường cong
  const chartPoints = data?.trafficData || [];
  const maxVal = useMemo(() => {
    if (!chartPoints.length) return 100;
    const max = Math.max(...chartPoints.map((d) => Math.max(d.pageviews, d.visitors)));
    return max > 0 ? max * 1.15 : 100;
  }, [chartPoints]);

  const svgWidth = 1000;
  const svgHeight = 260;
  const paddingX = 40;
  const paddingBottom = 40;
  const paddingTop = 20;
  const usableW = svgWidth - paddingX * 2;
  const usableH = svgHeight - paddingTop - paddingBottom;

  const getPtX = (idx: number) => {
    if (chartPoints.length <= 1) return svgWidth / 2;
    return paddingX + (idx / (chartPoints.length - 1)) * usableW;
  };

  const getPtY = (val: number) => {
    return paddingTop + usableH - (val / maxVal) * usableH;
  };

  const getBezierPath = (pts: { x: number; y: number }[]) => {
    if (!pts.length) return "";
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
    let p = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      p += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
    }
    return p;
  };

  const pageviewPoints = chartPoints.map((d, i) => ({ x: getPtX(i), y: getPtY(d.pageviews) }));
  const visitorPoints = chartPoints.map((d, i) => ({ x: getPtX(i), y: getPtY(d.visitors) }));

  const pageviewLine = getBezierPath(pageviewPoints);
  const visitorLine = getBezierPath(visitorPoints);

  const baselineY = paddingTop + usableH;
  const pageviewArea = pageviewPoints.length
    ? `${pageviewLine} L ${pageviewPoints[pageviewPoints.length - 1].x},${baselineY} L ${pageviewPoints[0].x},${baselineY} Z`
    : "";
  const visitorArea = visitorPoints.length
    ? `${visitorLine} L ${visitorPoints[visitorPoints.length - 1].x},${baselineY} L ${visitorPoints[0].x},${baselineY} Z`
    : "";

  return (
    <div className="space-y-6 pb-12 font-sans animate-fade-in text-slate-100">
      {/* 1. Header Trang & Bộ Lọc Nhanh */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-slate-950/80 to-slate-900/90 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400 shadow-md shadow-sky-500/10">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Lưu Lượng Truy Cập & Phân Tích Web
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  mavrykpremium.com
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Dữ liệu đo lường hành vi người dùng, nguồn truy cập và hiệu suất website</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  {data?.source === "google_analytics_4" ? "Google Analytics 4 Live" : "Smart Fallback Engine (Active)"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Bộ lọc khoảng ngày */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 shadow-inner">
            {[
              { label: "24 Giờ", value: 1 },
              { label: "7 Ngày", value: 7 },
              { label: "14 Ngày", value: 14 },
              { label: "30 Ngày", value: 30 },
              { label: "90 Ngày", value: 90 },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setDays(item.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  days === item.value
                    ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchTrafficData(days)}
            disabled={loading}
            title="Làm mới dữ liệu"
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Hệ Thống 6 Thẻ KPI StatCard V2 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="Tổng Lượt Xem"
          value={data?.kpi?.pageviews || "0"}
          subtitle="Pageviews ghi nhận"
          icon={Eye}
          accent="purple"
          trend={
            data?.kpi
              ? {
                  value: data.kpi.pageviewsChange,
                  isPositive: !data.kpi.pageviewsChange.startsWith("-"),
                }
              : undefined
          }
        />
        <StatCard
          title="Khách Truy Cập"
          value={data?.kpi?.visitors || "0"}
          subtitle="Unique Active Users"
          icon={Users}
          accent="cyan"
          trend={
            data?.kpi
              ? {
                  value: data.kpi.visitorsChange,
                  isPositive: !data.kpi.visitorsChange.startsWith("-"),
                }
              : undefined
          }
        />
        <StatCard
          title="Tổng Số Phiên"
          value={data?.kpi?.sessions || "0"}
          subtitle="Total Web Sessions"
          icon={Activity}
          accent="emerald"
          trend={
            data?.kpi
              ? {
                  value: data.kpi.sessionsChange,
                  isPositive: !data.kpi.sessionsChange.startsWith("-"),
                }
              : undefined
          }
        />
        <StatCard
          title="Thời Lượng TB"
          value={data?.kpi?.avgDuration || "00m 00s"}
          subtitle="Avg Session Duration"
          icon={Clock}
          accent="amber"
          trend={
            data?.kpi
              ? {
                  value: data.kpi.avgDurationChange,
                  isPositive: !data.kpi.avgDurationChange.startsWith("-"),
                }
              : undefined
          }
        />
        <StatCard
          title="Tỷ Lệ Thoát"
          value={data?.kpi?.bounceRate || "0%"}
          subtitle="Bounce Rate phiên"
          icon={Percent}
          accent="rose"
          trend={
            data?.kpi
              ? {
                  value: data.kpi.bounceRateChange,
                  isPositive: data.kpi.bounceRateChange.startsWith("-"), // Thoát giảm là tốt (positive)
                }
              : undefined
          }
        />
        <StatCard
          title="Khách Quay Lại"
          value={data?.kpi?.returningRate || "0%"}
          subtitle="Returning Rate"
          icon={UserCheck}
          accent="fuchsia"
          trend={
            data?.kpi
              ? {
                  value: data.kpi.returningRateChange,
                  isPositive: !data.kpi.returningRateChange.startsWith("-"),
                }
              : undefined
          }
        />
      </div>

      {/* 3. Khối Biểu Đồ Trực Quan (SVG Native High-Performance) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ 1: Lưu Lượng Theo Thời Gian (Area Chart) */}
        <GlassCard className="lg:col-span-2 !p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Biến Động Lưu Lượng Theo Thời Gian</span>
                <span className="text-[11px] font-mono text-slate-400 font-normal">({chartPoints.length} mốc ngày)</span>
              </h2>
              <p className="text-xs text-slate-400">So sánh tương quan giữa Lượt xem trang (Pageviews) và Khách truy cập (Visitors)</p>
            </div>

            {/* Chú thích biểu đồ (Legend) */}
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
                <span className="text-indigo-300">Lượt Xem (Pageviews)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
                <span className="text-sky-300">Khách Truy Cập (Visitors)</span>
              </div>
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="relative w-full h-[260px] select-none">
            {chartPoints.length > 0 ? (
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  {/* Gradient Pageviews (Indigo/Purple) */}
                  <linearGradient id="trafficPvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Gradient Visitors (Sky/Cyan) */}
                  <linearGradient id="trafficVisGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Vạch lưới ngang mờ */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = paddingTop + usableH * (1 - pct);
                  const val = Math.round(maxVal * pct);
                  return (
                    <g key={idx}>
                      <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                      <text x={paddingX - 10} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" className="font-mono">
                        {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                      </text>
                    </g>
                  );
                })}

                {/* Vùng Area Gradient */}
                {pageviewArea && <path d={pageviewArea} fill="url(#trafficPvGrad)" />}
                {visitorArea && <path d={visitorArea} fill="url(#trafficVisGrad)" />}

                {/* Đường viền mượt Bezier */}
                {pageviewLine && <path d={pageviewLine} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />}
                {visitorLine && <path d={visitorLine} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />}

                {/* Nhãn ngày trục hoành (hiển thị thông minh) */}
                {chartPoints.map((pt, i) => {
                  const step = Math.max(1, Math.floor(chartPoints.length / 8));
                  const isVisible = i % step === 0 || i === chartPoints.length - 1;
                  if (!isVisible) return null;
                  const x = getPtX(i);
                  return (
                    <text key={i} x={x} y={svgHeight - 12} fill="#64748b" fontSize="11" textAnchor="middle" className="font-mono">
                      {pt.date}
                    </text>
                  );
                })}

                {/* Các điểm tròn tương tác khi hover */}
                {chartPoints.map((pt, i) => {
                  const pX = getPtX(i);
                  const isHovered = hoveredChartIdx === i;
                  return (
                    <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredChartIdx(i)} onMouseLeave={() => setHoveredChartIdx(null)}>
                      {/* Transparent hit target */}
                      <rect x={pX - usableW / (chartPoints.length * 2)} y={paddingTop} width={usableW / chartPoints.length} height={usableH} fill="transparent" />

                      {isHovered && (
                        <>
                          <line x1={pX} y1={paddingTop} x2={pX} y2={baselineY} stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                          <circle cx={pX} cy={getPtY(pt.pageviews)} r="5" fill="#818cf8" stroke="#ffffff" strokeWidth="2" />
                          <circle cx={pX} cy={getPtY(pt.visitors)} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">Đang tải dữ liệu biểu đồ...</div>
            )}

            {/* Hover Tooltip Box */}
            {hoveredChartIdx !== null && chartPoints[hoveredChartIdx] && (
              <div
                className="absolute z-30 pointer-events-none bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-xl text-xs space-y-1.5 transition-all"
                style={{
                  left: `${Math.min(80, Math.max(15, (getPtX(hoveredChartIdx) / svgWidth) * 100))}%`,
                  top: "20px",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-4 font-mono">
                  <span>Ngày {chartPoints[hoveredChartIdx].date}</span>
                  <span className="text-[10px] text-slate-400 font-sans">{chartPoints[hoveredChartIdx].sessions} phiên</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-indigo-300 font-medium">Lượt xem trang:</span>
                  <span className="font-bold font-mono text-white">{chartPoints[hoveredChartIdx].pageviews.toLocaleString("vi-VN")}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sky-300 font-medium">Khách truy cập:</span>
                  <span className="font-bold font-mono text-white">{chartPoints[hoveredChartIdx].visitors.toLocaleString("vi-VN")}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 border-t border-slate-800/80 pt-1">
                  <span>Tỷ lệ thoát: {chartPoints[hoveredChartIdx].bounceRate}%</span>
                  <span>TB: {chartPoints[hoveredChartIdx].avgDuration}</span>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Biểu đồ 2: Cơ Cấu Nguồn & Thiết Bị (Donut & Breakdown) */}
        <GlassCard className="!p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-sky-400" />
                <span>Nguồn Lưu Lượng Chính</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">Top kênh</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Tỷ trọng các kênh đóng góp lượt truy cập vào shop</p>

            {/* List Nguồn kèm thanh tiến độ */}
            <div className="space-y-3">
              {(data?.sourceData || []).map((src, idx) => {
                const colors = ["bg-sky-400", "bg-indigo-400", "bg-emerald-400", "bg-amber-400", "bg-pink-400"];
                const color = colors[idx % colors.length];
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200 truncate max-w-[190px]" title={src.name}>
                        {src.name}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400">{src.sessions.toLocaleString("vi-VN")}</span>
                        <span className="font-bold text-white">{src.share}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${src.share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Khách mới vs Khách cũ Mini Bar */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Cơ cấu khách hàng:</span>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-emerald-400">Mới: {data?.newVsReturning?.[0]?.share || 65}%</span>
                <span className="text-blue-400">Cũ: {data?.newVsReturning?.[1]?.share || 35}%</span>
              </div>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${data?.newVsReturning?.[0]?.share || 65}%` }} />
              <div className="h-full bg-blue-500 rounded-r-full transition-all" style={{ width: `${data?.newVsReturning?.[1]?.share || 35}%` }} />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 4. HỆ THỐNG 5 BẢNG STAT ĐẦY ĐỦ (Tabbed Multi-Dimension Tables) */}
      <GlassCard className="!p-6 space-y-5">
        {/* Header Tabs & Công Cụ (Search, Export) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          {/* 5 Tab chuyển đổi */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "daily", label: "Theo Ngày", icon: Calendar, count: data?.trafficData?.length || 0 },
              { id: "sources", label: "Nguồn & Kênh", icon: Share2, count: data?.sourceData?.length || 0 },
              { id: "pages", label: "Trang Phổ Biến", icon: FileText, count: data?.topPages?.length || 0 },
              { id: "devices", label: "Thiết Bị & Nền Tảng", icon: Monitor, count: data?.deviceData?.length || 0 },
              { id: "locations", label: "Vị Trí & Khu Vực", icon: MapPin, count: data?.locationData?.length || 0 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-sky-500/20 to-blue-500/20 text-sky-300 border border-sky-500/40 shadow-lg shadow-sky-500/10"
                      : "bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800/80"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isActive ? "bg-sky-500/30 text-white" : "bg-slate-800 text-slate-400"}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Ô Search & Nút Export CSV */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm trong bảng..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <button
              onClick={handleExportCSV}
              title="Xuất bảng ra file CSV"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-md shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
          </div>
        </div>

        {/* Nội Dung Bảng Tương Ứng Với Tab Được Chọn */}
        <div className="overflow-x-auto min-h-[320px]">
          {/* TAB 1: BẢNG THEO NGÀY */}
          {activeTab === "daily" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 font-bold cursor-pointer hover:text-white" onClick={() => handleSort("date")}>
                    <div className="flex items-center gap-1">
                      <span>Ngày</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("pageviews")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Lượt Xem (Views)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("visitors")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Khách (Users)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("sessions")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Số Phiên (Sessions)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("bounceRate")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Tỷ Lệ Thoát</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right">Thời Lượng TB</th>
                  <th className="py-3 px-4 font-bold text-center">Tỷ Trọng Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                {paginatedData.map((row: DailyTrafficItem, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-200">{row.date}</td>
                    <td className="py-3 px-4 text-right text-indigo-300 font-bold">{row.pageviews.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right text-sky-300 font-bold">{row.visitors.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{row.sessions.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${row.bounceRate > 45 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        {row.bounceRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-sans">{row.avgDuration}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden mx-auto">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(10, (row.pageviews / (maxVal || 1)) * 100))}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 2: BẢNG NGUỒN & KÊNH LƯU LƯỢNG */}
          {activeTab === "sources" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 font-bold">Kênh / Nguồn Lưu Lượng</th>
                  <th className="py-3 px-4 font-bold">Phân Loại (Channel)</th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("sessions")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Số Phiên (Sessions)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("users")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Người Dùng</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right">Khách Mới</th>
                  <th className="py-3 px-4 font-bold text-right">Tỷ Lệ Thoát</th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("share")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Tỷ Trọng (%)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedData.map((row: SourceItem, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                      <span>{row.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{row.channel || "Organic"}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">{row.sessions.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-sky-300">{row.users.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">{(row.newUsers || 0).toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">{row.bounceRate}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-md">
                        {row.share}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 3: BẢNG TRANG ĐÍCH PHỔ BIẾN */}
          {activeTab === "pages" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 font-bold">Đường Dẫn (URL Path)</th>
                  <th className="py-3 px-4 font-bold">Tiêu Đề Trang</th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("views")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Lượt Xem (Views)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("users")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Khách Xem</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right">Thời Lượng Trên Trang</th>
                  <th className="py-3 px-4 font-bold text-right">Tỷ Lệ Thoát</th>
                  <th className="py-3 px-4 font-bold text-center">Xem Web</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedData.map((row: TopPageItem, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-sky-400 max-w-[200px] truncate" title={row.path}>
                      {row.path}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium max-w-[260px] truncate" title={row.title}>
                      {row.title}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">{row.views.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">{row.users.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-amber-300">{row.time}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">{row.bounceRate}</td>
                    <td className="py-3 px-4 text-center">
                      <a
                        href={`https://mavrykpremium.com${row.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Mở trang trên web"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 4: BẢNG THIẾT BỊ & NỀN TẢNG */}
          {activeTab === "devices" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 font-bold">Loại Thiết Bị</th>
                  <th className="py-3 px-4 font-bold">Hệ Điều Hành (OS)</th>
                  <th className="py-3 px-4 font-bold">Trình Duyệt Chính</th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("sessions")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Số Phiên (Sessions)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("users")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Người Dùng</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("share")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Tỷ Trọng (%)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedData.map((row: DeviceItem, i) => {
                  const Icon = row.device.toLowerCase().includes("mobile") ? Smartphone : row.device.toLowerCase().includes("tablet") ? Tablet : Monitor;
                  return (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <Icon className="w-4 h-4 text-sky-400" />
                        <span>{row.device}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{row.os}</td>
                      <td className="py-3 px-4 text-slate-400">{row.browser}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">{row.sessions.toLocaleString("vi-VN")}</td>
                      <td className="py-3 px-4 text-right font-mono text-sky-300">{row.users.toLocaleString("vi-VN")}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-md">
                          {row.share}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* TAB 5: BẢNG KHU VỰC & ĐỊA LÝ */}
          {activeTab === "locations" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 font-bold">Tỉnh / Thành Phố</th>
                  <th className="py-3 px-4 font-bold">Quốc Gia</th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("sessions")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Số Phiên (Sessions)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("users")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Người Dùng</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-right cursor-pointer hover:text-white" onClick={() => handleSort("share")}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Tỷ Trọng (%)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedData.map((row: LocationItem, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span>{row.city}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{row.country}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">{row.sessions.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right font-mono text-sky-300">{row.users.toLocaleString("vi-VN")}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        {row.share}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {paginatedData.length === 0 && !loading && (
            <div className="py-12 text-center text-slate-500 text-sm">Không tìm thấy bản ghi nào phù hợp với bộ lọc tìm kiếm.</div>
          )}
        </div>

        {/* Thanh Phân Trang (Pagination) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs">
            <span className="text-slate-400">
              Hiển thị <span className="text-white font-mono font-bold">{(currentPage - 1) * pageSize + 1}</span> -{" "}
              <span className="text-white font-mono font-bold">{Math.min(currentPage * pageSize, processedTableData.length)}</span> trên tổng số{" "}
              <span className="text-white font-mono font-bold">{processedTableData.length}</span> bản ghi
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:text-slate-300 transition-all font-semibold"
              >
                Trước
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-7 h-7 rounded-lg font-mono text-xs font-bold transition-all ${
                    currentPage === pg ? "bg-sky-500 text-white shadow-md shadow-sky-500/20" : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:text-slate-300 transition-all font-semibold"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
