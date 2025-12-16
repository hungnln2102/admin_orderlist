import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { QrPayment } from "../hooks/usePayments";

interface Props {
  payment: QrPayment | null;
  onClose: () => void;
}

const QrModal: React.FC<Props> = ({ payment, onClose }) => {
  if (!payment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="bg-slate-900 text-white rounded-2xl border border-white/10 shadow-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-white/60">Chu kỳ</p>
            <p className="text-lg font-bold">{payment.round || "QR thanh toán"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition text-white/70">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {payment.url ? (
          <img src={payment.url} alt="QR thanh toán" className="rounded-lg border border-white/10 bg-white p-4 w-full" />
        ) : (
          <div className="w-full aspect-square rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/60">
            Thiếu thông tin để tạo QR
          </div>
        )}

        <p className="text-xs text-white/60 text-center mt-3">Quét QR để thanh toán số tiền chu kỳ.</p>
      </div>
    </div>
  );
};

export default QrModal;
