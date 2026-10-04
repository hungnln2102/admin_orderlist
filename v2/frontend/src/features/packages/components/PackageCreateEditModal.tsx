import React from "react";
import { Package, X } from "lucide-react";
import { PackageItem, PackageFormData } from "../types";

interface PackageCreateEditModalProps {
  open: boolean;
  editingItem: PackageItem | null;
  selectedCategory: string;
  formData: PackageFormData;
  onClose: () => void;
  onFormChange: (data: PackageFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const PackageCreateEditModal: React.FC<PackageCreateEditModalProps> = ({
  open,
  editingItem,
  selectedCategory,
  formData,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0a1225] border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-400" />
            {editingItem ? "Chỉnh Sửa Gói Sản Phẩm" : `Thêm Gói Mới vào loại ${selectedCategory}`}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Tên Gói *</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Adobe 1PC Cố Định"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Thông Tin Gói / Tài Khoản *</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: user@domain.com | pass123"
              value={formData.accountInfo}
              onChange={(e) => onFormChange({ ...formData, accountInfo: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Số Slot Đã Dùng</label>
              <input
                type="number"
                min={0}
                value={formData.usedSlots}
                onChange={(e) => onFormChange({ ...formData, usedSlots: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Tổng Số Slot (Vị Trí)</label>
              <input
                type="number"
                min={1}
                value={formData.totalSlots}
                onChange={(e) => onFormChange({ ...formData, totalSlots: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Nhà Cung Cấp (NCC)</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => onFormChange({ ...formData, supplier: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-purple-300 font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Giá Nhập (₫)</label>
              <input
                type="number"
                value={formData.costPrice}
                onChange={(e) => onFormChange({ ...formData, costPrice: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-bold font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Ngày Hết Hạn</label>
            <input
              type="date"
              value={formData.expiredAt}
              onChange={(e) => onFormChange({ ...formData, expiredAt: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-bold font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Lưu Gói Sản Phẩm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
