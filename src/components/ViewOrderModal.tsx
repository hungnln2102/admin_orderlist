import React, { useEffect, useMemo, useState } from "react";
import * as Helpers from "../lib/helpers";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { API_ENDPOINTS } from "../constants";

interface Order {
  id: number;
  id_don_hang: string;
  san_pham: string;
  thong_tin_san_pham: string;
  khach_hang: string;
  link_lien_he: string;
  slot: string;
  ngay_dang_ki: string;
  so_ngay_da_dang_ki: string;
  het_han: string;
  registration_date?: string;
  expiry_date?: string;
  registration_date_display?: string;
  expiry_date_display?: string;
  nguon: string;
  gia_nhap: number;
  gia_ban: number;
  note: string;
  tinh_trang: string;
  check_flag?: boolean | null;
  so_ngay_con_lai?: number;
  giaTriConLai?: number;
  trangThaiText?: string;
  customer_type?: string | null;
}

interface ViewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  formatCurrency: (value: number | string) => string;
}

const BANK_SHORT_CODE = "VPB";
const ACCOUNT_NO = "9183400998";
const ACCOUNT_NAME = "NGO LE NGOC HUNG";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  (process.env.VITE_API_BASE_URL as string) ||
  "http://localhost:3001";

const ViewOrderModal: React.FC<ViewOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  formatCurrency,
}) => {
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !order) {
      setCalculatedPrice(null);
      setPriceLoading(false);
      setPriceError(null);
      return;
    }

    let ignore = false;
    const basePrice = Number(order.gia_ban) || 0;
    setCalculatedPrice(basePrice);

    if (!order.san_pham || !order.id_don_hang) {
      setPriceLoading(false);
      return;
    }

    const payload: Record<string, unknown> = {
      san_pham_name: order.san_pham,
      id_don_hang: order.id_don_hang,
    };

    const customerType = order.customer_type || order.nguon;
    if (customerType) {
      payload.customer_type = customerType;
    }

    const fetchPrice = async () => {
      try {
        setPriceLoading(true);
        setPriceError(null);

        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.CALCULATE_PRICE}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const { data, rawText } =
          await Helpers.readJsonOrText<{ gia_ban?: number; error?: string }>(
            response
          );

        if (!response.ok) {
          const message =
            (data?.error as string | undefined) ||
            rawText ||
            `Server responded with ${response.status}`;
          throw new Error(message);
        }

        const result = data || {};

        if (!ignore) {
          const backendPrice = Number(result?.gia_ban);
          setCalculatedPrice(
            Number.isFinite(backendPrice) && backendPrice >= 0
              ? backendPrice
              : basePrice
          );
        }
      } catch (error) {
        console.error("Lỗi khi tính lại giá đơn hàng:", error);
        if (!ignore) {
          setPriceError(
            "Không thể tính lại giá tự động. Đang hiển thị giá hiện có."
          );
          setCalculatedPrice(basePrice);
        }
      } finally {
        if (!ignore) {
          setPriceLoading(false);
        }
      }
    };

    fetchPrice();

    return () => {
      ignore = true;
    };
  }, [
    isOpen,
    order?.id_don_hang,
    order?.san_pham,
    order?.nguon,
    order?.customer_type,
    order?.gia_ban,
  ]);

  const effectiveAmount = useMemo(() => {
    if (!order) return 0;
    const fallback = Number(order.gia_ban) || 0;
    return Math.max(0, calculatedPrice ?? fallback);
  }, [order, calculatedPrice]);

  if (!isOpen || !order) return null;

  const displayStatus =
    (order.trangThaiText || order.tinh_trang || "").trim() || "Chua Thanh Toan";

  const remainingFromBackend =
    order.so_ngay_con_lai !== undefined && order.so_ngay_con_lai !== null
      ? Number(order.so_ngay_con_lai)
      : null;
  const fallbackRemaining = Helpers.daysUntilDate(
    order.expiry_date || order.expiry_date_display || order.het_han || null
  );
  const displayRemainingDays =
    remainingFromBackend !== null && Number.isFinite(remainingFromBackend)
      ? remainingFromBackend
      : fallbackRemaining ?? 0;

  const registrationDisplay =
    order.registration_date_display ||
    Helpers.formatDateToDMY(order.registration_date || order.ngay_dang_ki) ||
    String(order.ngay_dang_ki || "");
  const expiryDisplay =
    order.expiry_date_display ||
    Helpers.formatDateToDMY(order.expiry_date || order.het_han) ||
    String(order.het_han || "");

  // VietQR
  const qrAmount = effectiveAmount;
  const qrMessage = order.id_don_hang;
  const normalizedAmount = Math.max(0, Number(qrAmount) || 0);
  const safeQrAmount = Helpers.roundGiaBanValue(normalizedAmount);
  const qrCodeImageUrl = Helpers.buildSepayQrUrl({
    accountNumber: ACCOUNT_NO,
    bankCode: BANK_SHORT_CODE,
    amount: safeQrAmount,
    description: qrMessage,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 px-4 py-6">
      {/* Modal container */}
      <div className="bg-slate-900/90 border border-white/10 rounded-lg shadow-[0_18px_48px_-28px_rgba(0,0,0,0.8)] w-full max-w-3xl transform transition-all duration-300 scale-100 max-h-[95vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex justify-center items-center p-4 border-b bg-slate-800/80 rounded-t-lg sticky top-0 z-10">
          <h3 className="text-xl font-semibold text-white">
            Chi Tiết Đơn Hàng:{" "}
            <span className="text-blue-600">{order.id_don_hang}</span>
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
        <div className="p-6 overflow-y-auto flex-grow space-y-5 text-gray-700">
          {/* Thong tin chung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {/* Left */}
            <dl className="space-y-2">
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">ID Đơn:</dt>
                <dd className="text-slate-100 font-semibold w-2/3 text-right">
                  {order.id_don_hang}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">Sản Phẩm:</dt>
                <dd className="text-slate-100 w-2/3 text-right">
                  {order.san_pham}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">
                  Thông Tin Sản Phẩm:
                </dt>
                <dd className="text-slate-100 w-2/3 text-right break-words">
                  {order.thong_tin_san_pham}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">Slot:</dt>
                <dd className="text-slate-100 w-2/3 text-right">{order.slot}</dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="font-medium text-slate-400 w-1/3">Ghi Chú:</dt>
                <dd className="text-slate-100 w-2/3 text-right">
                  {order.note || "-"}
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
                  {order.khach_hang}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1 items-start">
                <dt className="font-medium text-slate-400 w-1/3 shrink-0">
                  Liên Hệ:
                </dt>
                <dd className="w-2/3 text-right break-all">
                  <a
                    href={order.link_lien_he}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {order.link_lien_he || "-"}
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
                  {order.so_ngay_da_dang_ki}
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
              Quét Mã QR Để Thanh Toán (VietQR)
            </h4>
            {qrCodeImageUrl ? (
              <div className="flex justify-center mb-3">
                <img
                  src={qrCodeImageUrl}
                  alt={`QR Code thanh toan ${order.id_don_hang}`}
                  className="border-2 border-indigo-200/60 rounded-lg p-1 bg-white shadow-lg shadow-indigo-900/40"
                  width={280}
                  height={280}
                />
              </div>
            ) : (
              <p className="text-red-600 font-medium">
                Không Thể Tạo Mã QR. Vui Lòng Kiểm Tra Lại Cấu Hình
              </p>
            )}
            <div className="text-sm text-slate-100 space-y-1">
              <p>
                Ngân Hàng: <strong className="text-indigo-100">VP Bank</strong>
              </p>
              <p>
                Số Tài Khoản: <strong className="text-indigo-100">{ACCOUNT_NO}</strong>
              </p>
              <p>
                Chủ Tài Khoản: <strong className="text-indigo-100">{ACCOUNT_NAME}</strong>
              </p>
              <p>
                Số Tiền:{" "}
                <strong className="text-xl text-red-600">
                  {priceLoading
                    ? "Đang tính..."
                    : formatCurrency(safeQrAmount)}
                </strong>
              </p>
              {priceError && (
                <p className="text-xs text-red-500">{priceError}</p>
              )}
              <p>
                Nội Dung: <strong className="text-indigo-200">{qrMessage}</strong>{" "}
                (Vui Lòng Điền Đúng)
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t bg-gray-100 rounded-b-lg sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewOrderModal;
