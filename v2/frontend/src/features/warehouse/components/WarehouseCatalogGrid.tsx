import React from "react";
import { Plus } from "lucide-react";
import { ServiceNameCategoryItem } from "../types";

interface WarehouseCatalogGridProps {
  catalogItems: ServiceNameCategoryItem[];
  onOpenCreateCatalog: () => void;
  onEditCatalog: (item: ServiceNameCategoryItem) => void;
}

export const WarehouseCatalogGrid: React.FC<WarehouseCatalogGridProps> = ({
  catalogItems,
  onOpenCreateCatalog,
  onEditCatalog,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h3 className="text-base font-bold text-white">Danh Mục Tên Dịch Vụ Kho</h3>
          <p className="text-xs text-slate-400">
            Khai báo danh mục tên gói dịch vụ để phân loại và cảnh báo tồn kho tự động
          </p>
        </div>
        <button
          onClick={onOpenCreateCatalog}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Dịch Vụ Mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalogItems.map((cat) => (
          <div
            key={cat.id}
            className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 backdrop-blur-xl transition-all shadow-xl space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-white text-sm sm:text-base">{cat.name}</h4>
                <span className="text-xs text-slate-400 font-medium">{cat.category}</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                  cat.status === "ACTIVE"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : cat.status === "LOW_STOCK"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "bg-red-500/15 text-red-400 border border-red-500/30"
                }`}
              >
                {cat.status === "ACTIVE"
                  ? "Sẵn hàng"
                  : cat.status === "LOW_STOCK"
                  ? "Sắp hết hàng"
                  : "Hết hàng"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60">
                <span className="text-slate-400 block text-[11px]">TỒN KHO SLOT</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400">{cat.inStockSlots} Slots</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60">
                <span className="text-slate-400 block text-[11px]">ĐÃ GIỮ CHỖ</span>
                <span className="text-sm sm:text-base font-bold text-indigo-400">{cat.reservedSlots} Slots</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => onEditCatalog(cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              >
                Sửa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
