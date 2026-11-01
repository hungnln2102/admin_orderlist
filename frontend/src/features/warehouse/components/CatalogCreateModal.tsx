import React from "react";
import { Layers, X, Package, Tag } from "lucide-react";
import { CatalogFormData, SystemProduct } from "../types";
import { DEFAULT_SUGGESTED_TAGS } from "./CatalogEditModal";

interface CatalogCreateModalProps {
  open: boolean;
  formData: CatalogFormData;
  systemProducts?: SystemProduct[];
  onClose: () => void;
  onFormChange: (data: CatalogFormData) => void;
  onSubmit: () => void;
}

export const CatalogCreateModal: React.FC<CatalogCreateModalProps> = ({
  open,
  formData,
  systemProducts = [],
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

        <div className="space-y-3.5 text-xs sm:text-sm">
          {/* Tên dịch vụ */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Tên Dịch Vụ / Gói (*)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: GoogleOne 5000gb, Office 365, Mail..."
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Sản phẩm liên kết */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sản Phẩm Hệ Thống Liên Kết (Tùy chọn)</span>
            </label>
            <select
              value={formData.productId || ""}
              onChange={(e) =>
                onFormChange({
                  ...formData,
                  productId: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-purple-500"
            >
              <option value="">-- Không liên kết (Dịch vụ tự do) --</option>
              {systemProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              💡 Dùng để liên kết với loại sản phẩm bán hàng trong hệ thống (VD: Google One, Adobe...).
            </p>
          </div>

          {/* Tag Phân Loại / Biến Thể */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span>Tag Phân Loại / Biến Thể (*)</span>
              </label>
              {formData.category && (
                <span className="text-[11px] text-purple-400 font-mono">
                  Tag: [{formData.category}]
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                list="create-suggested-tags-list"
                placeholder="Nhập hoặc chọn tag (VD: 5Tb, 2Tb, 1PC Cố Định, Slot Team...)"
                value={formData.category || ""}
                onChange={(e) => onFormChange({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono text-xs sm:text-sm"
              />
              <datalist id="create-suggested-tags-list">
                {DEFAULT_SUGGESTED_TAGS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            {/* Quick Tag Pills */}
            <div className="mt-2 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Gợi ý tag có sẵn (Bấm chọn hoặc tự nhập mới):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                {DEFAULT_SUGGESTED_TAGS.map((t) => {
                  const isSelected =
                    (formData.category || "").toLowerCase().trim() === t.toLowerCase().trim();
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onFormChange({ ...formData, category: t })}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-600 text-white font-bold border border-purple-400 shadow-sm shadow-purple-600/30 scale-105"
                          : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Preview Badge */}
            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Xem trước hiển thị:</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>{formData.name || "Tên dịch vụ"}</span>
                {formData.category?.trim() && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-white/10 text-white border border-white/10 lowercase first-letter:uppercase">
                    [{formData.category.trim()}]
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* URL Đăng nhập */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              URL Trang Đăng Nhập (Tùy chọn)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: https://accounts.google.com, https://netflix.com/login..."
              value={formData.loginUrl || ""}
              onChange={(e) => onFormChange({ ...formData, loginUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              💡 Dùng để tự động mở trang web với Profile Chrome riêng biệt cho từng tài khoản.
            </p>
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
