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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => onViewModeChange("products")}
        aria-pressed={viewMode === "products"}
        className={`rounded-2xl border px-5 py-4 text-left transition-all ${
          viewMode === "products"
            ? "border-blue-400/50 bg-blue-500/15 shadow-lg shadow-blue-500/10"
            : "border-white/10 bg-white/5 hover:bg-white/10"
        }`}
      >
        <p className="text-lg font-semibold text-white">Sản phẩm</p>
        <p className="mt-1 text-xs text-white/60">
          Hiển thị thông tin sản phẩm
        </p>
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("categories")}
        aria-pressed={viewMode === "categories"}
        className={`rounded-2xl border px-5 py-4 text-left transition-all ${
          viewMode === "categories"
            ? "border-blue-400/50 bg-blue-500/15 shadow-lg shadow-blue-500/10"
            : "border-white/10 bg-white/5 hover:bg-white/10"
        }`}
      >
        <p className="text-lg font-semibold text-white">Danh mục</p>
        <p className="mt-1 text-xs text-white/60">
          Danh sách sản phẩm theo danh mục
        </p>
      </button>
    </div>
  );
};
