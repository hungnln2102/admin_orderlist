import React, { useState, useEffect } from "react";
import { Layers, X, Plus, List, Sparkles, HardDrive } from "lucide-react";

interface CategoryModalProps {
  open: boolean;
  categoryName: string;
  catalogNames?: string[];
  isEditing?: boolean;
  requiresStorage?: boolean;
  onClose: () => void;
  onNameChange: (val: string) => void;
  onRequiresStorageChange?: (val: boolean) => void;
  onSubmit: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  open,
  categoryName,
  catalogNames = [],
  isEditing = false,
  requiresStorage = false,
  onClose,
  onNameChange,
  onRequiresStorageChange,
  onSubmit,
}) => {
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      if (isEditing) {
        setIsCustomMode(true);
      } else {
        setIsCustomMode(false);
      }
    }
  }, [open, isEditing]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && categoryName.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0a1225] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            {isEditing ? "Chỉnh Sửa Loại Gói" : "Thêm Loại Gói Sản Phẩm"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div>
          <label className="block text-slate-400 text-xs mb-1.5 font-medium">
            {isCustomMode ? "Tên Sản Phẩm / Loại Gói Mới *" : "Chọn Sản Phẩm / Loại Gói *"}
          </label>

          {!isCustomMode ? (
            <div>
              <div className="flex gap-2 items-center">
                <select
                  value={categoryName}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="" className="bg-[#0a1225] text-slate-400">
                    -- Chọn sản phẩm từ Master Catalog --
                  </option>
                  {catalogNames.map((name) => (
                    <option key={name} value={name} className="bg-[#0a1225] text-white">
                      {name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(true);
                    onNameChange("");
                  }}
                  title="Tạo tên sản phẩm mới nếu chưa có trong danh sách"
                  className="p-2.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-400 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                <span>💡 Nếu sản phẩm chưa có trong danh sách, bấm</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px] border border-cyan-500/30">
                  +
                </span>
                <span>để tạo mới.</span>
              </p>
            </div>
          ) : (
            <div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Nhập tên sản phẩm mới (ví dụ: Microsoft 365, Spotify...)"
                  value={categoryName}
                  onChange={(e) => onNameChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="w-full bg-slate-950 border border-cyan-500/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 shadow-inner"
                />
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(false)}
                    title="Quay lại danh sách sản phẩm"
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                  >
                    <List className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-[11px] text-cyan-400/90 mt-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Sản phẩm mới sẽ được tự động thêm vào bảng Master Catalog (warehouse.product_names).</span>
              </p>
            </div>
          )}
        </div>

        {/* Cấu hình Storage Account */}
        <div className="pt-3 border-t border-slate-800/80">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                checked={requiresStorage}
                onChange={(e) => onRequiresStorageChange?.(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                Sử dụng tài khoản dung lượng / liên kết (Storage Account)
              </span>
              <p className="text-[11px] text-slate-400">
                Kích hoạt cho các loại gói cần 2 tài khoản (VD: Canva, Google One, Adobe Cloud: 1 tài khoản gốc + 1 tài khoản dung lượng liên kết).
              </p>
            </div>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
            disabled={!categoryName.trim()}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-cyan-600/20"
          >
            Lưu Loại Gói
          </button>
        </div>
      </div>
    </div>
  );
};
