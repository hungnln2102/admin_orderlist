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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md px-4 animate-in fade-in" onClick={onClose}>
      <div
        className="glass-panel-dark text-white rounded-[32px] border border-white/10 shadow-2xl p-8 w-full max-w-sm animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/80">Thanh toán</p>
            <p className="text-xl font-bold tracking-tight mt-1">{payment.round || "QR Code"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-all text-white/40 hover:text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {payment.url ? (
          <div className="bg-white p-6 rounded-[24px] shadow-inner shadow-black/20">
            <img src={payment.url} alt="QR thanh toán" className="w-full h-auto" />
          </div>
        ) : (
          <div className="w-full aspect-square rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/60">
            Thiếu thông tin để tạo QR
          </div>
        )}

        <p className="text-[11px] font-medium text-white/60 text-center mt-6 leading-relaxed">
          Quét mã QR bằng ứng dụng ngân hàng<br/>để thanh toán chu kỳ này.
        </p>
      </div>
    </div>
  );
};

export default QrModal;
