import React from "react";
import { ProductTable } from "../components/ProductTable";
import type { MergedProduct } from "../utils/productInfoHelpers";

interface ProductViewProps {
  products: MergedProduct[];
  mergedTotal: number;
  loading: boolean;
  currentPage: number;
  pageSize: number;
  expandedId: number | null;
  onPageChange: (page: number) => void;
  onToggleExpand: (id: number | null) => void;
  onEdit: (product: MergedProduct) => void;
}

/**
 * ProductView Component
 * Displays products in table view
 */
export const ProductView: React.FC<ProductViewProps> = ({
  products,
  mergedTotal,
  loading,
  currentPage,
  pageSize,
  expandedId,
  onPageChange,
  onToggleExpand,
  onEdit,
}) => {
  return (
    <ProductTable
      products={products}
      mergedTotal={mergedTotal}
      loading={loading}
      currentPage={currentPage}
      pageSize={pageSize}
      onPageChange={onPageChange}
      expandedId={expandedId}
      onToggleExpand={onToggleExpand}
      onEdit={onEdit}
    />
  );
};
