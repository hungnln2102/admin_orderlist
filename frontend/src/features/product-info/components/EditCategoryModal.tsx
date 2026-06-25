import React, { useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { CategoryItem } from "../utils/productInfoHelpers";
import { ProductImagePicker } from "./ProductImagePicker";
import CategoryTagManager from "./CategoryTagManager";
import { CategorySelectionGrid } from "./CategorySelectionGrid";
import { EditCategoryModalFooter } from "./EditCategoryModalFooter";
import { EditCategoryModalTabs } from "./EditCategoryModalTabs";

type EditCategoryModalProps = {
  open: boolean;
  /** `product.id` — đổi tên gói = cập nhật theo id này, không tìm theo chuỗi tên. */
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

type TabType = "edit" | "manage";

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
        <EditCategoryModalTabs activeTab={activeTab} onTabChange={setActiveTab} />

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
            <CategoryTagManager onCategoriesChange={handleCategoriesChange} />
          )}
        </div>

        {/* Footer Actions - Only show for Edit tab */}
        {activeTab === "edit" && (
          <EditCategoryModalFooter
            saving={saving}
            onClose={onClose}
            onSave={onSave}
          />
        )}
      </div>
    </div>
    </ModalPortal>
  );
};
