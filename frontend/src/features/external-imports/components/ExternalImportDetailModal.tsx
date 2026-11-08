import React from "react";
import { FileText, X } from "lucide-react";
import { StoreExpenseItem } from "../types";

interface ExternalImportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem: StoreExpenseItem | null;
  formatVND: (val: number) => string;
}

export const ExternalImportDetailModal: React.FC<ExternalImportDetailModalProps> = ({
  isOpen,
  onClose,
  activeItem,
  formatVND,
}) => {
  if (!isOpen || !activeItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-xs">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-800 text-cyan-400 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Chi Tiết Bản Ghi #{activeItem.id}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex justify-between py-1.5 border-b border-slate-800/60">
            <span className="text-slate-400">Phân Loại:</span>
            <span className="font-semibold text-white">
              {["external_import", "mavn_import"].includes(activeItem.expenseType)
                ? "Nhập Nguồn Hàng Ngoài Luồng"
                : "Chi Phí Biến Đổi / Sinh Hoạt"}
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-800/60">
            <span className="text-slate-400">Số Tiền:</span>
            <span className="font-mono font-bold text-rose-400 text-sm">
              -{formatVND(activeItem.amount)}
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-800/60">
            <span className="text-slate-400">Ngày Chi Phí:</span>
            <span className="font-mono text-slate-200">{activeItem.expenseDate}</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-800/60">
            <span className="text-slate-400">Tài Khoản Chi / Nguồn Tiền:</span>
            <span className="font-semibold text-emerald-400">
              {activeItem.shopBankAccountId && activeItem.bankAccountNumber ? (
                activeItem.bankAccountScope === "SHOP" ? (
                  <span className="text-indigo-300">
                    🏦 {activeItem.bankShortCode || activeItem.bankAccountLabel} ({activeItem.bankAccountNumber}) — [TK Shop: Có BĐ Tháng]
                  </span>
                ) : (
                  <span className="text-slate-300">
                    💼 {activeItem.bankShortCode || activeItem.bankAccountLabel} ({activeItem.bankAccountNumber}) — [Ví Cá Nhân: Ko BĐ Tháng]
                  </span>
                )
              ) : activeItem.paymentReceiptId ? (
                `🧾 Biên lai #${activeItem.paymentReceiptId}`
              ) : (
                <span className="text-slate-400">💵 Tiền mặt / Ví cá nhân (Không BĐ Tháng)</span>
              )}
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-800/60">
            <span className="text-slate-400">Mã Trace / Đơn Hàng:</span>
            <span className="font-mono text-cyan-400">{activeItem.linkedOrderCode || "—"}</span>
          </div>

          <div className="py-1.5">
            <span className="text-slate-400 block mb-1">Lý Do / Diễn Giải:</span>
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-200 font-medium">
              {activeItem.reason || "—"}
            </div>
          </div>

          {activeItem.expenseMeta && (
            <div className="py-1.5">
              <span className="text-slate-400 block mb-1">Metadata Kỹ Thuật:</span>
              <pre className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-cyan-300 overflow-x-auto">
                {JSON.stringify(activeItem.expenseMeta, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

