import React from "react";
import { Clock, RefreshCw, XCircle, AlertCircle } from "lucide-react";
import { ORDER_STATUS, getOrderStatusLabel } from "../constants/orderStatus";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const label = getOrderStatusLabel(status);

  switch (status) {
    case ORDER_STATUS.PAID:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {label}
        </span>
      );
    case ORDER_STATUS.RENEW_REQUIRED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10 whitespace-nowrap">
          <Clock className="w-3 h-3" />
          {label}
        </span>
      );
    case ORDER_STATUS.UNPAID:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10 whitespace-nowrap">
          <Clock className="w-3 h-3" />
          {label}
        </span>
      );
    case ORDER_STATUS.REFUNDED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/30 shadow-sm shadow-pink-500/10 whitespace-nowrap">
          <RefreshCw className="w-3 h-3 text-pink-400" />
          {label}
        </span>
      );
    case ORDER_STATUS.REFUND_PENDING:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10 whitespace-nowrap">
          <Clock className="w-3 h-3 text-purple-300" />
          {label}
        </span>
      );
    case ORDER_STATUS.EXPIRED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/30 whitespace-nowrap">
          <Clock className="w-3 h-3" />
          {label}
        </span>
      );
    case ORDER_STATUS.CANCELED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-500/10 whitespace-nowrap">
          <XCircle className="w-3 h-3" />
          {label}
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

