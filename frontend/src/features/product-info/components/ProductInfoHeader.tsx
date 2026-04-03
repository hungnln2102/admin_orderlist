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
    <div className="product-info-toolbar rounded-[32px] border p-4 lg:p-5">
      <div className="product-info-toolbar__inner flex flex-col items-center gap-4 lg:flex-row">
        <div className="product-info-toolbar__search relative w-full lg:flex-1">
          <MagnifyingGlassIcon className="product-info-toolbar__icon pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-indigo-300" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc mã sản phẩm..."
            className="product-info-toolbar__input w-full rounded-2xl border py-2.5 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-400/70"
            style={{ paddingLeft: "3.25rem" }}
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <div className="product-info-toolbar__actions mt-2 flex w-full flex-wrap items-center gap-3 lg:mt-0 lg:w-auto">
          <div className="product-info-toolbar__divider mx-1 hidden h-8 w-px lg:block"></div>

          {onAddCategoryClick && (
            <button
              className="product-info-toolbar__button flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-semibold text-white transition-all"
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
