import React, { useEffect, useRef, useState } from "react";
import { FixedCost, FixedCostCategory } from "../types";
import { X, Save, Home, Tag } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  editingItem?: FixedCost | null;
}

const formatAmountInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
};

const parseAmountInput = (value: string) => Number(value.replace(/\D/g, ""));

export const FixedCostModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
}) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<FixedCostCategory>("LIVING");
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setAmount(formatAmountInput(String(editingItem.amount)));
      setCategory(editingItem.category || "LIVING");
      setNote(editingItem.note || "");
      setIsActive(editingItem.isActive);
    } else {
      setName("");
      setAmount("");
      setCategory("LIVING");
      setNote("");
      setIsActive(true);
    }
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountValue = parseAmountInput(amount);
    if (!name.trim() || amountValue < 1000) {
      alert("Vui lòng điền tên và số tiền chi phí");
      return;
    }

    try {
      setSubmitting(true);
      await onSave({
        name: name.trim(),
        amount: amountValue,
        category,
        note: note.trim(),
        isActive,
      });
      onClose();
    } catch (err: any) {
      alert("Lỗi khi lưu chi phí: " + err.message);
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
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Home className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {editingItem ? "Sửa Chi Phí Cố Định" : "Thêm Chi Phí Cố Định"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Tên khoản chi phí <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Tiền thuê nhà, Tiền ăn uống, Internet..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Số tiền mỗi tháng (₫) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="5.000.000"
                  ref={amountInputRef}
                  value={amount}
                  onChange={handleAmountChange}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400 pl-9 font-mono"
                />
                <span className="absolute left-3 top-2.5 text-sm text-slate-500">₫</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Phân loại
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FixedCostCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
              >
                <option value="LIVING">Sinh hoạt (Nhà/Ăn/Ở)</option>
                <option value="SHOP_OPERATIONS">Vận hành Shop</option>
                <option value="SOFTWARE">Phần mềm / Dịch vụ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Ghi chú thêm
            </label>
            <textarea
              placeholder="Ghi chú chi tiết nếu có..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveFixedCost"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-rose-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="isActiveFixedCost" className="text-xs text-slate-300 cursor-pointer">
              Đang áp dụng (Trừ vào mục tiêu hòa vốn tháng này)
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-500 hover:bg-rose-400 text-white flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? "Đang lưu..." : editingItem ? "Cập nhật" : "Tạo chi phí"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
