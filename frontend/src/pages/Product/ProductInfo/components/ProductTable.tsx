import React from "react";
import Pagination from "../../../../components/ui/Pagination";
import { ProductRow } from "./ProductRow";
import { MergedProduct } from "../utils/productInfoHelpers";

type ProductTableProps = {
  products: MergedProduct[];
  mergedTotal: number;
  loading: boolean;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  expandedId: number | null;
  onToggleExpand: (id: number | null) => void;
  onEdit: (item: MergedProduct) => void;
};

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  mergedTotal,
  loading,
  currentPage,
  pageSize,
  onPageChange,
  expandedId,
  onToggleExpand,
  onEdit,
}) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1220] shadow-xl overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">S §œn Ph §cm</h2>
        {loading && <span className="text-xs text-white/60">Ž?ang t §œi...</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-white/10 text-sm text-white/90">
          <colgroup>
            <col style={{ width: "8%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "25%", minWidth: "240px" }} />
            <col style={{ width: "25%", minWidth: "240px" }} />
            <col style={{ width: "11%", minWidth: "120px" }} />
          </colgroup>
          <thead className="bg-white/5 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-semibold"> §›nh</th>
              <th className="px-4 py-3 text-left font-semibold">MAœ S §œn Ph §cm</th>
              <th className="px-4 py-3 text-left font-semibold">TA¦n S §œn Ph §cm</th>
              <th className="px-5 py-3 text-left font-semibold border-r border-white/10 min-w-[240px]">
                Quy T §_c
              </th>
              <th className="px-5 py-3 text-left font-semibold min-w-[240px] border-r border-white/10">
                MA' T §œ
              </th>
              <th className="px-4 py-3 text-left font-semibold min-w-[120px] text-center">
                Thao TA­c
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.map((item) => (
              <ProductRow
                key={`${item.id}-${item.productId}`}
                item={item}
                isExpanded={expandedId === item.id}
                onToggle={onToggleExpand}
                onEdit={onEdit}
              />
            ))}
            {!loading && products.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-4 text-center text-sm text-white/70"
                >
                  KhA'ng cA3 d ¯_ li ¯Øu product_desc.
                </td>
              </tr>
            )}
            {loading && products.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-4 text-center text-sm text-white/80"
                >
                  Ž?ang t §œi danh sA­ch...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-white/10 px-4 py-3">
        <Pagination
          currentPage={currentPage}
          totalItems={mergedTotal}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
};
