import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type ProductInfoHeaderProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddCategoryClick?: () => void;
};

export const ProductInfoHeader: React.FC<ProductInfoHeaderProps> = ({
  searchTerm,
  onSearchChange,
  onAddCategoryClick,
}) => {
  return (
    <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        {/* Search Group */}
        <div className="relative w-full lg:flex-1">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300 pointer-events-none z-10 opaciy-70" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc mã sản phẩm..."
            className="w-full pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            style={{ paddingLeft: '3.25rem' }}
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        {/* Action Group */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
          <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>
          
          {onAddCategoryClick && (
            <button
              className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-semibold rounded-2xl transition-all flex items-center gap-2"
              onClick={onAddCategoryClick}
              type="button"
            >
              Thêm Danh Mục
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
