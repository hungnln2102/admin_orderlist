import React from "react";
import type {
  DeleteProductState,
  NewSupplyRowState,
  ProductEditFormState,
  ProductPricingRow,
  SupplierOption,
  SupplyPriceState,
} from "../types";
import type {
  ProductRowEditControls,
  ProductRowSupplyControls,
} from "./productRowContracts";
import { ProductTableDesktopSection } from "./product-table/ProductTableDesktopSection";
import { ProductTableMobileSection } from "./product-table/ProductTableMobileSection";
import { ProductTablePagination } from "./product-table/ProductTablePagination";

interface ProductTableProps {
  items: ProductPricingRow[];
  totalRows: number;
  currentPage: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  isLoading: boolean;
  error: string | null;
  expandedProductId: number | null;
  supplyPriceMap: Record<string, SupplyPriceState>;
  statusOverrides: Record<number, boolean>;
  updatedTimestampMap: Record<number, string>;
  supplierOptions: SupplierOption[];
  isLoadingSuppliers: boolean;
  editingSupplyRows: Record<string, boolean>;
  supplyPriceDrafts: Record<string, string>;
  savingSupplyRows: Record<string, boolean>;
  newSupplyRows: Record<number, NewSupplyRowState>;
  editingProductId: number | null;
  productEditForm: ProductEditFormState | null;
  productEditError: string | null;
  isSavingProductEdit: boolean;
  productNameOptions: string[];
  deleteProductState: DeleteProductState;
  onToggleProductDetails: (product: ProductPricingRow) => void;
  onStartProductEdit: (
    event: React.MouseEvent<HTMLButtonElement>,
    product: ProductPricingRow
  ) => void;
  onProductEditChange: (
    field: keyof ProductEditFormState,
    value: string
  ) => void;
  onCancelProductEdit: () => void;
  onSubmitProductEdit: () => void;
  onRequestDeleteProduct: (
    event: React.MouseEvent<HTMLButtonElement>,
    product: ProductPricingRow
  ) => void;
  onStartEditingSupply: (
    productId: number,
    sourceId: number,
    currentPrice: number | null
  ) => void;
  onSupplyInputChange: (
    productId: number,
    sourceId: number,
    value: string
  ) => void;
  onCancelSupplyEditing: (productId: number, sourceId: number) => void;
  onConfirmSupplyEditing: (
    productId: number,
    sourceId: number,
    productKey: string,
    productName: string
  ) => void;
  onStartAddSupplierRow: (productId: number) => void;
  onNewSupplierInputChange: (
    productId: number,
    field: "sourceName" | "price" | "sourceId" | "useCustomName",
    value: string | number | boolean | null
  ) => void;
  onCancelAddSupplierRow: (productId: number) => void;
  onConfirmAddSupplierRow: (product: ProductPricingRow) => void;
  onDeleteSupplyRow: (
    productId: number,
    sourceId: number,
    productKey: string,
    productName: string
  ) => void;
  onToggleStatus: (item: ProductPricingRow) => void;
  fetchSupplyPricesForProduct: (productName: string) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({
  items,
  totalRows,
  currentPage,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  isLoading,
  error,
  expandedProductId,
  supplyPriceMap,
  statusOverrides,
  updatedTimestampMap,
  supplierOptions,
  isLoadingSuppliers,
  editingSupplyRows,
  supplyPriceDrafts,
  savingSupplyRows,
  newSupplyRows,
  editingProductId,
  productEditForm,
  productEditError,
  isSavingProductEdit,
  productNameOptions,
  deleteProductState,
  onToggleProductDetails,
  onStartProductEdit,
  onProductEditChange,
  onCancelProductEdit,
  onSubmitProductEdit,
  onRequestDeleteProduct,
  onStartEditingSupply,
  onSupplyInputChange,
  onCancelSupplyEditing,
  onConfirmSupplyEditing,
  onStartAddSupplierRow,
  onNewSupplierInputChange,
  onCancelAddSupplierRow,
  onConfirmAddSupplierRow,
  onDeleteSupplyRow,
  onToggleStatus,
  fetchSupplyPricesForProduct,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const clampedCurrent = Math.min(Math.max(currentPage, 1), totalPages);
  const paginationItems = React.useMemo<(number | "ellipsis")[]>(() => {
    const addPage = (page: number, target: Set<number>) => {
      if (page >= 1 && page <= totalPages) target.add(page);
    };

    const candidatePages = new Set<number>([1, totalPages]);
    addPage(clampedCurrent - 1, candidatePages);
    addPage(clampedCurrent, candidatePages);
    addPage(clampedCurrent + 1, candidatePages);

    if (clampedCurrent <= 2) {
      addPage(2, candidatePages);
      addPage(3, candidatePages);
      addPage(4, candidatePages);
    }

    if (clampedCurrent >= totalPages - 1) {
      addPage(totalPages - 1, candidatePages);
      addPage(totalPages - 2, candidatePages);
      addPage(totalPages - 3, candidatePages);
    }

    const sorted = Array.from(candidatePages).sort((a, b) => a - b);
    const result: (number | "ellipsis")[] = [];
    sorted.forEach((page, index) => {
      if (index > 0 && page - sorted[index - 1] > 1) {
        result.push("ellipsis");
      }
      result.push(page);
    });
    return result;
  }, [clampedCurrent, totalPages]);

  const handlePageSelect = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    onPageChange(nextPage);
  };

  const editControls = React.useMemo<ProductRowEditControls>(
    () => ({
      editingProductId,
      productEditForm,
      productEditError,
      isSavingProductEdit,
      productNameOptions,
      onStartProductEdit,
      onProductEditChange,
      onCancelProductEdit,
      onSubmitProductEdit,
      onRequestDeleteProduct,
    }),
    [
      editingProductId,
      productEditForm,
      productEditError,
      isSavingProductEdit,
      productNameOptions,
      onStartProductEdit,
      onProductEditChange,
      onCancelProductEdit,
      onSubmitProductEdit,
      onRequestDeleteProduct,
    ]
  );

  const supplyControls = React.useMemo<ProductRowSupplyControls>(
    () => ({
      supplierOptions,
      isLoadingSuppliers,
      editingSupplyRows,
      supplyPriceDrafts,
      savingSupplyRows,
      onStartEditingSupply,
      onSupplyInputChange,
      onCancelSupplyEditing,
      onConfirmSupplyEditing,
      onStartAddSupplierRow,
      onNewSupplierInputChange,
      onCancelAddSupplierRow,
      onConfirmAddSupplierRow,
      onDeleteSupplyRow,
      fetchSupplyPricesForProduct,
    }),
    [
      supplierOptions,
      isLoadingSuppliers,
      editingSupplyRows,
      supplyPriceDrafts,
      savingSupplyRows,
      onStartEditingSupply,
      onSupplyInputChange,
      onCancelSupplyEditing,
      onConfirmSupplyEditing,
      onStartAddSupplierRow,
      onNewSupplierInputChange,
      onCancelAddSupplierRow,
      onConfirmAddSupplierRow,
      onDeleteSupplyRow,
      fetchSupplyPricesForProduct,
    ]
  );

  return (
    <div className="overflow-hidden rounded-[32px] border border-white/5 bg-white/5 text-white shadow-2xl backdrop-blur-xl">
      <div className="md:hidden">
        <ProductTableMobileSection
          items={items}
          isLoading={isLoading}
          error={error}
          expandedProductId={expandedProductId}
          supplyPriceMap={supplyPriceMap}
          statusOverrides={statusOverrides}
          updatedTimestampMap={updatedTimestampMap}
          newSupplyRows={newSupplyRows}
          deleteProductState={deleteProductState}
          editControls={editControls}
          supplyControls={supplyControls}
          onToggleProductDetails={onToggleProductDetails}
          onToggleStatus={onToggleStatus}
        />
      </div>

      <ProductTableDesktopSection
        items={items}
        isLoading={isLoading}
        error={error}
        expandedProductId={expandedProductId}
        supplyPriceMap={supplyPriceMap}
        statusOverrides={statusOverrides}
        updatedTimestampMap={updatedTimestampMap}
        newSupplyRows={newSupplyRows}
        deleteProductState={deleteProductState}
        editControls={editControls}
        supplyControls={supplyControls}
        onToggleProductDetails={onToggleProductDetails}
        onToggleStatus={onToggleStatus}
      />

      <ProductTablePagination
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        clampedCurrent={clampedCurrent}
        totalPages={totalPages}
        paginationItems={paginationItems}
        handlePageSelect={handlePageSelect}
      />
    </div>
  );
};

export default ProductTable;
