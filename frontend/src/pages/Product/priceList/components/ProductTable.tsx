import React from "react";
import {
  DeleteProductState,
  NewSupplyRowState,
  ProductEditFormState,
  ProductPricingRow,
  SupplyPriceState,
} from "../types";
import { normalizeProductKey } from "../utils";
import ProductRow from "./ProductRow";

interface ProductTableProps {
  items: ProductPricingRow[];
  isLoading: boolean;
  error: string | null;
  expandedProductId: number | null;
  supplyPriceMap: Record<string, SupplyPriceState>;
  statusOverrides: Record<number, boolean>;
  updatedTimestampMap: Record<number, string>;
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
    field: "sourceName" | "price",
    value: string
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
  isLoading,
  error,
  expandedProductId,
  supplyPriceMap,
  statusOverrides,
  updatedTimestampMap,
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
                    ? "KhA'ng th ¯Ÿ t §œi d ¯_ li ¯Øu. Vui lAýng th ¯- l §­i."
                    : "KhA'ng cA3 s §œn ph §cm."}
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
    </div>
  );
};

export default ProductTable;
