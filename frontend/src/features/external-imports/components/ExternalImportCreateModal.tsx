import React from "react";
import {
  PackagePlus,
  Boxes,
  Coffee,
  Landmark,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { PaymentAccount, ExpenseFormData } from "../types";

interface ExternalImportCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: ExpenseFormData;
  setFormData: React.Dispatch<React.SetStateAction<ExpenseFormData>>;
  accounts: PaymentAccount[];
  submitting: boolean;
  formatVND: (val: number) => string;
}

export const ExternalImportCreateModal: React.FC<ExternalImportCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  accounts,
  submitting,
  formatVND,
}) => {
  if (!isOpen) return null;

  const selectedAccount = accounts.find((a) => String(a.id) === formData.shop_bank_account_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <PackagePlus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Ghi Nhận Khoản Chi Mới</h3>
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
            <p className="text-[11px] text-slate-500 mt-1">
              {formData.expense_type === "external_import"
                ? "💡 Khoản chi này sẽ được trừ trực tiếp vào Lợi Nhuận của đúng ngày phát sinh."
                : "💡 Khoản chi sinh hoạt, ăn uống, tiếp khách, sửa xe... trong tháng."}
            </p>
          </div>

          {/* TÀI KHOẢN CHI TIỀN (TRỪ SỐ DƯ) */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tài Khoản Chi Tiền (Khấu Trừ Số Dư)</span>
              </span>
              {selectedAccount && (
                <span className="text-emerald-400 font-mono text-[11px] font-bold">
                  Số dư: {formatVND(selectedAccount.balance)}
                </span>
              )}
            </label>
            <div className="relative">
              <select
                value={formData.shop_bank_account_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, shop_bank_account_id: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none pr-8"
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
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Ghi chú trực quan về biến động tháng */}
            <div className="mt-2 p-2 rounded-xl border text-[11px] space-y-1 bg-slate-950/60 border-slate-800">
              {selectedAccount?.accountScope === "SHOP" ? (
                <div className="flex items-start gap-1.5 text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Khoản chi này dùng <b>Tài Khoản Shop</b>: Trừ trực tiếp két tiền Shop, tính vào chi phí nhập tháng và phát thông báo <b>Biến Động Tháng</b>.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-1.5 text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
                  <span>
                    Khoản chi này dùng <b>Ví cá nhân / Tiền mặt</b>: Két tiền của Shop không bị trừ, <b>không tính biến động tháng</b> của Shop.
                  </span>
                </div>
              )}
            </div>

            {selectedAccount && Number(formData.amount.replace(/\D/g, "")) > selectedAccount.balance && (
              <div className="mt-1.5 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Cảnh báo: Số tiền chi vượt quá số dư khả dụng ({formatVND(selectedAccount.balance)})!</span>
              </div>
            )}
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
              placeholder="Ví dụ: 500.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Ngày chi phí */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Ngày Phát Sinh Chi Phí *</label>
            <input
              type="date"
              required
              value={formData.expense_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, expense_date: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
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
              placeholder="Ví dụ: Nhập sỉ 10 acc Youtube MAVN, Ăn trưa tiếp khách..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Mã trace / Đơn hàng */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Mã Trace / Đơn Hàng (Nếu có)</label>
            <input
              type="text"
              value={formData.linked_order_code}
              onChange={(e) => setFormData((prev) => ({ ...prev, linked_order_code: e.target.value }))}
              placeholder="Ví dụ: MAVNMB3ZK, IMP-101..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
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
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Lưu Khoản Chi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

