import React, { useMemo } from "react";
import * as Helpers from "../../../lib/helpers";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ORDER_FIELDS, VIRTUAL_FIELDS } from "../../../constants";
import { ACCOUNT_NAME, ACCOUNT_NO, BANK_SHORT_CODE } from "./constants";
import { useCalculatedPrice } from "./hooks/useCalculatedPrice";
import { ViewOrderModalProps } from "./types";
import { normalizeDateLike, parseNumberLike } from "./utils";
import { OrderDetailsSection } from "./components/OrderDetailsSection";
import { OrderPaymentQrSection } from "./components/OrderPaymentQrSection";

const ViewOrderModal: React.FC<ViewOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  formatCurrency,
  keepOrderPrice = false,
}) => {
  const orderId = order?.[ORDER_FIELDS.ID_ORDER] as string | undefined;
  const productName = order?.[ORDER_FIELDS.ID_PRODUCT] as string | undefined;
  const variantId = order?.variant_id;
  const basePrice = Number(order?.[ORDER_FIELDS.PRICE]) || 0;
  const supplyName = (order?.[ORDER_FIELDS.SUPPLY] as string) || "";
  const customerType = order?.customer_type || supplyName || "";
  const orderDateRaw =
    order?.registration_date ||
    (order?.[ORDER_FIELDS.ORDER_DATE] as string) ||
    "";
  const normalizedOrderDate =
    Helpers.convertDMYToYMD(
      Helpers.formatDateToDMY(orderDateRaw) || orderDateRaw
    ) || null;

  const { calculatedPrice, priceLoading, priceError } = useCalculatedPrice({
    isOpen,
    orderId,
    productName,
    variantId,
    customerType,
    basePrice,
    normalizedOrderDate,
    skipRecalc: keepOrderPrice,
  });

  // QR luôn dùng giá đơn hàng (số tiền lưu trong đơn)
  const orderAmount = useMemo(
    () => Math.max(0, Number(order?.[ORDER_FIELDS.PRICE]) || 0),
    [order]
  );

  // Giá bán hiển thị: sau khi tạo đơn = giữ theo form; bấm icon xem = giá tính lại
  const displayAmount = keepOrderPrice
    ? orderAmount
    : (calculatedPrice ?? orderAmount);
  const effectiveQrAmount = Helpers.roundGiaBanValue(displayAmount);

  if (!isOpen || !order) return null;

  const displayStatus =
    String(
      order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] ||
        order.trangThaiText ||
        order[ORDER_FIELDS.STATUS] ||
        ""
    ).trim() || "Chưa Thanh Toán";

  const remainingFromBackend =
    order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] !== undefined &&
    order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] !== null
      ? Number(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI])
      : null;
  const remainingFromRaw = parseNumberLike(
    (order as Record<string, unknown>).so_ngay_con_lai
  );
  const expirySource = normalizeDateLike(
    order.expiry_date ||
      order.expiry_date_display ||
      order[VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY] ||
      (order[ORDER_FIELDS.EXPIRY_DATE] as string | null)
  );

  const fallbackRemaining =
    Helpers.daysUntilDate(expirySource) ??
    parseNumberLike(order[ORDER_FIELDS.DAYS]);
  const displayRemainingDays =
    remainingFromBackend !== null && Number.isFinite(remainingFromBackend)
      ? remainingFromBackend
      : remainingFromRaw ?? fallbackRemaining ?? 0;

  const registrationSource = normalizeDateLike(
    order.registration_date_display ||
      order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] ||
      order.registration_date ||
      (order[ORDER_FIELDS.ORDER_DATE] as string | null)
  );

  const registrationDisplay =
    (order.registration_date_display ||
      order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] ||
      Helpers.formatDateToDMY(registrationSource) ||
      String((order[ORDER_FIELDS.ORDER_DATE] as string) || "")) ??
    "";
  const expiryDisplay =
    order.expiry_date_display ||
    order[VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY] ||
    Helpers.formatDateToDMY(expirySource) ||
    String((order[ORDER_FIELDS.EXPIRY_DATE] as string) || "");

  const qrMessage = String(order[ORDER_FIELDS.ID_ORDER] || "");
  const qrCodeImageUrl = Helpers.buildSepayQrUrl({
    accountNumber: ACCOUNT_NO,
    bankCode: BANK_SHORT_CODE,
    amount: effectiveQrAmount,
    description: qrMessage,
    accountName: ACCOUNT_NAME,
  });

  return (
    <div
      className="view-order-modal fixed inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 p-2 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="view-order-modal__container bg-slate-900/90 border border-white/10 rounded-lg shadow-[0_18px_48px_-28px_rgba(0,0,0,0.8)] w-full max-w-3xl transform transition-all duration-300 scale-100 max-h-[98vh] sm:max-h-[95vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="view-order-modal__header flex justify-center items-center p-3 sm:p-4 border-b bg-slate-800/80 rounded-t-lg sticky top-0 z-10">
          <h3 className="view-order-modal__title text-lg sm:text-xl font-semibold text-white">
            Chi tiết đơn hàng:{" "}
            <span className="text-blue-600">{order[ORDER_FIELDS.ID_ORDER]}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="view-order-modal__body p-3 sm:p-6 overflow-y-auto flex-grow space-y-4 sm:space-y-5 text-gray-700">
          <OrderDetailsSection
            order={order}
            displayStatus={displayStatus}
            registrationDisplay={registrationDisplay}
            expiryDisplay={expiryDisplay}
            displayRemainingDays={displayRemainingDays}
          />

          <hr className="my-4 border-white/10" />

          <OrderPaymentQrSection
            orderId={String(order[ORDER_FIELDS.ID_ORDER] || "")}
            qrCodeImageUrl={qrCodeImageUrl}
            effectiveQrAmount={effectiveQrAmount}
            qrMessage={qrMessage}
            keepOrderPrice={keepOrderPrice}
            priceLoading={priceLoading}
            priceError={priceError}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>
    </div>
  );
};

export default ViewOrderModal;
