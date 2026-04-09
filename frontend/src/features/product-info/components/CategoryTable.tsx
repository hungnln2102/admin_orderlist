import React, { useState } from "react";
import { EyeIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { CategoryRow } from "../types";
import { CategoryItem } from "../utils/productInfoHelpers";
import { getCategoryPillVisualStyle } from "../utils/categoryColors";
import Pagination from "@/components/ui/Pagination";

type CategoryTableProps = {
  categoryRows: CategoryRow[];
  allCategoryRows: CategoryRow[];
  loading: boolean;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEditCategory: (group: CategoryRow) => void;
};

export const CategoryTable: React.FC<CategoryTableProps> = ({
  categoryRows,
  allCategoryRows,
  loading,
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
              <React.Fragment key={group.key}>
                <tr className="product-info-surface__row hover:bg-white/5">
                  <td className="px-4 py-3">
                    {group.imageUrl ? (
                      <img
                        src={group.imageUrl}
                        alt={group.packageName}
                        className="h-12 w-12 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                  </td>

                  <td className="px-4 py-3 font-semibold text-white">
                    {group.packageName}
                  </td>

                  <td className="px-4 py-3 text-white/80">
                    <div className="flex flex-wrap gap-2">
                      {(group.categories || []).map((category, index) => (
                        <span
                          key={`${group.key}-${category.id || category.name}`}
                          className="category-pill"
                          style={getCategoryPillVisualStyle(category, index)}
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      className="product-info-action-button product-info-action-button--view inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10"
                      title="Xem"
                      type="button"
                      onClick={() =>
                        setExpandedPackageKey((prev) =>
                          prev === group.key ? null : group.key
                        )
                      }
                    >
                      <EyeIcon className="h-5 w-5 text-blue-400" />
                    </button>

                    <button
                      className="product-info-action-button product-info-action-button--edit ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10"
                      title="Chỉnh sửa"
                      type="button"
                      onClick={() => onEditCategory(group)}
                    >
                      <PencilSquareIcon className="h-5 w-5 text-green-400" />
                    </button>
                  </td>
                </tr>

                {expandedPackageKey === group.key && (
                  <tr className="product-info-surface__expanded-row bg-white/5">
                    <td colSpan={4} className="px-6 py-4">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((item) => {
                          const productCode = item.productId || "";
                          const productLabel =
                            item.packageProduct ||
                            item.productName ||
                            item.productId ||
                            "";

                          return (
                            <div
                              key={`${group.key}-${item.id}-${item.productId}`}
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                            >
                              <p className="text-sm font-semibold text-white">
                                {productCode}
                              </p>
                              <p className="truncate text-xs text-white/60">
                                {productLabel}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
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
