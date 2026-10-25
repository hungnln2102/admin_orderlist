import React from "react";
import { AlertTriangle } from "lucide-react";
import { PricingItem } from "../types";

interface PricingDeleteModalProps {
  deletingItem: PricingItem | null;
  onClose: () => void;
  onConfirmDelete: () => void;
  submitting: boolean;
}

export const PricingDeleteModal: React.FC<PricingDeleteModalProps> = ({
  deletingItem,
  onClose,
  onConfirmDelete,
  submitting,
}) => {
  if (!deletingItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 text-rose-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h2 className="text-base font-bold text-white">Xác Nhận Xóa Sản Phẩm</h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Bạn có chắc chắn muốn xóa sản phẩm <strong className="text-white">{deletingItem.san_pham}</strong> ({deletingItem.package_product})? Event <code className="text-rose-400 font-mono">PRODUCT_DELETED</code> sẽ được gửi tới Event Bus.
        </p>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 disabled:opacity-50 transition-all"
          >
            {submitting ? "Đang xóa..." : "Xóa Sản Phẩm"}
          </button>
        </div>
      </div>
    </div>
  );
};
