import React from "react";
import { ArrowUpRight, XCircle, Loader2 } from "lucide-react";
import { WalletTarget } from "../types";

interface WithdrawModalProps {
  open: boolean;
  target: WalletTarget | null;
  amount: string;
  note: string;
  submitting: boolean;
  onClose: () => void;
  onAmountChange: (val: string) => void;
  onNoteChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  open,
  target,
  amount,
  note,
  submitting,
  onClose,
  onAmountChange,
  onNoteChange,
  onSubmit,
}) => {
  if (!open || !target) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
            Ghi Nhận Rút Tiền
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
            Tài khoản: <span className="font-bold text-white">{target.title}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Số tiền rút {target.type === "bank" ? "(VND)" : "(USDT)"} *
            </label>
            <input
              type="number"
              required
              step="any"
              placeholder={target.type === "bank" ? "VD: 5000000" : "VD: 100"}
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Ghi chú rút tiền</label>
            <input
              type="text"
              placeholder="VD: Rút tiền mặt lợi nhuận shop"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Xác Nhận Rút</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
