import React, { useEffect, useState } from "react";
import { FixedCost, FixedCostCategory } from "../types";
import { X, Save, Home } from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import { CurrencyInputVN, CustomSelect, ToggleSwitch } from "@/shared/components";

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
  const notify = useNotification();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<FixedCostCategory>("LIVING");
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setAmount(Number(editingItem.amount) || 0);
      setCategory(editingItem.category || "LIVING");
      setNote(editingItem.note || "");
      setIsActive(editingItem.isActive);
    } else {
      setName("");
      setAmount(0);
      setCategory("LIVING");
      setNote("");
      setIsActive(true);
    }
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || amount < 1000) {
      notify.warning("Vui lòng điền tên và số tiền chi phí hợp lệ (>= 1.000₫)", "Thiếu Thông Tin");
      return;
    }

    try {
      setSubmitting(true);
      await onSave({
        name: name.trim(),
        amount,
        category,
        note: note.trim(),
        isActive,
      });
      onClose();
    } catch (err: any) {
      notify.error("Lỗi khi lưu chi phí: " + err.message, "Lỗi Lưu Trữ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {editingItem ? "Sửa Chi Phí Cố Định" : "Thêm Chi Phí Cố Định"}
              </h3>
              <p className="text-xs text-slate-400">
                Thiết lập định mức chi phí hàng tháng để tính mục tiêu hòa vốn
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
            {/* Cột Trái: Thông tin khoản chi & Số tiền */}
            <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Số tiền mỗi tháng (₫) <span className="text-rose-400">*</span>
                  </label>
                  <CurrencyInputVN
                    value={amount}
                    onChange={setAmount}
                    accentColor="rose"
                    suffix="₫"
                    placeholder="5.000.000"
                    required
                    className="py-2.5"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Phân loại
                  </label>
                  <CustomSelect
                    value={category}
                    onChange={(val) => setCategory(val as FixedCostCategory)}
                    accent="rose"
                    className="bg-slate-950 border-slate-800"
                    options={[
                      { value: "LIVING", label: "Sinh hoạt (Nhà/Ăn/Ở)" },
                      { value: "SHOP_OPERATIONS", label: "Vận hành Shop" },
                      { value: "SOFTWARE", label: "Phần mềm / Dịch vụ" },
                      { value: "OTHER", label: "Khác" },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Cột Phải: Ghi chú & Trạng thái áp dụng */}
            <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Ghi chú thêm
                </label>
                <textarea
                  placeholder="Ghi chú chi tiết nếu có..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Đang áp dụng
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Trừ vào mục tiêu hòa vốn tháng này
                  </span>
                </div>
                <ToggleSwitch
                  checked={isActive}
                  onChange={setIsActive}
                  variant="rose"
                  size="md"
                />
              </div>
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
