import React, { useCallback } from "react";
import {
  ORDER_FIELDS,
  ORDER_STATUSES,
  VIRTUAL_FIELDS,
  Order,
} from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import {
  formatCurrency,
} from "../utils/ordersHelpers";
import {
  CheckCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type OrderRowProps = {
  order: Order;
  index: number;
  isExpanded: boolean;
  showRemainingColumn: boolean;
  showActionButtons: boolean;
  isCanceled: boolean;
  totalColumns: number;
  renewingOrderCode: string | null;
  onToggleDetails: (orderId: number) => void;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onConfirmRefund: (order: Order) => void;
  onMarkPaid: (order: Order) => void;
  onRenew: (order: Order) => void;
};

export const OrderRow = React.memo(function OrderRow({
  order,
  isExpanded,
  showRemainingColumn,
  showActionButtons,
  isCanceled,
  totalColumns,
  renewingOrderCode,
  onToggleDetails,
  onView,
  onEdit,
  onDelete,
  onConfirmRefund,
  onMarkPaid,
  onRenew,
}: OrderRowProps) {
  const {
    [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: soNgayConLai,
    [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: giaTriConLai,
    [VIRTUAL_FIELDS.TRANG_THAI_TEXT]: trangThaiText,
  } = order;

  const costValue = Number.isFinite(Number(order[ORDER_FIELDS.COST]))
    ? Number(order[ORDER_FIELDS.COST])
    : 0;
  const priceValue = Number.isFinite(Number(order[ORDER_FIELDS.PRICE]))
    ? Number(order[ORDER_FIELDS.PRICE])
    : 0;
  const giaTriConLaiSafe = Number.isFinite(Number(giaTriConLai))
    ? Number(giaTriConLai)
    : 0;
  const refundFromRow = Number.isFinite(Number(order.can_hoan))
    ? Number(order.can_hoan)
    : null;
  const giaTriConLaiForCanceled = isCanceled
    ? Math.max(
        0,
        refundFromRow !== null && Number.isFinite(giaTriConLaiSafe)
          ? Math.min(refundFromRow, giaTriConLaiSafe)
          : refundFromRow ?? giaTriConLaiSafe
      )
    : giaTriConLaiSafe;

  const pendingRefundStatus = ORDER_STATUSES.CHO_HOAN;
  const statusText = String(trangThaiText || "").trim();
  const canConfirmRefund = isCanceled && statusText === pendingRefundStatus;
  const canRenew =
    statusText === ORDER_STATUSES.CAN_GIA_HAN ||
    statusText === ORDER_STATUSES.ORDER_EXPIRED;
  const canStartProcessing = statusText === ORDER_STATUSES.CHUA_THANH_TOAN;
  const canMarkPaid = statusText === ORDER_STATUSES.DANG_XU_LY;

  const orderDateDisplay = order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] || "";
  const expiryDateDisplay = order[VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY] || "";
  const orderCodeText = String(order[ORDER_FIELDS.ID_ORDER] || "").trim();
  const isRenewing = renewingOrderCode === orderCodeText;

  const remainingValue = Number.isFinite(Number(soNgayConLai))
    ? Number(soNgayConLai)
    : 0;
  const remainingClass = isCanceled
    ? "text-indigo-600"
    : remainingValue <= 0
    ? "text-red-600"
    : remainingValue <= 4
    ? "text-orange-500"
    : "text-green-500";
  const remainingDisplay = isCanceled
    ? formatCurrency(giaTriConLaiForCanceled)
    : remainingValue;

  const handleToggle = useCallback(() => {
    if (order.id !== undefined && order.id !== null) {
      onToggleDetails(order.id);
    }
  }, [onToggleDetails, order.id]);

  const stopPropagation =
    (action: (targetOrder: Order) => void) =>
    (event: React.MouseEvent) => {
      event.stopPropagation();
      action(order);
    };

  return (
    <React.Fragment>
      <tr
        onClick={handleToggle}
        className={`group/row cursor-pointer transition-all duration-500 ${isExpanded ? "z-20" : "z-10"}`}
      >
        {/* 1. GỘP ORDER + PRODUCT */}
        <td className="px-5 py-5 first:rounded-l-[24px] last:rounded-r-[24px] glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
          <div className="flex flex-col items-center">
            <span className="text-xs sm:text-sm font-bold text-white tracking-normal sm:tracking-wider uppercase">
              {order[ORDER_FIELDS.ID_ORDER] || ""}
            </span>
            <span className="text-indigo-400/80 text-[10px] sm:text-[11px] font-bold mt-1 uppercase tracking-normal sm:tracking-wider">
              {order[ORDER_FIELDS.ID_PRODUCT] || ""}
            </span>
          </div>
        </td>

        {/* INFORMATION + SLOT (text-center) */}
        <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
          <div className="flex flex-col items-center">
            <span className="text-indigo-100/90 text-xs font-medium tracking-wide">
              {order[ORDER_FIELDS.INFORMATION_ORDER] || "—"}
            </span>
            {order[ORDER_FIELDS.SLOT] ? (
              <div className="mt-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-bold text-indigo-300/80 uppercase">
                {order[ORDER_FIELDS.SLOT]}
              </div>
            ) : null}
          </div>
        </td>

        {/* 2. GỘP CUSTOMER + CONTACT */}
        <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500">
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-white tracking-tight">
              {order[ORDER_FIELDS.CUSTOMER] || "Khách ẩn"}
            </span>
            <span className="text-white/60 text-[11px] font-medium mt-0.5 truncate max-w-[140px]">
              {order[ORDER_FIELDS.CONTACT] || ""}
            </span>
          </div>
        </td>

        {/* ORDER RANGE (text-center) */}
        <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-indigo-200">
            {orderDateDisplay || "—"}
            <span className="text-white/20">/</span>
            {expiryDateDisplay || "—"}
          </div>
        </td>
        {showRemainingColumn && (
          <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500 text-center">
            <span className={`text-sm font-black transition-all group-hover/row:scale-110 inline-block ${remainingClass}`}>
              {remainingDisplay}
            </span>
          </td>
        )}

        {/* STATUS (text-center) */}
        <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500 text-center">
          <span
            className={`inline-flex px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] whitespace-nowrap ${Helpers.getStatusColor(
              String(trangThaiText || "")
            )}`}
          >
            {String(trangThaiText || "")}
          </span>
        </td>
        {/* ACTION (text-right) */}
        <td className="px-5 py-5 glass-panel border-y border-white/5 group-hover/row:border-indigo-500/30 group-hover/row:bg-indigo-500/5 transition-all duration-500 last:rounded-r-[24px]">
          <div className="flex space-x-3 justify-end">
            <button
              onClick={stopPropagation(onView)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-indigo-300/60 hover:text-white hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            {canConfirmRefund && (
              <button
                onClick={stopPropagation(onConfirmRefund)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
                title="Xác nhận đã giải/hoàn tiền"
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
            )}
            {!isCanceled && (
              <>
                <button
                  onClick={stopPropagation(onEdit)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={stopPropagation(onDelete)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all"
                  title="Xoá đơn hàng"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="animate-in fade-in slide-in-from-top-2 duration-300">
          <td colSpan={totalColumns} className="px-6 pb-8 pt-2">
            <div className="rounded-[32px] glass-panel-light p-6 shadow-2xl border border-indigo-500/20">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex-1 text-center">
                  <p className="text-sm font-semibold text-indigo-50">
                    Chi tiết đơn hàng
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                    #{order[ORDER_FIELDS.ID_ORDER] || ""}
                  </p>
                </div>
                {showActionButtons && (
                  <div className="ml-4 flex items-center gap-2">
                    {canStartProcessing && (
                      <button
                        className="rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-900/40"
                        onClick={stopPropagation(onMarkPaid)}
                      >
                        Thanh Toán
                      </button>
                    )}
                    {canMarkPaid && (
                      <button
                        className="rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-900/40"
                        onClick={stopPropagation(onMarkPaid)}
                      >
                        Thanh Toán
                      </button>
                    )}
                    {canRenew && (
                      <button
                        className="rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-indigo-900/40 disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={isRenewing}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isRenewing) {
                            onRenew(order);
                          }
                        }}
                      >
                        {isRenewing ? "Đang Gia Hạn..." : "Gia Hạn"}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Nguồn
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {order[ORDER_FIELDS.SUPPLY] || "N/A"}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Giá nhập
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(costValue)}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Giá bán
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(priceValue)}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Giá trị còn lại
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(giaTriConLaiForCanceled)}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Số ngày
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {order[ORDER_FIELDS.DAYS] || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200/60 bg-indigo-500/20 p-3 text-center sm:col-span-2 lg:col-span-5 flex flex-col items-center justify-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                    Ghi chú
                  </p>
                  <p className="mt-1 text-sm text-indigo-50 text-center">
                    {order[ORDER_FIELDS.NOTE] || "Không có ghi chú."}
                  </p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

OrderRow.displayName = "OrderRow";



