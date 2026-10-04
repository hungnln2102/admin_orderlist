import React from "react";
import { Layers, X } from "lucide-react";

interface CategoryModalProps {
  open: boolean;
  categoryName: string;
  onClose: () => void;
  onNameChange: (val: string) => void;
  onSubmit: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  open,
  categoryName,
  onClose,
  onNameChange,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0a1225] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" /> Tạo / Sửa Loại Gói
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1 font-medium">Tên Loại Gói Mới *</label>
          <input
            type="text"
            placeholder="Ví dụ: Microsoft 365, Spotify..."
            value={categoryName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Lưu Loại Gói
          </button>
        </div>
      </div>
    </div>
  );
};
