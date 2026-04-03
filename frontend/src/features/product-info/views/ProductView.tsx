import React from "react";
import { ProductTable } from "../components/ProductTable";

interface ProductViewProps {
  products: any[];
  mergedTotal: number;
  loading: boolean;
  currentPage: number;
  pageSize: number;
  expandedId: string | null;
  onPageChange: (page: number) => void;
  onToggleExpand: (id: string | null) => void;
  onEdit: (product: any) => void;
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
