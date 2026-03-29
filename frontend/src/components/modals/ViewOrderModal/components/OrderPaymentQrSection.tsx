import type React from "react";
import { ACCOUNT_NAME, ACCOUNT_NO } from "../constants";

type OrderPaymentQrSectionProps = {
  orderId: string;
  qrCodeImageUrl: string;
  effectiveQrAmount: number;
  qrMessage: string;
  keepOrderPrice: boolean;
  priceLoading: boolean;
  priceError: string | null;
  formatCurrency: (value: number | string) => string;
};

export const OrderPaymentQrSection = ({
  orderId,
  qrCodeImageUrl,
  effectiveQrAmount,
  qrMessage,
  keepOrderPrice,
  priceLoading,
  priceError,
  formatCurrency,
}: OrderPaymentQrSectionProps) => {
  return (
    <div className="view-order-modal__qr text-center bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-4 rounded-xl border border-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]">
      <h4 className="text-lg font-semibold text-indigo-100 mb-3">
        Quét mã QR để thanh toán (VietQR)
      </h4>
      {qrCodeImageUrl ? (
        <div className="flex justify-center mb-3">
          <img
            src={qrCodeImageUrl}
            alt={`QR Code thanh toán ${orderId}`}
            className="border-2 border-indigo-200/60 rounded-lg p-1 bg-white shadow-lg shadow-indigo-900/40 w-full max-w-[240px] sm:max-w-[280px] h-auto"
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
            {formatCurrency(effectiveQrAmount)}
          </strong>
        </p>
        {!keepOrderPrice && priceLoading && (
          <p className="text-xs text-slate-400">Đang tính lại giá...</p>
        )}
        {priceError && <p className="text-xs text-red-500">{priceError}</p>}
        <p>
          Nội dung: <strong className="text-indigo-200">{qrMessage}</strong>{" "}
          (Vui lòng điền đúng)
        </p>
      </div>
    </div>
  );
};
