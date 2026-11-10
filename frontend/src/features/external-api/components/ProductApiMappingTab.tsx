import React from "react";
import { Search, Package, Plus, Trash2, Link2, AlertCircle, Sparkles } from "lucide-react";
import type { ProductItem } from "@/features/external-api/types";

interface ProductApiMappingTabProps {
  products: ProductItem[];
  filteredProducts: ProductItem[];
  availableApis: any[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  productFilter: "ALL" | "ASSIGNED" | "UNASSIGNED";
  onFilterChange: (filter: "ALL" | "ASSIGNED" | "UNASSIGNED") => void;
  onAssignProvider: (productId: number, providerKey: string) => void;
  onRemoveMapping: (mappingId: number) => void;
}

export const ProductApiMappingTab: React.FC<ProductApiMappingTabProps> = ({
  products,
  filteredProducts,
  availableApis,
  searchQuery,
  onSearchChange,
  productFilter,
  onFilterChange,
  onAssignProvider,
  onRemoveMapping,
}) => {
  const assignedCount = products.filter((p) => p.apis && p.apis.length > 0).length;

  return (
    <div className="space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên sản phẩm hoặc ID gói..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onFilterChange("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              productFilter === "ALL"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
            }`}
          >
            Tất cả ({products.length})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange("ASSIGNED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              productFilter === "ASSIGNED"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
            }`}
          >
            Đã gán API ({assignedCount})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange("UNASSIGNED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              productFilter === "UNASSIGNED"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
            }`}
          >
            Chưa gán ({products.length - assignedCount})
          </button>
        </div>
      </div>

      {/* Product List */}
      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Không tìm thấy gói sản phẩm nào phù hợp.</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const hasMappings = product.apis && product.apis.length > 0;

            return (
              <div
                key={product.id}
                className="p-4 sm:p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-100 text-base">{product.package_name}</h3>
                        <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
                          #{product.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {product.variants_count} biến thể gói •{" "}
                        <span className={product.is_active ? "text-emerald-400" : "text-slate-500"}>
                          {product.is_active ? "Đang kinh doanh" : "Ngừng kinh doanh"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Assign dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        void onAssignProvider(product.id, e.target.value);
                        e.currentTarget.value = "";
                      }}
                      className="text-xs font-medium bg-slate-950 border border-slate-700 hover:border-cyan-500/60 text-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
                    >
                      <option value="">+ Gán Provider Mới</option>
                      {availableApis.map((api) => {
                        const val = api.provider_key || api.service_key;
                        return (
                          <option key={val} value={val}>
                            {api.service_name} ({val})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Assigned Providers Badges */}
                <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5" />
                    Provider liên kết:
                  </span>

                  {!hasMappings ? (
                    <span className="text-xs text-slate-500 italic">
                      Chưa gán provider nào (sẽ sử dụng kênh cấp tài khoản thủ công)
                    </span>
                  ) : (
                    product.apis.map((api: any) => (
                      <span
                        key={api.mapping_id}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-medium shadow-sm"
                      >
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>{api.service_name || api.provider_key}</span>
                        <span className="text-[10px] font-mono text-slate-500">({api.provider_key})</span>
                        <button
                          type="button"
                          onClick={() => onRemoveMapping(api.mapping_id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors ml-1"
                          title="Gỡ bỏ liên kết"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
