import React, { useState, useEffect } from "react";
import { FixedCost, FixedCostCategory } from "../types";
import { X, Save, DollarSign, Home, Tag } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  editingItem?: FixedCost | null;
}

export const FixedCostModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
}) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [category, setCategory] = useState<FixedCostCategory>("LIVING");
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setAmount(editingItem.amount);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) {
      alert("Vui lòng điền tên và số tiền chi phí");
      return;
    }

    try {
      setSubmitting(true);
      await onSave({
        name: name.trim(),
        amount: Number(amount),
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
                  type="number"
                  placeholder="5000000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                  required
                  min="1000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400 pl-9 font-mono"
                />
                <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
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
