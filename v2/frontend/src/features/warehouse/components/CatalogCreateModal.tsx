import React from "react";
import { Layers, X } from "lucide-react";
import { CatalogFormData } from "../types";

interface CatalogCreateModalProps {
  open: boolean;
  formData: CatalogFormData;
  onClose: () => void;
  onFormChange: (data: CatalogFormData) => void;
  onSubmit: () => void;
}

export const CatalogCreateModal: React.FC<CatalogCreateModalProps> = ({
  open,
  formData,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span>Thêm Dịch Vụ Mới</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Tên Dịch Vụ / Gói (*)</label>
            <input
              type="text"
              placeholder="Ví dụ: Office 365 E5 License"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Chuyên Mục (*)</label>
            <select
              value={formData.category}
              onChange={(e) => onFormChange({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-purple-500"
            >
              <option value="Thiết Kế Đồ Họa">Thiết Kế Đồ Họa</option>
              <option value="Giải Trí & Phim">Giải Trí & Phim</option>
              <option value="Trí Tuệ Nhân Tạo AI">Trí Tuệ Nhân Tạo AI</option>
              <option value="Âm Nhạc">Âm Nhạc</option>
              <option value="Văn Phòng & Phần Mềm">Văn Phòng & Phần Mềm</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
          >
            Thêm Dịch Vụ
          </button>
        </div>
      </div>
    </div>
  );
};
