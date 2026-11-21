import React, { useEffect, useState } from "react";
import { Installment } from "../types";
import { X, Save, Calendar, Clock, Hash } from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import { CurrencyInputVN, ToggleSwitch } from "@/shared/components";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  editingItem?: Installment | null;
}

export const InstallmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
}) => {
  const notify = useNotification();
  const [name, setName] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState<number>(0);
  const [totalPeriods, setTotalPeriods] = useState<number | "">(12);
  const [startPeriod, setStartPeriod] = useState("");
  const [dueDay, setDueDay] = useState<number>(15);
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setMonthlyAmount(Number(editingItem.monthlyAmount) || 0);
      setTotalPeriods(editingItem.totalPeriods);
      setStartPeriod(editingItem.startPeriod);
      setDueDay(editingItem.dueDay || 15);
      setNote(editingItem.note || "");
      setIsActive(editingItem.isActive);
    } else {
      setName("");
      setMonthlyAmount(0);
      setTotalPeriods(12);
      const now = new Date();
      setStartPeriod(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
      setDueDay(15);
      setNote("");
      setIsActive(true);
    }
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || monthlyAmount < 1000 || !totalPeriods || !startPeriod) {
      notify.warning("Vui lòng điền đầy đủ thông tin khoản trả góp", "Thiếu Thông Tin");
      return;
    }

    try {
      setSubmitting(true);
      await onSave({
        name: name.trim(),
        monthlyAmount,
        totalPeriods: Number(totalPeriods),
        startPeriod,
        dueDay: Number(dueDay),
        note: note.trim(),
        isActive,
      });
      onClose();
    } catch (err: any) {
      notify.error("Lỗi khi lưu khoản trả góp: " + err.message, "Lỗi Lưu Trữ");
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
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {editingItem ? "Sửa Khoản Trả Góp" : "Thêm Khoản Trả Góp Mới"}
              </h3>
              <p className="text-xs text-slate-400">
                Quản lý số tiền mỗi kỳ, tổng kỳ hạn và lịch đến hạn hàng tháng
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
            {/* Cột 1: Thông tin khoản vay & số tiền */}
            <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Tên khoản trả góp <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Trả góp MacBook Pro M3, Góp xe máy..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Số tiền mỗi kỳ (₫) <span className="text-rose-400">*</span>
                  </label>
                  <CurrencyInputVN
                    value={monthlyAmount}
                    onChange={setMonthlyAmount}
                    accentColor="amber"
                    suffix="₫"
                    placeholder="3.000.000"
                    required
                    className="py-2.5"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Tổng số kỳ (Tháng) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="12"
                      value={totalPeriods}
                      onChange={(e) => setTotalPeriods(e.target.value ? Number(e.target.value) : "")}
                      required
                      min="1"
                      max="120"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 pl-9 font-mono"
                    />
                    <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Đang hoạt động
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Kích hoạt tính vào chi phí tháng
                  </span>
                </div>
                <ToggleSwitch
                  checked={isActive}
                  onChange={setIsActive}
                  variant="amber"
                  size="md"
                />
              </div>
            </div>

            {/* Cột 2: Kỳ hạn, ngày đến hạn & ghi chú */}
            <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Tháng bắt đầu kỳ 1 <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="month"
                      value={startPeriod}
                      onChange={(e) => setStartPeriod(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 pl-9 font-mono"
                    />
                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Ngày đến hạn hàng tháng
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Ghi chú thêm
                </label>
                <textarea
                  placeholder="VD: Góp thẻ tín dụng HSBC, hạn trả ngày 15..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 resize-none"
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
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? "Đang lưu..." : editingItem ? "Cập nhật" : "Tạo khoản trả góp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
