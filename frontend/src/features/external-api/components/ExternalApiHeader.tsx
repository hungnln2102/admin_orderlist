import React from "react";
import { Server, CheckCircle2, AlertTriangle, Layers, RefreshCw, Cpu } from "lucide-react";
import { StatCard } from "@/shared/components/StatCard";

interface ExternalApiHeaderProps {
  totalProviders: number;
  configuredCount: number;
  unconfiguredCount: number;
  totalSlots: number;
  refreshing: boolean;
  onRefresh: () => void;
}

export const ExternalApiHeader: React.FC<ExternalApiHeaderProps> = ({
  totalProviders,
  configuredCount,
  unconfiguredCount,
  totalSlots,
  refreshing,
  onRefresh,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Cpu className="w-3.5 h-3.5" />
              OTP & API Gateway
            </span>
            <span className="text-xs text-slate-500 font-mono">v2.0 • Microservice Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Cấu Hình API
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Hạ tầng kết nối dịch vụ OTP, xác thực tự động và điều hướng cổng phân phối mã. Thông số kết nối bảo mật được quản lý độc lập tại biến môi trường hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 hover:text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-black/20 hover:shadow-cyan-500/10 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 transition-transform duration-500 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`} />
            <span>{refreshing ? "Đang đồng bộ..." : "Làm mới"}</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Tổng Provider"
          value={totalProviders}
          subtitle="Dịch vụ tích hợp"
          icon={Server}
          accent="cyan"
        />
        <StatCard
          title="Sẵn Sàng"
          value={configuredCount}
          subtitle="Đã nạp secret môi trường"
          icon={CheckCircle2}
          accent="emerald"
        />
        <StatCard
          title="Chưa Cấu Hình"
          value={unconfiguredCount}
          subtitle="Chờ thiết lập env"
          icon={AlertTriangle}
          accent="amber"
        />
        <StatCard
          title="Cổng Input OTP"
          value={totalSlots}
          subtitle="Slots đang điều hướng"
          icon={Layers}
          accent="purple"
        />
      </div>
    </div>
  );
};

