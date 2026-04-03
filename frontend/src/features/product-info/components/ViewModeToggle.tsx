import React from "react";

interface ViewModeToggleProps {
  viewMode: "products" | "categories";
  onViewModeChange: (mode: "products" | "categories") => void;
}

/**
 * ViewModeToggle Component
 * Toggle between products and categories view
 */
export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="product-info-view-toggle grid grid-cols-1 gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onViewModeChange("products")}
        aria-pressed={viewMode === "products"}
        className={`product-info-view-toggle__button rounded-2xl border px-5 py-4 text-left transition-all ${
          viewMode === "products"
            ? "product-info-view-toggle__button--active border-blue-400/50 bg-blue-500/15 shadow-lg shadow-blue-500/10"
            : "border-white/10 bg-white/5 hover:bg-white/10"
        }`}
      >
        <p className="product-info-view-toggle__title text-lg font-semibold text-white">
          Sản phẩm
        </p>
        <p className="product-info-view-toggle__description mt-1 text-xs text-white/60">
          Hiển thị thông tin sản phẩm
        </p>
      </button>

      <button
        type="button"
        onClick={() => onViewModeChange("categories")}
        aria-pressed={viewMode === "categories"}
        className={`product-info-view-toggle__button rounded-2xl border px-5 py-4 text-left transition-all ${
          viewMode === "categories"
            ? "product-info-view-toggle__button--active border-blue-400/50 bg-blue-500/15 shadow-lg shadow-blue-500/10"
            : "border-white/10 bg-white/5 hover:bg-white/10"
        }`}
      >
        <p className="product-info-view-toggle__title text-lg font-semibold text-white">
          Danh mục
        </p>
        <p className="product-info-view-toggle__description mt-1 text-xs text-white/60">
          Danh sách sản phẩm theo danh mục
        </p>
      </button>
    </div>
  );
};
