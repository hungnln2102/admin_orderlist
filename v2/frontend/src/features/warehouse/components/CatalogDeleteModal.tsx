import React from "react";
import { AlertTriangle, X, CheckCircle2 } from "lucide-react";
import { ServiceNameCategoryItem } from "../types";

interface CatalogDeleteModalProps {
  item: ServiceNameCategoryItem | null;
  onClose: () => void;
  onConfirmDelete: () => void;
  submitting?: boolean;
}

export const CatalogDeleteModal: React.FC<CatalogDeleteModalProps> = ({
  item,
  onClose,
  onConfirmDelete,
  submitting = false,
}) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0a1225] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5 shrink-0" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide">Xác Nhận Xóa Dịch Vụ Kho</h2>
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
          Bạn có chắc chắn muốn xóa dịch vụ{" "}
          <strong className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            {item.name}
          </strong>{" "}
          khỏi Danh Mục Kho không?
        </p>

        {/* Validated Status Box */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Kho hoàn toàn trống (Tồn kho: 0 Slots, Giữ chỗ: 0 Slots) - Đủ điều kiện xóa an toàn.</span>
          </div>

          <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            ⚠️ Lưu ý: Sau khi xóa, dịch vụ này sẽ không còn xuất hiện trong danh mục phân loại kho hàng.
          </p>
        </div>

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
            {submitting ? "Đang xóa..." : "Xóa Dịch Vụ"}
          </button>
        </div>
      </div>
    </div>
  );
};
