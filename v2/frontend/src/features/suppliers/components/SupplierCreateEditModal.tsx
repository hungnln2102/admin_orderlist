import React from "react";
import { Plus, Pencil, X } from "lucide-react";
import { SupplierItem, SupplierFormData } from "../types";

interface SupplierCreateEditModalProps {
  isOpen: boolean;
  editingSupplier: SupplierItem | null;
  onClose: () => void;
  formData: SupplierFormData;
  setFormData: React.Dispatch<React.SetStateAction<SupplierFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export const SupplierCreateEditModal: React.FC<SupplierCreateEditModalProps> = ({
  isOpen,
  editingSupplier,
  onClose,
  formData,
  setFormData,
  onSubmit,
  submitting,
}) => {
  if (!isOpen && !editingSupplier) return null;

  const isEdit = Boolean(editingSupplier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            {isEdit ? (
              <>
                <Pencil className="w-5 h-5 text-amber-400" />
                Cập Nhật Nhà Cung Cấp
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-cyan-400" />
                Thêm Nhà Cung Cấp Mới
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Tên Nhà Cung Cấp *</label>
            <input
              type="text"
              required
              placeholder="VD: @rocky_VIVA"
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Số Tài Khoản / Liên Hệ</label>
            <input
              type="text"
              placeholder="VD: 0966754017"
              value={formData.number_bank}
              onChange={(e) => setFormData({ ...formData, number_bank: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Mã Ngân Hàng (Bin Bank)</label>
              <input
                type="text"
                placeholder="VD: 970422"
                value={formData.bin_bank}
                onChange={(e) => setFormData({ ...formData, bin_bank: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Tên Chủ Tài Khoản</label>
              <input
                type="text"
                placeholder="VD: LA VAN HOP"
                value={formData.account_holder}
                onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded-xl font-bold hover:brightness-110 disabled:opacity-50 transition-all ${
                isEdit ? "bg-amber-400 text-slate-950" : "bg-cyan-500 text-slate-950"
              }`}
            >
              {submitting ? "Đang xử lý..." : isEdit ? "Lưu Thay Đổi" : "Xác Nhận Tạo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
