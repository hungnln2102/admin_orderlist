import React, { useState, useEffect, useMemo } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { TablePagination } from "@/shared/components/TablePagination";
import { StatCard } from "@/shared/components/StatCard";
import { useTrafficData } from "./hooks/useTrafficData";
import { TrafficHeader } from "./components/TrafficHeader";
import { TrafficKpiGrid } from "./components/TrafficKpiGrid";
import { TrafficChart } from "./components/TrafficChart";
import { TrafficDataTable } from "./components/TrafficDataTable";
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

import { DailyTrafficItem, DeviceItem, LocationItem, SourceItem, TopPageItem, TrafficApiResponse } from "./types";
export const TrafficPage: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const { data, loading, errorMsg, refresh: fetchTrafficData } = useTrafficData(days);

  // Active Tab cho 5 bảng stat
  const [activeTab, setActiveTab] = useState<"daily" | "sources" | "pages" | "devices" | "locations">("daily");

  // Search filter trong bảng
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Sắp xếp bảng
  const [sortField, setSortField] = useState<string>("views");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Hover index trên biểu đồ SVG
  const [hoveredChartIdx, setHoveredChartIdx] = useState<number | null>(null);

  // Fetch dữ liệu Traffic


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
    if (data?.available === false || !processedTableData.length) return;
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
    if (!chartPoints.length) return 5;
    const max = Math.max(...chartPoints.map((d) => Math.max(d.pageviews, d.visitors)));
    return max > 0 ? Math.max(5, Math.ceil(max * 1.25)) : 5;
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

  if (data?.available === false) {
    return (
      <div className="space-y-6 pb-12 font-sans animate-fade-in text-slate-100">
        <GlassCard className="border-amber-500/40 bg-amber-500/10">
          <div className="flex items-start gap-3 p-5 text-amber-100">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h1 className="font-bold">Google Analytics chưa khả dụng</h1>
              <p className="mt-1 text-sm text-amber-100/80">{data.reason || "Hệ thống chưa có dữ liệu đo lường đã xác minh."}</p>
              <button onClick={() => fetchTrafficData(days)} disabled={loading} className="mt-4 rounded-lg border border-amber-300/40 px-3 py-2 text-sm font-semibold hover:bg-amber-100/10 disabled:opacity-50">
                {loading ? "Đang tải..." : "Thử lại"}
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }
  const pageviewArea = pageviewPoints.length
    ? `${pageviewLine} L ${pageviewPoints[pageviewPoints.length - 1].x},${baselineY} L ${pageviewPoints[0].x},${baselineY} Z`
    : "";
  const visitorArea = visitorPoints.length
    ? `${visitorLine} L ${visitorPoints[visitorPoints.length - 1].x},${baselineY} L ${visitorPoints[0].x},${baselineY} Z`
    : "";

  return (
    <div className="space-y-6 pb-12 font-sans animate-fade-in text-slate-100">
      <TrafficHeader days={days} setDays={setDays} fetchTrafficData={fetchTrafficData} loading={loading} />
      <TrafficKpiGrid data={data} />
      <TrafficChart data={data} days={days} chartPoints={chartPoints} hoveredChartIdx={hoveredChartIdx} setHoveredChartIdx={setHoveredChartIdx} maxVal={maxVal} getPtX={getPtX} getPtY={getPtY} pageviewLine={pageviewLine} visitorLine={visitorLine} baselineY={baselineY} pageviewArea={pageviewArea} visitorArea={visitorArea} />
      <TrafficDataTable data={data} activeTab={activeTab} setActiveTab={setActiveTab} searchTerm={searchTerm} setSearchTerm={setSearchTerm} handleExportCSV={handleExportCSV} handleSort={handleSort} paginatedData={paginatedData} loading={loading} totalPages={totalPages} currentPage={currentPage} pageSize={pageSize} setCurrentPage={setCurrentPage} setPageSize={setPageSize} maxVal={maxVal} />
    </div>
  );
};
