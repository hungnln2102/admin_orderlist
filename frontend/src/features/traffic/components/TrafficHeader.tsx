import React from "react";
import { Eye, Users, Activity, Clock, Percent, UserCheck, RefreshCw, Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Globe, Smartphone, Monitor, Tablet, ExternalLink, Calendar, Share2, FileText, MapPin, CheckCircle2, Info, BarChart3, Layers } from "lucide-react";

interface TrafficHeaderProps {
  days: number;
  setDays: React.Dispatch<React.SetStateAction<number>>;
  fetchTrafficData: (days?: number) => void;
  loading: boolean;
}

export const TrafficHeader: React.FC<TrafficHeaderProps> = ({ days, setDays, fetchTrafficData, loading }) => (
  <>
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
                  Google Analytics 4 Live
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
  </>
);
