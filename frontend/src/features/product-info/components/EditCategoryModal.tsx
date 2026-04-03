import React, { useState } from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CategoryItem } from "../utils/productInfoHelpers";
import { ProductImagePicker } from "./ProductImagePicker";
import CategoryTagManager from "./CategoryTagManager";

type EditCategoryModalProps = {
  open: boolean;
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
};

type TabType = "edit" | "manage";

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
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("edit");

  if (!open) return null;

  const handleCategoriesChange = () => {
    onCategoriesReload?.();
  };

  const inputBase =
    "w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-inner focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all";

  const labelBase =
    "text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2 block";

  return (
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
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`px-6 py-4 text-sm font-semibold transition-all relative ${
              activeTab === "edit"
                ? "text-indigo-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Chỉnh Sửa Gói
            </span>
            {activeTab === "edit" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manage")}
            className={`px-6 py-4 text-sm font-semibold transition-all relative ${
              activeTab === "manage"
                ? "text-indigo-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Quản Lý Danh Mục
            </span>
            {activeTab === "manage" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
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
                  />
                </div>
              </div>

              {/* Right Column: Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Package Name */}
                <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-6 shadow-sm backdrop-blur-sm">
                  <label className={labelBase}>Gói Sản Phẩm</label>
                  <input
                    type="text"
                    value={packageName}
                    onChange={(event) => onPackageNameChange(event.target.value)}
                    className={inputBase}
                    placeholder="Nhập tên gói sản phẩm..."
                  />
                </div>

                {/* Category Selection */}
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
                            background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor}dd 100%)`,
                            color: '#ffffff',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                            border: selected 
                              ? '2px solid rgba(255, 255, 255, 0.8)' 
                              : '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: selected 
                              ? `0 0 0 3px ${baseColor}40, 0 4px 12px rgba(0, 0, 0, 0.3)` 
                              : undefined,
                          }}
                        >
                          {/* Inner glow effect for selected */}
                          {selected && (
                            <div 
                              className="absolute inset-0 rounded-lg"
                              style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)',
                              }}
                            />
                          )}
                          
                          {/* Hover glow for unselected */}
                          {!selected && (
                            <div 
                              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
                              }}
                            />
                          )}
                          
                          {/* Content */}
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
            <CategoryTagManager onCategoriesChange={handleCategoriesChange} />
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
  );
};
