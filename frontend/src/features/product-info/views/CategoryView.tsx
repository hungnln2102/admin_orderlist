import React, { useState, useMemo, useEffect } from "react";
import { CategoryTable } from "../components/CategoryTable";
import { CategoryRow } from "../types";

interface CategoryViewProps {
  categoryRows: CategoryRow[];
  loading: boolean;
  /** Tăng sau mỗi lần reload API — bust cache ảnh cột Hình ảnh. */
  listDisplayEpoch: number;
  onEditCategory: (group: CategoryRow) => void;
}

const CATEGORY_PAGE_SIZE = 8; // 5-10 items per page, default 8

/**
 * CategoryView Component
 * Displays categories in table view with pagination
 */
export const CategoryView: React.FC<CategoryViewProps> = ({
  categoryRows,
  loading,
  listDisplayEpoch,
  onEditCategory,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when categoryRows change (e.g., after search/filter)
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryRows.length]);

  const pagedCategoryRows = useMemo(() => {
    const startIndex = (currentPage - 1) * CATEGORY_PAGE_SIZE;
    const endIndex = startIndex + CATEGORY_PAGE_SIZE;
    return categoryRows.slice(startIndex, endIndex);
  }, [categoryRows, currentPage]);

  return (
    <CategoryTable
      categoryRows={pagedCategoryRows}
      allCategoryRows={categoryRows}
      loading={loading}
      listDisplayEpoch={listDisplayEpoch}
      currentPage={currentPage}
      pageSize={CATEGORY_PAGE_SIZE}
      onPageChange={setCurrentPage}
      onEditCategory={onEditCategory}
    />
  );
};
