import React, { useEffect, useRef, useState } from "react";
import { X, ArrowDownRight, ArrowUpRight, DollarSign } from "lucide-react";
import { formatVND } from "@/shared/utils";

interface Props {
  isOpen: boolean;
  mode: "DEPOSIT" | "WITHDRAW";
  currentFund: number;
  onClose: () => void;
  onSubmit: (payload: { amount: number; note: string }) => Promise<void>;
}

const formatAmountInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
};

const parseAmountInput = (value: string) => Number(value.replace(/\D/g, ""));

export const SavingFundModal: React.FC<Props> = ({
  isOpen,
  mode,
  currentFund,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAmount("");
    setNote("");
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const isDeposit = mode === "DEPOSIT";

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    const caretPosition = event.target.selectionStart ?? rawValue.length;
    const digitsBeforeCaret = rawValue.slice(0, caretPosition).replace(/\D/g, "").length;
    const formattedValue = formatAmountInput(rawValue);

    setAmount(formattedValue);
    requestAnimationFrame(() => {
      const input = amountInputRef.current;
      if (!input) return;
      let nextCaret = 0;
      let digitCount = 0;
      while (nextCaret < formattedValue.length && digitCount < digitsBeforeCaret) {
        if (/\d/.test(formattedValue[nextCaret])) digitCount += 1;
        nextCaret += 1;
      }
      input.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleQuickAdd = (value: number) => {
    setAmount(Number(value).toLocaleString("vi-VN"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseAmountInput(amount);
    if (amountVal <= 0) {
      alert("Vui lòng nhập số tiền lớn hơn 0");
      return;
    }

    if (!isDeposit && amountVal > currentFund) {
      alert(`Số dư quỹ hiện tại (${formatVND(currentFund)}) không đủ để rút ${formatVND(amountVal)}`);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        amount: amountVal,
        note: note.trim() || (isDeposit ? "Nạp tiền vào quỹ tích lũy" : "Rút tiền từ quỹ tích lũy"),
      });
      onClose();
    } catch (err: any) {
      alert("Thao tác thất bại: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
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
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Số tiền {isDeposit ? "nạp thêm" : "cần rút"} (₫) <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="10.000.000"
                ref={amountInputRef}
                value={amount}
                onChange={handleAmountChange}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 pl-9 font-mono font-bold"
              />
              <span className="absolute left-3 top-2.5 text-sm text-slate-500">₫</span>
            </div>

            {/* Quick buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              {[5000000, 10000000, 20000000, 50000000].map((quickVal) => (
                <button
                  key={quickVal}
                  type="button"
                  onClick={() => handleQuickAdd(quickVal)}
                  className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] font-mono font-semibold text-slate-300 transition-colors cursor-pointer"
                >
                  +{quickVal / 1000000}Tr
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Ghi chú nội dung
            </label>
            <textarea
              placeholder={isDeposit ? "VD: Trích lợi nhuận đơn hàng tháng này..." : "VD: Rút tiền phục vụ chi tiêu cá nhân..."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 resize-none"
            />
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

