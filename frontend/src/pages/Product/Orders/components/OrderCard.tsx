/**
 * OrderCard Component
 * Mobile-friendly card view for orders
 */

import React from "react";
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { Order, ORDER_FIELDS, VIRTUAL_FIELDS } from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import { formatCurrency } from "../utils/ordersHelpers";

type OrderCardProps = {
  order: Order;
  showRemainingColumn: boolean;
  showActionButtons: boolean;
  isActiveDataset: boolean;
  isCanceled: boolean;
  renewingOrderCode: string | null;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onConfirmRefund?: (order: Order) => void;
  onMarkPaid?: (order: Order) => void;
  onRenew?: (order: Order) => void;
};

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  showRemainingColumn,
  showActionButtons,
  isActiveDataset,
  isCanceled,
  onView,
  onEdit,
  onDelete,
  onConfirmRefund,
}) => {
  const orderCode = order[ORDER_FIELDS.ID_ORDER] || "--";
  const customer = order[ORDER_FIELDS.CUSTOMER] || "--";
  const product = order[ORDER_FIELDS.ID_PRODUCT] || "--";
  const expiryDate = order[ORDER_FIELDS.ORDER_EXPIRED] || "";
  const status = order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "";
  const price = Number(order[ORDER_FIELDS.PRICE] || 0);
  const remaining = Number(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] || 0);

  const statusColors: Record<string, string> = {
    paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    unpaid: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    expired: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    canceled: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };

  const statusStr = String(status).toLowerCase();
  const statusColor = statusColors[statusStr] || "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";

  return (
    <div className="relative group overflow-hidden glass-panel rounded-[20px] p-3.5 transition-all duration-500 hover:border-indigo-500/30 shadow-xl border border-white/5">
      {/* Background Accent */}
      <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/5 rounded-full blur-2xl"></div>

      <div className="relative z-10 flex flex-col gap-3">
        {/* Row 1: ID & Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-[13px] font-bold text-white tracking-widest uppercase truncate shrink-0">
              {orderCode}
            </h3>
            <div className="h-3 w-px bg-white/10 shrink-0"></div>
            <p className="text-[11px] font-bold text-indigo-400/80 uppercase tracking-tight truncate">
              {product}
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${statusColor}`}>
            {status}
          </span>
        </div>

        {/* Row 2: Customer & Main Info */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest leading-none mb-1">Khách hàng</span>
            <p className="text-xs font-bold text-white truncate">{customer}</p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest leading-none mb-1 text-right">Giá</span>
            <p className="text-xs font-black text-white">{formatCurrency(price)}</p>
          </div>
        </div>

        {/* Row 3: Timelines & Quick Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Hạn đơn</span>
              <p className="text-[10px] font-bold text-indigo-200/80">
                {expiryDate ? Helpers.formatDateToDMY(expiryDate) : "—"}
              </p>
            </div>
            {showRemainingColumn && (
              <div className="flex flex-col border-l border-white/5 pl-3">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Còn</span>
                <p className={`text-[10px] font-black ${remaining <= 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {remaining} ngày
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons Group - Smaller */}
          {showActionButtons && (
            <div className="flex items-center gap-1.5">
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-indigo-300/40"
                onClick={() => onView(order)}
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              
              {onConfirmRefund && isCanceled && statusStr === "cho_hoan" && (
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  onClick={() => onConfirmRefund(order)}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                </button>
              )}

              {isActiveDataset && !isCanceled && (
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  onClick={() => onEdit(order)}
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
              
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-400/60"
                onClick={() => onDelete(order)}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
