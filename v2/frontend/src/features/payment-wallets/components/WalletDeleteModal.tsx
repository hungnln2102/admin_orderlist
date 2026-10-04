import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { WalletTarget } from "../types";

interface WalletDeleteModalProps {
  target: WalletTarget | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const WalletDeleteModal: React.FC<WalletDeleteModalProps> = ({
  target,
  submitting,
  onClose,
  onConfirm,
}) => {
  if (!target) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Xác Nhận Xóa Tài Khoản?</h3>
          <p className="text-xs text-slate-400 mt-1">
            Bạn có chắc chắn muốn xóa <span className="font-bold text-white">{target.title}</span> khỏi hệ thống?
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center gap-2 cursor-pointer"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Xóa Tài Khoản</span>
          </button>
        </div>
      </div>
    </div>
  );
};
