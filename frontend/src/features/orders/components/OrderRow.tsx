import React, { useCallback } from "react";
import {
  ORDER_FIELDS,
  ORDER_STATUSES,
  VIRTUAL_FIELDS,
  Order,
} from "@/constants";
import { getStatusColor } from "../status";
import { prefetchQrImage } from "@/components/modals/ViewOrderModal/components/OrderPaymentQrSection";
import { buildViewOrderPaymentQrPayload } from "@/components/modals/ViewOrderModal/paymentQr";
import { getOrderQrEligibility } from "@/components/modals/ViewOrderModal/qrEligibility";
import {
  formatCurrency,
  formatOrderCodeShort,
  isGiftOrderCode,
} from "../utils/ordersHelpers";
import { getOrderCodeTheme } from "../utils/orderCodeTheme";
import {
  CheckCircleIcon,
  EyeIcon,
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import OrderRowExpanded from "./order-row/OrderRowExpanded";

type OrderRowProps = {
  order: Order;
  index: number;
  isExpanded: boolean;
  showRemainingColumn: boolean;
  showSupplierRefundColumn: boolean;
  showActionButtons: boolean;
  isCanceled: boolean;
  canEdit: boolean;
  canRenewOrder: boolean;
  totalColumns: number;
  renewingOrderCode: string | null;
  completingOrderCode: string | null;
  onToggleDetails: (orderId: number) => void;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onConfirmRefund: (order: Order) => void;
  onCreateTopupOrderFromRefund: (order: Order) => void;
  onMarkPaid: (order: Order) => void;
  onRenew: (order: Order) => void;
};

export const OrderRow = React.memo(function OrderRow({
  order,
  isExpanded,
  showRemainingColumn,
  showSupplierRefundColumn,
  showActionButtons,
  isCanceled,
  canEdit,
  canRenewOrder,
  totalColumns,
  renewingOrderCode,
  completingOrderCode,
  onToggleDetails,
  onView,
  onEdit,
  onDelete,
  onConfirmRefund,
  onCreateTopupOrderFromRefund,
  onMarkPaid,
  onRenew,
}: OrderRowProps) {
  const {
    [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: soNgayConLai,
    [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: giaTriConLai,
    [VIRTUAL_FIELDS.HOAN_TU_NCC]: hoanTuNccRaw,
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
  const orderRecord = order as Record<string, unknown>;
  /** Tổng biên lai từ ngày đăng ký (SUM receipt có paid_date >= order_date); ưu tiên khi > 0 (2+ giao dịch cùng chu kỳ). */
  const totalWhRaw = orderRecord.total_webhook_amount;
  const latestWhRaw = orderRecord.latest_webhook_amount ?? orderRecord.webhook_amount;
  const parseWebhookMoney = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string" && v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const totalWh = parseWebhookMoney(totalWhRaw);
  const latestWh = parseWebhookMoney(latestWhRaw);
  /**
   * Sau gia hạn, order_date thường được kéo về sau; receipt cũ có paid_date < order_date mới
   * → total_webhook_amount = 0 dù webhook đã về. Trước đây UI ưu tiên total nên 0 − giá bán = chênh âm sai.
   */
  let webhookAmount: number | null = null;
  if (totalWh !== null && totalWh > 0) {
    webhookAmount = totalWh;
  } else if (latestWh !== null) {
    webhookAmount = latestWh;
  }
  const webhookDelta = webhookAmount !== null ? webhookAmount - priceValue : null;
  const webhookDeltaDisplay =
    webhookDelta !== null ? formatCurrency(webhookDelta) : "Chưa có webhook";
  const webhookDeltaClass =
    webhookDelta === null
      ? "text-indigo-100/80"
      : webhookDelta === 0
      ? "text-emerald-300"
      : webhookDelta > 0
      ? "text-amber-300"
      : "text-rose-300";
  /** Đã hủy: cột "Giá trị còn lại" = prorata theo giá bán; `refund` trên DB là theo vốn/NCC — không min với cột refund. */
  const giaTriConLaiForCanceled = isCanceled
    ? Math.max(0, giaTriConLaiSafe)
    : giaTriConLaiSafe;

  const pendingRefundStatus = ORDER_STATUSES.CHO_HOAN;
  const statusText = String(trangThaiText || "").trim();
  const canConfirmRefund = isCanceled && statusText === pendingRefundStatus;
  const canRenew =
    canRenewOrder &&
    statusText === ORDER_STATUSES.ORDER_EXPIRED;
  const canStartProcessing =
    statusText === ORDER_STATUSES.CHUA_THANH_TOAN ||
    statusText === ORDER_STATUSES.CAN_GIA_HAN;
  const canMarkPaid = statusText === ORDER_STATUSES.DANG_XU_LY;

  const orderDateDisplay = order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] || "";
  const expiryDateDisplay = order[VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY] || "";
  const orderCodeText = String(order[ORDER_FIELDS.ID_ORDER] || "").trim();
  const orderCodeDisplay = formatOrderCodeShort(orderCodeText);
  const orderTheme = getOrderCodeTheme(orderCodeText);
  const isRenewing = renewingOrderCode === orderCodeText;
  const isCompleting = completingOrderCode === orderCodeText;

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

  const hoanTuNccDisplay = Number.isFinite(Number(hoanTuNccRaw))
    ? formatCurrency(Number(hoanTuNccRaw))
    : formatCurrency(0);

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

  const cellClass = `order-row__cell px-2 sm:px-4 py-3 sm:py-5 glass-panel border-y transition-all duration-500 ${orderTheme.rowSurfaceClass}`;

  return (
    <React.Fragment>
      <tr
        onClick={handleToggle}
        className={`order-row ${isExpanded ? "order-row--expanded" : ""} group/row cursor-pointer transition-all duration-500 ${isExpanded ? "z-20" : "z-10"}`}
      >
        <td className={`${cellClass} first:rounded-l-[16px] sm:first:rounded-l-[24px] overflow-hidden max-w-0`}>
          <div className="flex flex-col items-center w-full">
            <span
              className="text-xs sm:text-sm font-bold text-white tracking-normal sm:tracking-wider uppercase truncate w-full block text-center"
              title={orderCodeText}
            >
              {orderCodeDisplay}
            </span>
            <span className={`${orderTheme.accentTextClass} text-[10px] sm:text-[11px] font-bold mt-1 uppercase tracking-normal sm:tracking-wider truncate w-full block text-center`}>
              {order[ORDER_FIELDS.ID_PRODUCT] || ""}
            </span>
          </div>
        </td>

        <td className={`${cellClass} overflow-hidden max-w-0`}>
          <div className="flex flex-col items-center w-full">
            <span className="text-indigo-100/90 text-xs font-medium tracking-wide text-center truncate w-full block">
              {order[ORDER_FIELDS.INFORMATION_ORDER] || "—"}
            </span>
            {order[ORDER_FIELDS.SLOT] ? (
              <div className={`mt-1 px-2 py-0.5 rounded-md border text-[11px] font-bold uppercase w-full truncate text-center block ${orderTheme.badgeClass} ${orderTheme.badgeTextClass}`}>
                {order[ORDER_FIELDS.SLOT]}
              </div>
            ) : null}
          </div>
        </td>

        <td className={`${cellClass} overflow-hidden max-w-0`}>
          <div className="flex flex-col items-center w-full">
            <span className="text-sm font-bold text-white tracking-tight truncate w-full block text-center">
              {order[ORDER_FIELDS.CUSTOMER] || "Khách ẩn"}
            </span>
            <span className="text-white/60 text-[11px] font-medium mt-0.5 truncate w-full block text-center">
              {order[ORDER_FIELDS.CONTACT] || ""}
            </span>
          </div>
        </td>

        <td className={`${cellClass} text-center`}>
          <div className="flex flex-col items-center gap-1 w-full min-w-0">
            <div className="inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-[11px] font-bold text-indigo-200 w-full max-w-full truncate">
              <span className="truncate">{orderDateDisplay || "—"}</span>
              <span className="text-white/20 shrink-0">/</span>
              <span className="truncate">{expiryDateDisplay || "—"}</span>
            </div>
            {isCanceled && (
              <span className="text-[10px] sm:text-[11px] font-semibold text-sky-300/95 tabular-nums leading-tight">
                {Number.isFinite(Number(soNgayConLai))
                  ? `${remainingValue} ngày`
                  : "—"}
              </span>
            )}
          </div>
        </td>
        {showRemainingColumn && (
          <td className={`${cellClass} text-center`}>
            <span className={`text-sm font-black transition-all group-hover/row:scale-110 inline-block w-full truncate ${remainingClass}`}>
              {remainingDisplay}
            </span>
          </td>
        )}
        {showSupplierRefundColumn && (
          <td className={`${cellClass} text-center`}>
            <span className="text-sm font-semibold text-violet-200/95 transition-all group-hover/row:scale-105 inline-block w-full truncate tabular-nums">
              {hoanTuNccDisplay}
            </span>
          </td>
        )}

        <td className={`${cellClass} text-center`}>
          <span
            className={`inline-block px-2 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-full border shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] whitespace-nowrap w-full truncate overflow-hidden text-ellipsis ${getStatusColor(
              String(trangThaiText || "")
            )}`}
          >
            {String(trangThaiText || "")}
          </span>
        </td>
        <td className={`order-row__actions px-2 sm:px-4 py-3 sm:py-5 glass-panel border-y transition-all duration-500 last:rounded-r-[16px] sm:last:rounded-r-[24px] ${orderTheme.rowSurfaceClass}`}>
          <div className="flex space-x-2 justify-end flex-shrink-0">
            <button
              onClick={stopPropagation(onView)}
              onMouseEnter={() => {
                const code = String(order[ORDER_FIELDS.ID_ORDER] || "");
                const qrEligibility = getOrderQrEligibility(statusText);
                if (!code) return;
                if (!qrEligibility.canUseQr) return;
                const { qrCodeImageUrl, effectiveQrAmount } =
                  buildViewOrderPaymentQrPayload({
                    order: order as Record<string, unknown>,
                    keepOrderPrice: false,
                    calculatedPrice: null,
                    isGift: isGiftOrderCode(code),
                  });
                if (qrCodeImageUrl && effectiveQrAmount > 0) {
                  prefetchQrImage(qrCodeImageUrl);
                }
              }}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-indigo-300/60 hover:text-white hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all flex-shrink-0"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            {canConfirmRefund && (
              <button
                onClick={stopPropagation(onCreateTopupOrderFromRefund)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-all flex-shrink-0"
                title="Tạo đơn bù từ credit hoàn tiền"
              >
                <PlusCircleIcon className="h-4 w-4" />
              </button>
            )}
            {canConfirmRefund && (
              <button
                onClick={stopPropagation(onConfirmRefund)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all flex-shrink-0"
                title="Xác nhận đã giải/hoàn tiền"
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
            )}
            {canEdit && !isCanceled && (
              <>
                <button
                  onClick={stopPropagation(onEdit)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all flex-shrink-0"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={stopPropagation(onDelete)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all flex-shrink-0"
                  title="Xoá đơn hàng"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      <OrderRowExpanded
        isExpanded={isExpanded}
        totalColumns={totalColumns}
        order={order}
        orderTheme={orderTheme}
        showActionButtons={showActionButtons}
        canStartProcessing={canStartProcessing}
        canMarkPaid={canMarkPaid}
        canRenew={canRenew}
        isCompleting={isCompleting}
        isRenewing={isRenewing}
        showSupplierRefundColumn={showSupplierRefundColumn}
        costValue={costValue}
        priceValue={priceValue}
        giaTriConLaiForCanceled={giaTriConLaiForCanceled}
        webhookDeltaClass={webhookDeltaClass}
        webhookDeltaDisplay={webhookDeltaDisplay}
        hoanTuNccDisplay={hoanTuNccDisplay}
        formatCurrency={formatCurrency}
        stopPropagation={stopPropagation}
        onMarkPaid={onMarkPaid}
        onRenew={onRenew}
      />
    </React.Fragment>
  );
});

OrderRow.displayName = "OrderRow";
