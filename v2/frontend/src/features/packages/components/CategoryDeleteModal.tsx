import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface CategoryDeleteModalProps {
  categoryName: string | null;
  onClose: () => void;
  onConfirmDelete: () => void;
  submitting?: boolean;
}

export const CategoryDeleteModal: React.FC<CategoryDeleteModalProps> = ({
  categoryName,
  onClose,
  onConfirmDelete,
  submitting = false,
}) => {
  if (!categoryName) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0a1225] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5 shrink-0" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide">Xác Nhận Xóa Loại Gói</h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-slate-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <p className="text-xs text-slate-300 leading-relaxed">
          Bạn có chắc chắn muốn xóa loại gói <strong className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">{categoryName}</strong> khỏi Kho Gói Sản Phẩm không?
        </p>
        <p className="text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          💡 Thao tác này sẽ ẩn loại gói khỏi màn hình tổng quan, toàn bộ thông tin đơn hàng và tài khoản kho trước đó vẫn được bảo toàn an toàn.
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={submitting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Đang xóa..." : "Xóa Loại Gói"}
          </button>
        </div>
      </div>
    </div>
  );
};
