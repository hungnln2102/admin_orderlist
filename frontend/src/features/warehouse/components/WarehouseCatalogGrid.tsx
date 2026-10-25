import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { ServiceNameCategoryItem } from "../types";

interface WarehouseCatalogGridProps {
  catalogItems: ServiceNameCategoryItem[];
  onOpenCreateCatalog: () => void;
  onEditCatalog: (item: ServiceNameCategoryItem) => void;
  onDeleteCatalog?: (item: ServiceNameCategoryItem) => void;
}

export const WarehouseCatalogGrid: React.FC<WarehouseCatalogGridProps> = ({
  catalogItems,
  onOpenCreateCatalog,
  onEditCatalog,
  onDeleteCatalog,
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
        {catalogItems.map((cat) => {
          const total = cat.totalSlots ?? ((cat.inStockSlots || 0) + (cat.reservedSlots || 0));
          const isEmptyStock = total === 0;

          return (
            <div
              key={cat.id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 backdrop-blur-xl transition-all shadow-xl space-y-3 min-w-0 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <h4
                    className="font-bold text-white text-sm sm:text-base truncate block"
                    title={cat.name}
                  >
                    {cat.name}
                  </h4>
                  <span
                    className="text-xs text-slate-400 font-medium truncate block mt-0.5"
                    title={cat.category}
                  >
                    {cat.category}
                  </span>
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
                  <span className="text-slate-400 block text-[11px]">TỔNG SỐ LƯỢNG</span>
                  <span className="text-sm sm:text-base font-bold text-blue-400">{total} Tài khoản</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60">
                  <span className="text-slate-400 block text-[11px]">CHƯA SỬ DỤNG</span>
                  <span className="text-sm sm:text-base font-bold text-emerald-400">{cat.inStockSlots} Tài khoản</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {onDeleteCatalog && (
                  isEmptyStock ? (
                    <button
                      onClick={() => onDeleteCatalog(cat)}
                      title="Xóa dịch vụ khỏi danh mục (Kho đang trống 0 slots)"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      title={`Không thể xóa: Kho vẫn còn ${total} slot. Kho phải trống hoàn toàn (0 slot) mới có thể xóa.`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/40 text-slate-600 border border-slate-800/60 transition-all cursor-not-allowed opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  )
                )}
                <button
                  onClick={() => onEditCatalog(cat)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                >
                  Sửa
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
