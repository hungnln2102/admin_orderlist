import React from "react";
import {
  DeleteProductState,
  NewSupplyRowState,
  ProductEditFormState,
  ProductPricingRow,
  SupplierOption,
  SupplyPriceState,
} from "../types";
import { normalizeProductKey } from "../utils";
import ProductRow from "./ProductRow";

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
  supplyRowErrors: Record<string, string | null>;
  newSupplyRows: Record<number, NewSupplyRowState>;
  editingProductId: number | null;
  productEditForm: ProductEditFormState | null;
  productEditError: string | null;
  isSavingProductEdit: boolean;
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
  supplyRowErrors,
  newSupplyRows,
  editingProductId,
  productEditForm,
  productEditError,
  isSavingProductEdit,
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
  const pageOptions = [10, 20, 50];
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

  const controlButtonClass =
    "w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed";
  const pageButtonClass =
    "w-10 h-10 flex items-center justify-center rounded-xl font-semibold border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10";
  const activePageClass =
    "rounded-full bg-gradient-to-br from-[#323b74] via-[#22294f] to-[#151c39] text-white border border-[#6b74ff]/50 shadow-[0_12px_30px_-14px_rgba(107,116,255,0.8)]";

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-white shadow-lg backdrop-blur">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-white">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
                Sản Phẩm
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
                Giá Sỉ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
                Giá Lẻ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
                Giá Khyến Mãi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
                Tình Trạng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
                Cập Nhật
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-white/80">
                Thao Tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-white/5">
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-sm text-white/80"
                >
                  Đang Tải Dữ Liệu...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-sm text-white/80"
                >
                  {error
                    ? "Không thể tải dữ liệu. Vui lòng thử lại."
                    : "Không có sản phẩm."}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isExpanded = expandedProductId === item.id;
                const productKey = normalizeProductKey(item.sanPhamRaw);
                const supplyState = supplyPriceMap[productKey];
                const pendingNewSupply = newSupplyRows[item.id] || null;
                const isDeletingCurrent =
                  deleteProductState.product?.id === item.id &&
                  deleteProductState.loading;

                return (
                  <ProductRow
                    key={item.id}
                    item={item}
                    productKey={productKey}
                    isExpanded={isExpanded}
                    statusOverride={statusOverrides[item.id]}
                    updatedTimestamp={updatedTimestampMap[item.id]}
                    supplyState={supplyState}
                    pendingNewSupply={pendingNewSupply}
                    supplierOptions={supplierOptions}
                    isLoadingSuppliers={isLoadingSuppliers}
                    editingProductId={editingProductId}
                    productEditForm={productEditForm}
                    productEditError={productEditError}
                    isSavingProductEdit={isSavingProductEdit}
                    isDeletingProduct={isDeletingCurrent}
                    editingSupplyRows={editingSupplyRows}
                    supplyPriceDrafts={supplyPriceDrafts}
                    savingSupplyRows={savingSupplyRows}
                    supplyRowErrors={supplyRowErrors}
                    onToggleProductDetails={onToggleProductDetails}
                    onStartProductEdit={onStartProductEdit}
                    onProductEditChange={onProductEditChange}
                    onCancelProductEdit={onCancelProductEdit}
                    onSubmitProductEdit={onSubmitProductEdit}
                    onRequestDeleteProduct={onRequestDeleteProduct}
                    onStartEditingSupply={onStartEditingSupply}
                    onSupplyInputChange={onSupplyInputChange}
                    onCancelSupplyEditing={onCancelSupplyEditing}
                    onConfirmSupplyEditing={onConfirmSupplyEditing}
                    onStartAddSupplierRow={onStartAddSupplierRow}
                    onNewSupplierInputChange={onNewSupplierInputChange}
                    onCancelAddSupplierRow={onCancelAddSupplierRow}
                    onConfirmAddSupplierRow={onConfirmAddSupplierRow}
                    onDeleteSupplyRow={onDeleteSupplyRow}
                    onToggleStatus={onToggleStatus}
                    fetchSupplyPricesForProduct={fetchSupplyPricesForProduct}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white/80 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span>Hiển thị</span>
          <select
            className="rounded-lg border border-white/20 bg-slate-900 px-3 py-1 text-white shadow-sm focus:border-indigo-400 focus:outline-none"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
          >
            {pageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span>dòng</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            className={controlButtonClass}
            onClick={() => handlePageSelect(1)}
            disabled={clampedCurrent === 1}
            aria-label="Trang đầu"
          >
            {"<<"}
          </button>
          <button
            className={controlButtonClass}
            onClick={() => handlePageSelect(clampedCurrent - 1)}
            disabled={clampedCurrent === 1}
            aria-label="Trang trước"
          >
            {"<"}
          </button>
          {paginationItems.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="w-10 h-10 flex items-center justify-center text-white/50"
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                className={`${pageButtonClass} ${
                  clampedCurrent === item ? activePageClass : ""
                }`}
                onClick={() => handlePageSelect(item)}
              >
                {item}
              </button>
            )
          )}
          <button
            className={controlButtonClass}
            onClick={() => handlePageSelect(clampedCurrent + 1)}
            disabled={clampedCurrent === totalPages}
            aria-label="Trang sau"
          >
            {">"}
          </button>
          <button
            className={controlButtonClass}
            onClick={() => handlePageSelect(totalPages)}
            disabled={clampedCurrent === totalPages}
            aria-label="Trang cuối"
          >
            {">>"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductTable;
