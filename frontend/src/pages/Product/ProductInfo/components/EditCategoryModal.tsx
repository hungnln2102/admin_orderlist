import React from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CategoryItem } from "../utils/productInfoHelpers";

type EditCategoryModalProps = {
  open: boolean;
  packageName: string;
  categoryOptions: CategoryItem[];
  selectedCategoryIds: number[];
  saving: boolean;
  error?: string | null;
  onPackageNameChange: (value: string) => void;
  onToggleCategory: (categoryId: number) => void;
  onClose: () => void;
  onSave: () => void;
};

const FALLBACK_COLORS = [
  "#facc15",
  "#f97316",
  "#22c55e",
  "#38bdf8",
  "#a855f7",
  "#f43f5e",
  "#14b8a6",
  "#eab308",
];

const getCategoryColor = (category: CategoryItem, index: number): string =>
  category.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  open,
  packageName,
  categoryOptions,
  selectedCategoryIds,
  saving,
  error,
  onPackageNameChange,
  onToggleCategory,
  onClose,
  onSave,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-start justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-3xl rounded-2xl bg-[#0b1220] border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">
            Chỉnh sửa gói sản phẩm và danh mục
          </h2>
          <button
            type="button"
            className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition"
            onClick={onClose}
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
              Gói sản phẩm
            </label>
            <input
              type="text"
              value={packageName}
              onChange={(event) => onPackageNameChange(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="Nhập tên gói sản phẩm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs uppercase tracking-wide text-white/60">
                Danh mục
              </label>
              <span className="text-xs text-white/50">
                Đã chọn: {selectedCategoryIds.length}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {categoryOptions.map((category, index) => {
                const selected = selectedCategoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onToggleCategory(category.id)}
                    className={`category-pill inline-flex items-center gap-1 transition ${
                      selected
                        ? "ring-2 ring-white/40"
                        : "opacity-80 hover:opacity-100"
                    }`}
                    style={{
                      backgroundColor: getCategoryColor(category, index),
                    }}
                  >
                    {selected && <CheckIcon className="h-3 w-3" />}
                    {category.name}
                  </button>
                );
              })}
              {categoryOptions.length === 0 && (
                <div className="text-sm text-white/60">
                  Không có danh mục để chọn.
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition"
            onClick={onClose}
            disabled={saving}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-60"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
};
