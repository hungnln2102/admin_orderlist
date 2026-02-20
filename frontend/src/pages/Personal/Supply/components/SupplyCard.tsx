import React from "react";
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  PowerIcon,
} from "@heroicons/react/24/outline";
import { Supply } from "../types";
import * as Helpers from "../../../../lib/helpers";

interface SupplyCardProps {
  supply: Supply;
  onToggleStatus: (supply: Supply) => void;
  onView: (supply: Supply) => void;
  onEdit: (supply: Supply) => void;
  onDelete: (supply: Supply) => void;
}

const formatCurrency = Helpers.formatCurrency;
const formatDate = (date: string | null) =>
  date ? Helpers.formatDateToDMY(date) : "--";

export const SupplyCard: React.FC<SupplyCardProps> = ({
  supply,
  onToggleStatus,
  onView,
  onEdit,
  onDelete,
}) => {
  const statusColor = supply.isActive
    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    : "bg-slate-500/20 text-slate-300 border-slate-500/30";

  return (
    <div className="relative group overflow-hidden glass-panel rounded-[24px] p-4 transition-all duration-500 hover:border-indigo-500/40 shadow-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl hover:bg-slate-900/50">
      {/* Glow Effect */}
      <div
        className={`absolute -right-10 -top-10 w-28 h-28 rounded-full blur-3xl opacity-10 transition-all duration-700 group-hover:opacity-20 ${
          supply.isActive ? "bg-emerald-500" : "bg-slate-500"
        }`}
      ></div>

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header: Name & Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
            <h3 className="text-sm font-bold text-white truncate">
              {supply.sourceName || "Không Tên"}
            </h3>
          </div>
          <span
            className={`px-2.5 py-1 shrink-0 rounded-xl text-[10px] font-bold uppercase tracking-wide border shadow-lg ${statusColor}`}
          >
            {supply.isActive ? "Hoạt động" : "Tạm dừng"}
          </span>
        </div>

        {/* Bank Info */}
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
          <CreditCardIcon className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-0.5">
              Tài khoản
            </span>
            <p className="text-sm font-bold text-white truncate">
              {supply.numberBank || "--"}
            </p>
            <p className="text-xs text-indigo-200/70 truncate">
              {supply.bankName}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col p-2.5 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
              Tháng này
            </span>
            <div className="flex items-center gap-1.5">
              <ShoppingBagIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-white">
                {supply.monthlyOrders} đơn
              </span>
            </div>
            <span className="text-[10px] font-medium text-emerald-400/80 mt-0.5 ml-5">
              {formatCurrency(supply.monthlyImportValue)}
            </span>
          </div>

          <div className="flex flex-col p-2.5 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
              Công nợ
            </span>
            <div className="flex items-center gap-1.5">
              <CurrencyDollarIcon className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-bold text-orange-400">
                {formatCurrency(Math.min(0, supply.totalUnpaidImport || 0))}
              </span>
            </div>
            <span className="text-[10px] font-medium text-white/40 mt-0.5 ml-5">
              Đã trả: {formatCurrency(supply.totalPaidImport)}
            </span>
          </div>
        </div>

        {/* Footer: Timeline & Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-1">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
                Lần cuối
              </span>
              <p className="text-[11px] font-bold text-slate-300 tabular-nums">
                {formatDate(supply.lastOrderDate)}
              </p>
            </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleStatus(supply)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all active:scale-90 ${
                supply.isActive
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                  : "bg-white/5 border-white/10 text-white/30 hover:bg-white/10 hover:text-white"
              }`}
            >
              <PowerIcon className="h-4 w-4" />
            </button>

            <button
              onClick={() => onView(supply)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all active:scale-90"
            >
              <EyeIcon className="h-4 w-4" />
            </button>

            <button
              onClick={() => onEdit(supply)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white transition-all active:scale-90"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>

            <button
              onClick={() => onDelete(supply)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all active:scale-90"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
