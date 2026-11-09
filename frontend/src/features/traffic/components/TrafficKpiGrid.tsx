import React from "react";
import { Eye, Users, Activity, Clock, Percent, UserCheck, RefreshCw, Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Globe, Smartphone, Monitor, Tablet, ExternalLink, Calendar, Share2, FileText, MapPin, CheckCircle2, Info, BarChart3, Layers } from "lucide-react";
import { StatCard } from "@/shared/components/StatCard";
import { TrafficApiResponse } from "../types";

interface TrafficKpiGridProps {
  data: TrafficApiResponse | null;
}

export const TrafficKpiGrid: React.FC<TrafficKpiGridProps> = ({ data }) => (
  <>
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
  </>
);
