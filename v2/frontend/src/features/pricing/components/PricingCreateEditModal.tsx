import React from "react";
import { Plus, Pencil, X } from "lucide-react";
import { PricingItem, ProductFormData } from "../types";

interface PricingCreateEditModalProps {
  isOpen: boolean;
  editingItem: PricingItem | null;
  onClose: () => void;
  productForm: ProductFormData;
  setProductForm: React.Dispatch<React.SetStateAction<ProductFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export const PricingCreateEditModal: React.FC<PricingCreateEditModalProps> = ({
  isOpen,
  editingItem,
  onClose,
  productForm,
  setProductForm,
  onSubmit,
  submitting,
}) => {
  if (!isOpen && !editingItem) return null;

  const isEdit = Boolean(editingItem);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            {isEdit ? (
              <>
                <Pencil className="w-5 h-5 text-amber-400" />
                Sửa Bảng Giá Sản Phẩm
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-cyan-400" />
                Tạo Sản Phẩm & Bảng Giá Mới
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
            <label className="block text-slate-400 mb-1 font-semibold">Tên Sản Phẩm *</label>
            <input
              type="text"
              required
              placeholder="VD: Adobe Creative Cloud"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Tên Gói / Biến Thể</label>
            <input
              type="text"
              placeholder="VD: Adobe 1PC --1m"
              value={productForm.variant_name}
              onChange={(e) => setProductForm({ ...productForm, variant_name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Giá Gốc (₫)</label>
              <input
                type="number"
                value={productForm.base_price}
                onChange={(e) => setProductForm({ ...productForm, base_price: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Giá Bán Lẻ (₫)</label>
              <input
                type="number"
                value={productForm.retail_price}
                onChange={(e) => setProductForm({ ...productForm, retail_price: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Giá CTV (₫)</label>
              <input
                type="number"
                value={productForm.ctv_price}
                onChange={(e) => setProductForm({ ...productForm, ctv_price: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Giá Sinh Viên (₫)</label>
              <input
                type="number"
                value={productForm.student_price}
                onChange={(e) => setProductForm({ ...productForm, student_price: Number(e.target.value) })}
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
