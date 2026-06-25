import React from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { CategoryItem } from "../utils/productInfoHelpers";
import { getCategoryColor, isGradientCssValue } from "../utils/categoryColors";

type CategorySelectionGridProps = {
  categoryOptions: CategoryItem[];
  selectedCategoryIds: number[];
  onToggleCategory: (categoryId: number) => void;
};

export const CategorySelectionGrid: React.FC<CategorySelectionGridProps> = ({
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
