import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type ProductInfoHeaderProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddClick?: () => void;
  onAddCategoryClick?: () => void;
};

export const ProductInfoHeader: React.FC<ProductInfoHeaderProps> = ({
  searchTerm,
  onSearchChange,
  onAddClick,
  onAddCategoryClick,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px] max-w-xl">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc mã sản phẩm..."
          className="w-full bg-[#0f1729] border border-white/10 text-white placeholder:text-white/50 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
      </div>
      <button
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow"
        onClick={onAddClick}
        type="button"
      >
        Thêm Sản Phẩm Mới
      </button>
      {onAddCategoryClick && (
        <button
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow"
          onClick={onAddCategoryClick}
          type="button"
        >
          Thêm Danh Mục
        </button>
      )}
    </div>
  );
};
