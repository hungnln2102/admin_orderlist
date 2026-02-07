import React from "react";
import Pagination from "../../../../components/ui/Pagination";
import { ProductRow } from "./ProductRow";
import { ProductCard } from "./ProductCard";
import { ResponsiveTable, TableCard } from "../../../../components/ui/ResponsiveTable";
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
    <div className="product-table rounded-[32px] border border-white/5 bg-slate-900/40 shadow-2xl backdrop-blur-xl overflow-hidden">
      <div className="product-table__header border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h2 className="product-table__title text-lg font-semibold text-white">Sản phẩm</h2>
        {loading && <span className="product-table__loading text-xs text-white/60">Đang tải...</span>}
      </div>
      <ResponsiveTable
        showCardOnMobile={true}
        cardView={
          <TableCard
            data={products as unknown as any[]}
            renderCard={(item) => (
              <ProductCard
                item={item as MergedProduct}
                onEdit={onEdit}
              />
            )}
            className="p-2"
          />
        }
      >
        <table className="product-table__table min-w-full table-fixed divide-y divide-white/10 text-sm text-white/90">
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "12%", minWidth: "160px" }} />
            <col style={{ width: "22%", minWidth: "240px" }} />
            <col style={{ width: "21%", minWidth: "240px" }} />
            <col style={{ width: "7%", minWidth: "120px" }} />
          </colgroup>
          <thead className="product-table__head bg-white/5 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/40">
            <tr>
              <th className="product-table__th px-4 py-3 text-left font-semibold">Hình ảnh</th>
              <th className="px-4 py-3 text-left font-semibold">Mã sản phẩm</th>
              <th className="px-4 py-3 text-left font-semibold">Tên sản phẩm</th>
              <th className="px-4 py-3 text-left font-semibold border-r border-white/10 min-w-[160px]">
                Danh mục
              </th>
              <th className="px-5 py-3 text-left font-semibold border-r border-white/10 min-w-[240px]">
                Quy tắc
              </th>
              <th className="px-5 py-3 text-left font-semibold min-w-[240px] border-r border-white/10">
                Mô tả
              </th>
              <th className="px-4 py-3 text-left font-semibold min-w-[120px] text-center">
                Thao tác
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
                  colSpan={8}
                  className="px-6 py-4 text-center text-sm text-white/70"
                >
                  Không có sản phẩm nào được hiển thị.
                </td>
              </tr>
            )}
            {loading && products.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-4 text-center text-sm text-white/80"
                >
                  Đang tải danh sách sản phẩm...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveTable>
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
