import React, { useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { XMarkIcon, ArrowPathIcon, CheckIcon } from "@heroicons/react/24/outline";
import { CategoryItem } from "../../utils/productInfoHelpers";
import { getCategoryVisualStyle, getCategoryColor, isGradientCssValue } from "../../utils/categoryColors";
import { ProductImagePicker } from "../product/ProductImagePicker";
import { CategoryTags } from "./CategoryTags";

// ============================================================================
// 1. CREATE CATEGORY MODAL (Tạo danh mục mới)
// ============================================================================

export type CreateCategoryModalProps = {
  open: boolean;
  name: string;
  color: string;
  saving: boolean;
  error?: string | null;
  onNameChange: (value: string) => void;
  onShuffleColor: () => void;
  onClose: () => void;
  onSave: () => void;
};

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  open,
  name,
  color,
  saving,
  error,
  onNameChange,
  onShuffleColor,
  onClose,
  onSave,
}) => {
  if (!open) return null;
  const trimmedName = (name || "").trim();
  const disableSave = saving || !trimmedName;
  const previewStyle = color
    ? getCategoryVisualStyle(color)
    : { backgroundColor: "rgba(148, 163, 184, 0.25)" };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 px-4 py-8">
        <div className="w-full max-w-xl rounded-2xl bg-[#0b1220] border border-white/10 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Tạo danh mục mới</h2>
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
                Tên danh mục
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Nhập tên danh mục"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                Màu sắc
              </label>
              <p className="text-xs text-white/45 mb-3">
                Hệ thống gán gradient ngẫu nhiên, không trùng với danh mục hiện có.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="h-12 w-20 shrink-0 rounded-lg border border-white/10 shadow-inner"
                  style={previewStyle}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white/80 break-all max-h-20 overflow-y-auto">
                  {color || "?"}
                </div>
                <button
                  type="button"
                  onClick={onShuffleColor}
                  disabled={saving}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-50"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Màu khác
                </button>
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
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-60"
              onClick={onSave}
              disabled={disableSave}
            >
              {saving ? "Đang tạo..." : "Tạo danh mục"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

// ============================================================================
// 2. CATEGORY SELECTION GRID (Lưới chọn danh mục cho gói)
// ============================================================================

type CategorySelectionGridProps = {
  categoryOptions: CategoryItem[];
  selectedCategoryIds: number[];
  onToggleCategory: (categoryId: number) => void;
};

const CategorySelectionGrid: React.FC<CategorySelectionGridProps> = ({
  categoryOptions,
  selectedCategoryIds,
  onToggleCategory,
}) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
        Danh Mục
      </label>
      <span className="text-xs font-medium text-indigo-400 bg-indigo-500/20 px-3 py-1.5 rounded-full">
        Đã chọn: {selectedCategoryIds.length}
      </span>
    </div>
    <div className="flex flex-wrap gap-2.5">
      {categoryOptions.map((category, index) => {
        const selected = selectedCategoryIds.includes(category.id);
        const baseColor = getCategoryColor(category, index);
        const isGrad = isGradientCssValue(baseColor);

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onToggleCategory(category.id)}
            className={`group relative inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-200 ${
              selected
                ? "shadow-lg scale-105"
                : "opacity-70 hover:opacity-90 shadow-sm hover:shadow-md hover:scale-102"
            }`}
            style={{
              background: isGrad
                ? baseColor
                : `linear-gradient(135deg, ${baseColor} 0%, ${baseColor}dd 100%)`,
              color: "#ffffff",
              textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
              border: selected
                ? "2px solid rgba(255, 255, 255, 0.8)"
                : "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: selected
                ? isGrad
                  ? "0 0 0 3px rgba(255, 255, 255, 0.35), 0 4px 12px rgba(0, 0, 0, 0.3)"
                  : `0 0 0 3px ${baseColor}40, 0 4px 12px rgba(0, 0, 0, 0.3)`
                : undefined,
            }}
          >
            {selected && (
              <div
                className="absolute inset-0 rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)",
                }}
              />
            )}

            {!selected && (
              <div
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)",
                }}
              />
            )}

            <span className="relative z-10 flex items-center gap-1.5">
              {selected && <CheckIcon className="h-3.5 w-3.5" />}
              {category.name}
            </span>
          </button>
        );
      })}
      {categoryOptions.length === 0 && (
        <div className="w-full text-center py-12 rounded-2xl border border-white/10 bg-slate-800/30">
          <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-sm text-slate-400 font-medium">
            Không có danh mục để chọn
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Hãy tạo danh mục mới trong tab "Quản Lý Danh Mục"
          </p>
        </div>
      )}
    </div>
  </div>
);

// ============================================================================
// 3. EDIT CATEGORY MODAL (Chỉnh sửa gói và danh mục)
// ============================================================================

type TabType = "edit" | "manage";

export type EditCategoryModalProps = {
  open: boolean;
  catalogProductId?: number | null;
  packageName: string;
  imageUrl: string;
  categoryOptions: CategoryItem[];
  selectedCategoryIds: number[];
  saving: boolean;
  error?: string | null;
  onPackageNameChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
  onToggleCategory: (categoryId: number) => void;
  onClose: () => void;
  onSave: () => void;
  onCategoriesReload?: () => void;
  onProductImagesChanged?: () => void;
};

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  open,
  catalogProductId,
  packageName,
  imageUrl,
  categoryOptions,
  selectedCategoryIds,
  saving,
  error,
  onPackageNameChange,
  onImageUrlChange,
  onToggleCategory,
  onClose,
  onSave,
  onCategoriesReload,
  onProductImagesChanged,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("edit");

  if (!open) return null;

  const handleCategoriesChange = () => {
    onCategoriesReload?.();
  };

  const inputBase =
    "w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-inner focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all";

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="relative flex w-full max-w-6xl flex-col rounded-[32px] border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl max-h-[95vh] overflow-hidden">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 z-10 rounded-full bg-slate-800/80 p-2 text-slate-400 backdrop-blur-sm transition-all hover:bg-slate-700 hover:text-white"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Header */}
          <div className="border-b border-white/10 px-8 py-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Chỉnh sửa gói sản phẩm và danh mục
            </h2>
            <p className="text-sm text-slate-400 mt-1">Quản lý thông tin gói sản phẩm và danh mục</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/10 px-8 bg-slate-900/50">
            <button
              onClick={() => setActiveTab("edit")}
              className={`py-4 px-6 font-medium text-sm transition-all relative ${
                activeTab === "edit"
                  ? "text-indigo-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Chỉnh sửa Gói
              {activeTab === "edit" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_-2px_10px_rgba(99,102,241,0.5)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`py-4 px-6 font-medium text-sm transition-all relative ${
                activeTab === "manage"
                  ? "text-indigo-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Quản Lý Danh Mục
              {activeTab === "manage" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_-2px_10px_rgba(99,102,241,0.5)]" />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {activeTab === "edit" ? (
              <div className="grid gap-8 lg:grid-cols-3">
                {/* Left Column: Image */}
                <div className="lg:col-span-1">
                  <div className="sticky top-0">
                    <ProductImagePicker
                      imageUrl={imageUrl}
                      onImageUrlChange={onImageUrlChange}
                      onProductImagesChanged={onProductImagesChanged}
                    />
                  </div>
                </div>

                {/* Right Column: Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Package Name */}
                  <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-6 shadow-sm backdrop-blur-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide block">
                        Gói Sản Phẩm
                      </label>
                      {catalogProductId != null && catalogProductId > 0 && (
                        <span
                          className="text-[11px] font-mono text-slate-500"
                          title="ID bản ghi product (schema)"
                        >
                          product.id = {catalogProductId}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={packageName}
                      onChange={(event) => onPackageNameChange(event.target.value)}
                      className={inputBase}
                      placeholder="Nhập tên gói sản phẩm..."
                    />
                  </div>

                  {/* Category Selection */}
                  <CategorySelectionGrid
                    categoryOptions={categoryOptions}
                    selectedCategoryIds={selectedCategoryIds}
                    onToggleCategory={onToggleCategory}
                  />

                  {/* Error Message */}
                  {error && (
                    <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200 flex items-start gap-3">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <CategoryTags onCategoriesChange={handleCategoriesChange} />
            )}
          </div>

          {/* Footer Actions - Only show for Edit tab */}
          {activeTab === "edit" && (
            <div className="flex items-center justify-end gap-3 border-t border-white/10 px-8 py-5 bg-slate-900/50">
              <button
                type="button"
                className="rounded-xl border border-white/20 bg-transparent px-6 py-3 font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-50"
                onClick={onClose}
                disabled={saving}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang lưu...
                  </span>
                ) : (
                  "Lưu thay đổi"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
