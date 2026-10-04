import React from "react";
import { PlusCircle, Pencil, X } from "lucide-react";
import { Supplier, EditingSupplierCostState } from "../types";

interface SupplierCostModalProps {
  addSupplierProductId: number | null;
  onCloseAddModal: () => void;
  supplierForm: { supplier_id: number; price: number };
  setSupplierForm: React.Dispatch<React.SetStateAction<{ supplier_id: number; price: number }>>;
  allSuppliers: Supplier[];
  onAddSubmit: (e: React.FormEvent) => void;

  editingSupplierCost: EditingSupplierCostState | null;
  onCloseEditModal: () => void;
  setEditingSupplierCost: React.Dispatch<React.SetStateAction<EditingSupplierCostState | null>>;
  onEditSubmit: (e: React.FormEvent) => void;

  submitting: boolean;
}

export const SupplierCostModal: React.FC<SupplierCostModalProps> = ({
  addSupplierProductId,
  onCloseAddModal,
  supplierForm,
  setSupplierForm,
  allSuppliers,
  onAddSubmit,
  editingSupplierCost,
  onCloseEditModal,
  setEditingSupplierCost,
  onEditSubmit,
  submitting,
}) => {
  if (addSupplierProductId !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="w-full max-w-sm bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-cyan-400" />
              Thêm Nguồn Giá NCC
            </h2>
            <button
              onClick={onCloseAddModal}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={onAddSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Chọn Nhà Cung Cấp *</label>
              <select
                value={supplierForm.supplier_id}
                onChange={(e) => setSupplierForm({ ...supplierForm, supplier_id: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value={0}>-- Chọn nhà cung cấp --</option>
                {allSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.supplier_name} {s.number_bank ? `(${s.number_bank})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Giá Nhập Nguồn (₫) *</label>
              <input
                type="number"
                required
                placeholder="VD: 200000"
                value={supplierForm.price || ""}
                onChange={(e) => setSupplierForm({ ...supplierForm, price: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onCloseAddModal}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {submitting ? "Đang lưu..." : "Thêm Nguồn"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (editingSupplierCost !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="w-full max-w-sm bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-400" />
              Sửa Giá Nhập NCC
            </h2>
            <button
              onClick={onCloseEditModal}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={onEditSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Nhà Cung Cấp</label>
              <input
                type="text"
                disabled
                value={editingSupplierCost.supplierName}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 font-semibold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Giá Nhập Nguồn Mới (₫) *</label>
              <input
                type="number"
                required
                placeholder="VD: 250000"
                value={editingSupplierCost.price || ""}
                onChange={(e) =>
                  setEditingSupplierCost({
                    ...editingSupplierCost,
                    price: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onCloseEditModal}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {submitting ? "Đang lưu..." : "Lưu Thay Đổi"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return null;
};
