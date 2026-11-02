import React, { useEffect, useRef, useState } from "react";
import { SavingGoalItem } from "../types";
import { X, Save, Target } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; targetAmount: number; note?: string }) => Promise<void>;
  editingItem?: SavingGoalItem | null;
}

const formatAmountInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
};

const parseAmountInput = (value: string) => Number(value.replace(/\D/g, ""));

export const SavingGoalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
}) => {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setTargetAmount(formatAmountInput(String(editingItem.targetAmount)));
      setNote(editingItem.note || "");
    } else {
      setName("");
      setTargetAmount("");
      setNote("");
    }
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    const caretPosition = event.target.selectionStart ?? rawValue.length;
    const digitsBeforeCaret = rawValue.slice(0, caretPosition).replace(/\D/g, "").length;
    const formattedValue = formatAmountInput(rawValue);

    setTargetAmount(formattedValue);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseAmountInput(targetAmount);
    if (!name.trim() || amountVal <= 0) {
      alert("Vui lòng nhập tên mục tiêu và số tiền lớn hơn 0");
      return;
    }

    try {
      setSubmitting(true);
      await onSave({
        name: name.trim(),
        targetAmount: amountVal,
        note: note.trim(),
      });
      onClose();
    } catch (err: any) {
      alert("Lỗi khi lưu mục tiêu: " + err.message);
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
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {editingItem ? "Sửa Cột Mốc Mục Tiêu" : "Thêm Cột Mốc Mục Tiêu Mới"}
            </h3>
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
              Tên dự định / Mục tiêu <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Đổi iPhone 16 Pro Max, Mua xe ô tô, Du lịch..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Số tiền đích cần đạt (₫) <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="50.000.000"
                ref={amountInputRef}
                value={targetAmount}
                onChange={handleAmountChange}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 pl-9 font-mono"
              />
              <span className="absolute left-3 top-2.5 text-sm text-slate-500">₫</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Ghi chú thêm (tùy chọn)
            </label>
            <textarea
              placeholder="Ghi chú chi tiết hoặc động lực phấn đấu..."
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
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-white flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? "Đang lưu..." : editingItem ? "Cập nhật" : "Tạo cột mốc"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

