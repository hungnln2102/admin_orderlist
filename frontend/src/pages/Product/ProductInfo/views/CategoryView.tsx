import React from "react";
import { CategoryTable } from "../components/CategoryTable";

interface CategoryViewProps {
  categoryRows: any[];
  loading: boolean;
  onEditCategory: (group: string) => void;
  getCategoryColor: (category: string) => string;
}

/**
 * CategoryView Component
 * Displays categories in table view
 */
export const CategoryView: React.FC<CategoryViewProps> = ({
  categoryRows,
  loading,
  onEditCategory,
  getCategoryColor,
}) => {
  return (
    <CategoryTable
      categoryRows={categoryRows}
      loading={loading}
      onEditCategory={onEditCategory}
      getCategoryColor={getCategoryColor}
    />
  );
};
