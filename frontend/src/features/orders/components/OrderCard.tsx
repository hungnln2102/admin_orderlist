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
import { Order, ORDER_FIELDS, ORDER_STATUSES, VIRTUAL_FIELDS } from "@/constants";
import * as Helpers from "@/lib/helpers";
import { formatCurrency, formatOrderCodeShort } from "../utils/ordersHelpers";
import { getOrderCodeTheme } from "../utils/orderCodeTheme";

type OrderCardProps = {
  order: Order;
  showRemainingColumn: boolean;
  showSupplierRefundColumn: boolean;
  showActionButtons: boolean;
  isCanceled: boolean;
  canEdit: boolean;
  canRenewOrder: boolean;
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
  showSupplierRefundColumn,
  showActionButtons,
  isCanceled,
  canEdit,
  canRenewOrder,
  renewingOrderCode,
  onView,
  onEdit,
  onDelete,
  onConfirmRefund,
  onMarkPaid,
  onRenew,
}) => {
  const orderCode = order[ORDER_FIELDS.ID_ORDER] || "--";
  const customer = order[ORDER_FIELDS.CUSTOMER] || "--";
  const product = order[ORDER_FIELDS.ID_PRODUCT] || "--";
  const supply = order[ORDER_FIELDS.SUPPLY] || "";
  const expiryDate = order[ORDER_FIELDS.EXPIRY_DATE] || "";
  const status = order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "";
  const price = Number(order[ORDER_FIELDS.PRICE] || 0);
  const remaining = Number(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] || 0);
  const hoanTuNcc = Number(order[VIRTUAL_FIELDS.HOAN_TU_NCC] || 0);

  const statusColors: Record<string, string> = {
    [ORDER_STATUSES.DA_THANH_TOAN]: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    [ORDER_STATUSES.CHUA_THANH_TOAN]: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    [ORDER_STATUSES.ORDER_EXPIRED]: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    [ORDER_STATUSES.CAN_GIA_HAN]: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    [ORDER_STATUSES.CHO_HOAN]: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    [ORDER_STATUSES.DA_HOAN]: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    [ORDER_STATUSES.DANG_XU_LY]: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  };

  const statusText = String(status || "").trim();
  const statusColor = statusColors[statusText] || "bg-slate-500/20 text-slate-300 border-slate-500/30";
  const statusStr = statusText;

  // Determine which action buttons to show (matching OrderRow logic)
  const orderCodeText = String(order[ORDER_FIELDS.ID_ORDER] || "").trim();
  const orderCodeDisplay = formatOrderCodeShort(orderCodeText);
  const orderTheme = getOrderCodeTheme(orderCodeText);
  const canRenew =
    canRenewOrder &&
    (statusText === ORDER_STATUSES.CAN_GIA_HAN ||
      statusText === ORDER_STATUSES.ORDER_EXPIRED);
  const canStartProcessing = statusText === ORDER_STATUSES.CHUA_THANH_TOAN;
  const canMarkPaid = statusText === ORDER_STATUSES.DANG_XU_LY;
  const isRenewing = renewingOrderCode === orderCodeText;

  return (
    <div className={`order-card relative group overflow-hidden glass-panel rounded-[24px] p-4 transition-all duration-500 shadow-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl ${orderTheme.cardSurfaceClass}`}>
      <div className={`order-card__glow absolute -right-10 -top-10 w-28 h-28 rounded-full blur-3xl opacity-10 transition-all duration-700 group-hover:opacity-20 ${orderTheme.glowClass}`}></div>

      <div className="order-card__inner relative z-10 flex flex-col gap-4">
        <div className="order-card__header flex flex-col gap-2.5">
          <div className="order-card__title-row flex items-center gap-2">
            <span className={`order-card__dot w-1.5 h-1.5 rounded-full ${orderTheme.dotClass}`}></span>
            <h3
              className="order-card__title text-[12px] sm:text-sm font-bold text-white tracking-widest uppercase truncate leading-none"
              title={orderCodeText}
            >
              {orderCodeDisplay || orderCode}
            </h3>
          </div>
          <div className="order-card__tags flex items-center flex-wrap gap-2">
            <div className={`order-card__product-tag inline-flex self-start px-2.5 py-1 rounded-lg border backdrop-blur-md min-w-0 ${orderTheme.tagClass}`}>
              <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wide truncate max-w-[140px] sm:max-w-[200px] ${orderTheme.tagTextClass}`}>
                {product}
              </p>
            </div>
            {supply && (
              <div className={`order-card__supply-tag inline-flex self-start px-2.5 py-1 rounded-lg border backdrop-blur-md min-w-0 ${orderTheme.tagClass}`}>
                <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wide truncate max-w-[120px] sm:max-w-[160px] ${orderTheme.tagTextClass}`}>
                  NCC: {supply}
                </p>
              </div>
            )}
          </div>
          <div className="order-card__status-row flex items-center justify-between gap-2">
            <span className={`order-card__status px-2.5 py-1 shrink-0 rounded-xl text-[10px] font-bold uppercase tracking-wide border shadow-lg ${statusColor}`}>
              {status}
            </span>
            {showActionButtons && (canStartProcessing || canMarkPaid || canRenew) && (
              <div className="flex items-center gap-2">
                {canStartProcessing && onMarkPaid && (
                  <button
                    className="inline-flex whitespace-nowrap px-2.5 py-0.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 uppercase tracking-wide transition-all hover:bg-emerald-500/30 active:scale-95 shadow-lg"
                    onClick={(e) => { e.stopPropagation(); onMarkPaid(order); }}
                  >
                    Thanh Toán
                  </button>
                )}
                {canMarkPaid && onMarkPaid && (
                  <button
                    className="inline-flex whitespace-nowrap px-2.5 py-0.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase tracking-wide transition-all hover:bg-amber-500/30 active:scale-95 shadow-lg"
                    onClick={(e) => { e.stopPropagation(); onMarkPaid(order); }}
                  >
                    Hoàn Thành
                  </button>
                )}
                {canRenew && onRenew && (
                  <button
                    className="inline-flex whitespace-nowrap px-2.5 py-0.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-[10px] font-bold text-blue-300 uppercase tracking-wide transition-all hover:bg-blue-500/30 active:scale-95 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={isRenewing}
                    onClick={(e) => { e.stopPropagation(); if (!isRenewing) onRenew(order); }}
                  >
                    {isRenewing ? "Đang Gia Hạn..." : "Gia Hạn"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`order-card__info flex items-center justify-between gap-4 p-3.5 rounded-2xl border backdrop-blur-sm transition-colors ${orderTheme.infoPanelClass}`}>
          <div className="order-card__customer flex flex-col min-w-0">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Khách hàng</span>
            <p className="text-[13px] font-bold text-white truncate">{customer}</p>
          </div>
          <div className="order-card__price flex flex-col items-end shrink-0 pl-4 border-l border-white/10">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Tổng tiền</span>
            <p className={`text-sm sm:text-base font-black tabular-nums ${orderTheme.priceTextClass}`}>
              {formatCurrency(price)}
            </p>
          </div>
        </div>

        <div className="order-card__footer flex items-center justify-between pt-1">
          <div className="order-card__timeline flex items-center gap-4">
            <div className="order-card__timeline-item flex flex-col min-w-0">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
                {isCanceled ? "Thời hạn" : "Hạn đơn"}
              </span>
              {isCanceled ? (
                <>
                  <p className="text-[11px] font-bold text-slate-300 tabular-nums leading-tight">
                    {order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] || "—"}
                    <span className="text-white/25 mx-0.5">/</span>
                    {order[VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY] ||
                      (expiryDate ? Helpers.formatDateToDMY(expiryDate) : "—")}
                  </p>
                  <p className="text-[10px] font-semibold text-sky-300/95 mt-0.5 tabular-nums">
                    {Number.isFinite(remaining) ? `${remaining} ngày còn lại` : "—"}
                  </p>
                </>
              ) : (
                <p className="text-[11px] font-bold text-slate-300 tabular-nums">
                  {expiryDate ? Helpers.formatDateToDMY(expiryDate) : "—"}
                </p>
              )}
            </div>
            {showRemainingColumn && (
              <div className="order-card__timeline-item flex flex-col border-l border-white/10 pl-4">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
                  {isCanceled ? "Giá trị còn" : "Còn"}
                </span>
                <p
                  className={`text-[11px] font-black tabular-nums transition-all ${
                    isCanceled
                      ? "text-indigo-200"
                      : remaining <= 3
                        ? "text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]"
                        : "text-emerald-400"
                  }`}
                >
                  {isCanceled
                    ? formatCurrency(Number(order[VIRTUAL_FIELDS.GIA_TRI_CON_LAI] || 0))
                    : `${remaining} ngày`}
                </p>
              </div>
            )}
            {showSupplierRefundColumn && (
              <div className="order-card__timeline-item flex flex-col border-l border-white/10 pl-4">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
                  Hoàn NCC
                </span>
                <p className="text-[11px] font-black tabular-nums text-violet-300">
                  {formatCurrency(hoanTuNcc)}
                </p>
              </div>
            )}
          </div>

          {showActionButtons && (
            <div className="order-card__actions flex items-center gap-2">
              <button
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-90"
                onClick={() => onView(order)}
                title="Xem"
              >
                <EyeIcon className="h-5 w-5" />
              </button>
              
              {onConfirmRefund && isCanceled && statusStr === "cho_hoan" && (
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-90"
                  onClick={() => onConfirmRefund(order)}
                >
                  <CheckCircleIcon className="h-5 w-5" />
                </button>
              )}

              {canEdit && !isCanceled && (
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-90"
                  onClick={() => onEdit(order)}
                  title="Sửa"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              )}

              {canEdit && !isCanceled && (
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500/70 hover:bg-rose-500 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-90"
                  onClick={() => onDelete(order)}
                  title="Xóa"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
