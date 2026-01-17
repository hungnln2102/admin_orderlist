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
        <h2 className="text-lg font-semibold text-white">Sản phẩm</h2>
        {loading && <span className="text-xs text-white/60">Đang tải...</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-white/10 text-sm text-white/90">
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "12%", minWidth: "160px" }} />
            <col style={{ width: "22%", minWidth: "240px" }} />
            <col style={{ width: "21%", minWidth: "240px" }} />
            <col style={{ width: "7%", minWidth: "120px" }} />
          </colgroup>
          <thead className="bg-white/5 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Hình ảnh</th>
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
