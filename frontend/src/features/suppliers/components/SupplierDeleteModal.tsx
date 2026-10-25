import React from "react";
import { AlertTriangle } from "lucide-react";
import { SupplierItem } from "../types";

interface SupplierDeleteModalProps {
  deletingSupplier: SupplierItem | null;
  onClose: () => void;
  onConfirmDelete: () => void;
  submitting: boolean;
}

export const SupplierDeleteModal: React.FC<SupplierDeleteModalProps> = ({
  deletingSupplier,
  onClose,
  onConfirmDelete,
  submitting,
}) => {
  if (!deletingSupplier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 text-rose-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h2 className="text-base font-bold text-white">Xác Nhận Xóa Nhà Cung Cấp</h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Bạn có chắc chắn muốn xóa nhà cung cấp <strong className="text-white">{deletingSupplier.supplier_name}</strong>? Hành động này không thể hoàn tác.
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
            {submitting ? "Đang xóa..." : "Xóa Nhà Cung Cấp"}
          </button>
        </div>
      </div>
    </div>
  );
};
