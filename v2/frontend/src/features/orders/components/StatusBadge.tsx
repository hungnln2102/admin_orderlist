import React from "react";
import { Clock, RefreshCw, XCircle, AlertCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case "Hoàn thành":
    case "Đã Thanh Toán":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Đã Thanh Toán
        </span>
      );
    case "Cần gia hạn":
    case "CẦN GIA HẠN":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10 whitespace-nowrap">
          <Clock className="w-3 h-3" />
          Cần Gia Hạn
        </span>
      );
    case "Chờ xử lý":
    case "Chưa Thanh Toán":
    case "Đang xử lý":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10 whitespace-nowrap">
          <Clock className="w-3 h-3" />
          {status}
        </span>
      );
    case "Đã Hoàn":
    case "Đã hoàn":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/30 shadow-sm shadow-pink-500/10 whitespace-nowrap">
          <RefreshCw className="w-3 h-3 text-pink-400" />
          Đã Hoàn Tiền
        </span>
      );
    case "Chưa Hoàn":
    case "Chưa hoàn":
    case "Chờ Hoàn":
    case "Chờ hoàn":
    case "Hoàn Tiền":
    case "Hoàn tiền":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10 whitespace-nowrap">
          <Clock className="w-3 h-3 text-purple-300" />
          Chưa Hoàn Tiền
        </span>
      );
    case "Đã Hủy":
    case "Hủy":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-500/10 whitespace-nowrap">
          <XCircle className="w-3 h-3" />
          Đã Hủy
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-300 border border-slate-500/30 whitespace-nowrap">
          <AlertCircle className="w-3 h-3" />
          {status || "Khác"}
        </span>
      );
  }
};

export function renderStatusBadge(status: string) {
  return <StatusBadge status={status} />;
}
