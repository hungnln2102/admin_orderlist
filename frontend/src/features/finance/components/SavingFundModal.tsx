import React, { useEffect, useState } from "react";
import { X, ArrowDownRight, ArrowUpRight, DollarSign } from "lucide-react";
import { formatVND } from "@/shared/utils";
import { useNotification } from "@/shared/context/NotificationContext";
import { CurrencyInputVN } from "@/shared/components";

interface Props {
  isOpen: boolean;
  mode: "DEPOSIT" | "WITHDRAW";
  currentFund: number;
  onClose: () => void;
  onSubmit: (payload: { amount: number; note: string }) => Promise<void>;
}

export const SavingFundModal: React.FC<Props> = ({
  isOpen,
  mode,
  currentFund,
  onClose,
  onSubmit,
}) => {
  const notify = useNotification();
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAmount(0);
    setNote("");
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const isDeposit = mode === "DEPOSIT";

  const handleQuickAdd = (value: number) => {
    setAmount(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      notify.warning("Vui lòng nhập số tiền lớn hơn 0", "Lỗi Dữ Liệu");
      return;
    }

    if (!isDeposit && amount > currentFund) {
      notify.warning(
        `Số dư quỹ hiện tại (${formatVND(currentFund)}) không đủ để rút ${formatVND(amount)}`,
        "Không Đủ Số Dư"
      );
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        amount,
        note: note.trim() || (isDeposit ? "Nạp tiền vào quỹ tích lũy" : "Rút tiền từ quỹ tích lũy"),
      });
      onClose();
    } catch (err: any) {
      notify.error("Thao tác thất bại: " + err.message, "Lỗi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isDeposit
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {isDeposit ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isDeposit ? "Nạp Tiền Vào Quỹ Tích Lũy" : "Trích Rút Tiền Khỏi Quỹ"}
              </h3>
              <p className="text-xs text-slate-400">
                Số dư hiện có: <span className="font-mono font-bold text-cyan-300">{formatVND(currentFund)}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body — Form Ngang 2 Cột */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Cột 1: Số tiền & Nút chọn nhanh */}
            <div className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Số tiền {isDeposit ? "nạp thêm" : "cần rút"} (₫) <span className="text-cyan-400">*</span>
                </label>
                <CurrencyInputVN
                  value={amount}
                  onChange={setAmount}
                  accentColor={isDeposit ? "emerald" : "amber"}
                  suffix="₫"
                  placeholder="10.000.000"
                  required
                  className="py-2.5"
                />
              </div>

              {/* Quick buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5000000, 10000000, 20000000, 50000000].map((quickVal) => (
                  <button
                    key={quickVal}
                    type="button"
                    onClick={() => handleQuickAdd(quickVal)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] font-mono font-semibold text-slate-300 transition-colors cursor-pointer"
                  >
                    +{quickVal / 1000000}Tr
                  </button>
                ))}
              </div>
            </div>

            {/* Cột 2: Ghi chú nội dung */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Ghi chú nội dung
              </label>
              <textarea
                placeholder={
                  isDeposit
                    ? "VD: Trích lợi nhuận đơn hàng tháng này..."
                    : "VD: Rút tiền phục vụ chi tiêu cá nhân..."
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
                isDeposit
                  ? "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20"
                  : "bg-amber-500 hover:bg-amber-400 shadow-amber-500/20"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              {submitting
                ? "Đang xử lý..."
                : isDeposit
                ? "Xác nhận nạp quỹ"
                : "Xác nhận rút tiền"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
