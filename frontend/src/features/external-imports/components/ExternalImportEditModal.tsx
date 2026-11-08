import React from "react";
import {
  Edit3,
  Boxes,
  Coffee,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { PaymentAccount, StoreExpenseItem, ExpenseFormData } from "../types";

interface ExternalImportEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  activeItem: StoreExpenseItem | null;
  formData: ExpenseFormData;
  setFormData: React.Dispatch<React.SetStateAction<ExpenseFormData>>;
  accounts: PaymentAccount[];
  submitting: boolean;
  formatVND: (val: number) => string;
}

export const ExternalImportEditModal: React.FC<ExternalImportEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  activeItem,
  formData,
  setFormData,
  accounts,
  submitting,
  formatVND,
}) => {
  if (!isOpen || !activeItem) return null;

  const selectedAccount = accounts.find((a) => String(a.id) === formData.shop_bank_account_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Edit3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Chỉnh Sửa Bản Ghi #{activeItem.id}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4 text-xs">
          {/* Phân loại */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">Phân Loại Chi Phí</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, expense_type: "external_import" }))}
                className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  formData.expense_type === "external_import"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    : "bg-slate-800/80 text-slate-400 border-slate-700/60"
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Nhập Ngoài Luồng</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, expense_type: "monthly_expense" }))}
                className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  formData.expense_type === "monthly_expense"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-800/80 text-slate-400 border-slate-700/60"
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Chi Phí Tháng</span>
              </button>
            </div>
          </div>

          {/* Tài khoản chi */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Tài Khoản Chi Tiền (Khấu Trừ Số Dư)</label>
            <select
              value={formData.shop_bank_account_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, shop_bank_account_id: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="">💵 Tiền mặt / Ví cá nhân (Không tính biến động tháng của Shop)</option>
              {accounts.map((acc) => {
                const isShop = acc.accountScope === "SHOP";
                return (
                  <option key={acc.id} value={acc.id}>
                    {isShop ? "🏦" : "💼"} {acc.bankShortCode || acc.label} — {acc.accountNumber} ({formatVND(acc.balance)}) {isShop ? "[Tài Khoản Shop: Có Biến Động Tháng]" : "[Ví Cá Nhân: Không Biến Động]"}
                  </option>
                );
              })}
            </select>

            <div className="mt-2 p-2 rounded-xl border text-[11px] space-y-1 bg-slate-950/60 border-slate-800">
              {selectedAccount?.accountScope === "SHOP" ? (
                <div className="flex items-start gap-1.5 text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Tài khoản này là <b>Tài Khoản Shop</b>: Có tính biến động tháng, trừ két tiền Shop và phát thông báo Telegram.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-1.5 text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
                  <span>
                    Tài khoản này là <b>Ví cá nhân / Tiền mặt</b>: Không trừ két tiền Shop và <b>không tính biến động tháng</b>.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Số tiền */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Số Tiền (₫) *</label>
            <input
              type="text"
              required
              value={formData.amount}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setFormData((prev) => ({
                  ...prev,
                  amount: raw ? Number(raw).toLocaleString("vi-VN") : "",
                }));
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Ngày */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Ngày Phát Sinh *</label>
            <input
              type="date"
              required
              value={formData.expense_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, expense_date: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Lý do */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Lý Do / Diễn Giải *</label>
            <input
              type="text"
              required
              value={formData.reason}
              onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Mã trace */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Mã Trace / Đơn Hàng</label>
            <input
              type="text"
              value={formData.linked_order_code}
              onChange={(e) => setFormData((prev) => ({ ...prev, linked_order_code: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Lưu Thay Đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

