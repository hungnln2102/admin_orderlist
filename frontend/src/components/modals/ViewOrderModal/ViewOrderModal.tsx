import React, { useMemo } from "react";
import * as Helpers from "../../../lib/helpers";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ORDER_FIELDS, VIRTUAL_FIELDS } from "../../../constants";
import { ACCOUNT_NAME, ACCOUNT_NO, BANK_SHORT_CODE } from "./constants";
import { useCalculatedPrice } from "./hooks/useCalculatedPrice";
import { ViewOrderModalProps } from "./types";
import { normalizeDateLike, parseNumberLike } from "./utils";

const ViewOrderModal: React.FC<ViewOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  formatCurrency,
}) => {
  const orderId = order?.[ORDER_FIELDS.ID_ORDER] as string | undefined;
  const productName = order?.[ORDER_FIELDS.ID_PRODUCT] as string | undefined;
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
    customerType,
    basePrice,
    normalizedOrderDate,
  });

  // QR code luôn dùng giá đơn hàng (số tiền khách cần thanh toán), không dùng giá tính lại từ API
  // (tránh trường hợp thêm nguồn mới → API trả giá bảng giá mới → QR sai so với giá đã nhập)
  const qrAmountFromOrder = useMemo(
    () => Math.max(0, Number(order?.[ORDER_FIELDS.PRICE]) || 0),
    [order]
  );

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
      (order[ORDER_FIELDS.ORDER_EXPIRED] as string | null)
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
    String((order[ORDER_FIELDS.ORDER_EXPIRED] as string) || "");

  // VietQR: dùng giá đơn hàng (qrAmountFromOrder), không dùng giá tính lại (effectiveAmount)
  const qrMessage = String(order[ORDER_FIELDS.ID_ORDER] || "");
  const safeQrAmount = Helpers.roundGiaBanValue(qrAmountFromOrder);
  const qrCodeImageUrl = Helpers.buildSepayQrUrl({
    accountNumber: ACCOUNT_NO,
    bankCode: BANK_SHORT_CODE,
    amount: safeQrAmount,
    description: qrMessage,
    accountName: ACCOUNT_NAME,
  });

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 p-2 sm:p-4 md:p-6"
      onClick={onClose}
    >
      {/* Modal container */}
      <div
        className="bg-slate-900/90 border border-white/10 rounded-lg shadow-[0_18px_48px_-28px_rgba(0,0,0,0.8)] w-full max-w-3xl transform transition-all duration-300 scale-100 max-h-[98vh] sm:max-h-[95vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-center items-center p-3 sm:p-4 border-b bg-slate-800/80 rounded-t-lg sticky top-0 z-10">
          <h3 className="text-lg sm:text-xl font-semibold text-white">
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

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-grow space-y-4 sm:space-y-5 text-gray-700">
          {/* Thong tin chung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {/* Left */}
            <dl className="space-y-2">
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">ID Đơn:</dt>
                <dd className="text-slate-100 font-semibold w-2/3 text-right">
                  {order[ORDER_FIELDS.ID_ORDER]}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">Sản Phẩm:</dt>
                <dd className="text-slate-100 w-2/3 text-right">
                  {order[ORDER_FIELDS.ID_PRODUCT]}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">
                  Thông Tin Sản Phẩm:
                </dt>
                <dd className="text-slate-100 w-2/3 text-right break-words">
                  {order[ORDER_FIELDS.INFORMATION_ORDER]}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">Slot:</dt>
                <dd className="text-slate-100 w-2/3 text-right">
                  {order[ORDER_FIELDS.SLOT]}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">Ghi Chú:</dt>
                <dd className="text-slate-100 w-2/3 text-right">
                  {order[ORDER_FIELDS.NOTE] || "-"}
                </dd>
              </div>
              <div className="flex justify-between pt-1 pb-1">
                <dt className="font-medium text-slate-400 w-1/3">Trạng Thái:</dt>
                <dd className="w-2/3 text-right">
                  <span
                    className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full ${Helpers.getStatusColor(
                      displayStatus
                    )}`}
                  >
                    {displayStatus}
                  </span>
                </dd>
              </div>
            </dl>

            {/* Right */}
            <dl className="space-y-2">
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">Khách Hàng:</dt>
                <dd className="text-slate-100 w-2/3 text-right">
                  {order[ORDER_FIELDS.CUSTOMER]}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1 items-start">
                <dt className="font-medium text-slate-400 w-1/3 shrink-0">
                  Liên Hệ:
                </dt>
                <dd className="w-2/3 text-right break-all">
                  <a
                    href={order[ORDER_FIELDS.CONTACT] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {order[ORDER_FIELDS.CONTACT] || "-"}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">Ngày Order:</dt>
                <dd className="text-slate-100 w-2/3 text-right">
                  {registrationDisplay}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">Số Ngày:</dt>
                <dd className="text-slate-100 w-2/3 text-right">
                  {order[ORDER_FIELDS.DAYS]}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">
                  Ngày Hết Hạn:
                </dt>
                <dd className="text-slate-100 w-2/3 text-right">
                  {expiryDisplay}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">
                  Số Ngày Còn Lại:
                </dt>
                <dd className="text-indigo-600 font-bold w-2/3 text-right">
                  {displayRemainingDays}
                </dd>
              </div>
            </dl>
          </div>

          {/* Divider */}
          <hr className="my-4 border-white/10" />

          {/* QR Code */}
          <div className="text-center bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-4 rounded-xl border border-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]">
            <h4 className="text-lg font-semibold text-indigo-100 mb-3">
              Quét mã QR để thanh toán (VietQR)
            </h4>
            {qrCodeImageUrl ? (
              <div className="flex justify-center mb-3">
                <img
                  src={qrCodeImageUrl}
                  alt={`QR Code thanh toán ${order[ORDER_FIELDS.ID_ORDER]}`}
                  className="border-2 border-indigo-200/60 rounded-lg p-1 bg-white shadow-lg shadow-indigo-900/40"
                  width={280}
                  height={280}
                />
              </div>
            ) : (
              <p className="text-red-600 font-medium">
                Không thể tạo mã QR. Vui lòng kiểm tra lại cấu hình
              </p>
            )}
            <div className="text-sm text-slate-100 space-y-1">
              <p>
                Ngân hàng: <strong className="text-indigo-100">VP Bank</strong>
              </p>
              <p>
                Số tài khoản: <strong className="text-indigo-100">{ACCOUNT_NO}</strong>
              </p>
              <p>
                Chủ tài khoản: <strong className="text-indigo-100">{ACCOUNT_NAME}</strong>
              </p>
              <p>
                Số tiền:{" "}
                <strong className="text-xl text-red-600">
                  {formatCurrency(safeQrAmount)}
                </strong>
              </p>
              {priceError && (
                <p className="text-xs text-red-500">{priceError}</p>
              )}
              <p>
                Nội dung: <strong className="text-indigo-200">{qrMessage}</strong>{" "}
                (Vui lòng điền đúng)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewOrderModal;
