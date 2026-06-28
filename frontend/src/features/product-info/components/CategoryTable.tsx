import React, { useState } from "react";
import { CategoryRow } from "../types";
import Pagination from "@/components/ui/Pagination";
import { CategoryTableRow } from "./CategoryTableRow";

type CategoryTableProps = {
  categoryRows: CategoryRow[];
  allCategoryRows: CategoryRow[];
  loading: boolean;
  listDisplayEpoch: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEditCategory: (group: CategoryRow) => void;
};

export const CategoryTable: React.FC<CategoryTableProps> = ({
  categoryRows,
  allCategoryRows,
  loading,
  listDisplayEpoch,
  currentPage,
  pageSize,
  onPageChange,
  onEditCategory,
}) => {
  const [expandedPackageKey, setExpandedPackageKey] = useState<string | null>(
    null
  );

  return (
    <div className="category-table product-info-surface overflow-hidden rounded-[32px] border border-white/5 bg-slate-900/40 shadow-2xl backdrop-blur-xl">
      <div className="category-table__header product-info-surface__header flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="category-table__title product-info-surface__title text-lg font-semibold text-white">
          Danh Mục
        </h2>
        {loading ? (
          <span className="product-info-surface__meta text-xs text-white/60">
            Đang tải...
          </span>
        ) : (
          <span className="product-info-surface__meta text-xs text-white/60">
            {allCategoryRows.length} danh mục
          </span>
        )}
      </div>

      <div className="category-table__inner product-info-surface__table-wrap overflow-x-auto">
        <table className="category-table__table product-info-surface__table min-w-full table-fixed divide-y divide-white/10 text-sm text-white/90">
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "40%" }} />
            <col style={{ width: "20%", minWidth: "140px" }} />
          </colgroup>
          <thead className="category-table__head product-info-surface__head bg-white/5 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/70">
            <tr>
              <th className="category-table__th px-4 py-3 text-left font-semibold">
                Hình ảnh
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                Gói sản phẩm
              </th>
              <th className="px-4 py-3 text-left font-semibold">Danh mục</th>
              <th className="px-4 py-3 text-center font-semibold">Thao tác</th>
            </tr>
          </thead>

          <tbody className="product-info-surface__body divide-y divide-white/5">
            {!loading && allCategoryRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-white/70">
                  Không có danh mục nào để hiển thị.
                </td>
              </tr>
            )}

            {loading && allCategoryRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-white/80">
                  Đang tải danh sách danh mục...
                </td>
              </tr>
            )}

            {categoryRows.map((group) => (
              <CategoryTableRow
                key={group.key}
                group={group}
                expanded={expandedPackageKey === group.key}
                listDisplayEpoch={listDisplayEpoch}
                onToggleExpanded={(key) =>
                  setExpandedPackageKey((prev) => (prev === key ? null : key))
                }
                onEditCategory={onEditCategory}
              />
            ))}
          </tbody>
        </table>
      </div>

      {!loading && allCategoryRows.length > 0 && (
        <div className="product-info-surface__footer border-t border-white/10 px-4 py-3">
          <Pagination
            className="product-info-pagination"
            currentPage={currentPage}
            totalItems={allCategoryRows.length}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};
