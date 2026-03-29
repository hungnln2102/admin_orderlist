import type React from "react";
import type {
  NewSupplyRowState,
  ProductEditFormState,
  ProductPricingRow,
  SupplierOption,
  SupplyPriceState,
} from "../types";

export type NewSupplierField =
  | "sourceName"
  | "price"
  | "sourceId"
  | "useCustomName";

export interface ProductRowEditControls {
  editingProductId: number | null;
  productEditForm: ProductEditFormState | null;
  productEditError: string | null;
  isSavingProductEdit: boolean;
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
}

export interface ProductRowSupplyState {
  supplyState?: SupplyPriceState;
  pendingNewSupply?: NewSupplyRowState | null;
}

export interface ProductRowSupplyControls {
  supplierOptions: SupplierOption[];
  isLoadingSuppliers: boolean;
  editingSupplyRows: Record<string, boolean>;
  supplyPriceDrafts: Record<string, string>;
  savingSupplyRows: Record<string, boolean>;
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
    field: NewSupplierField,
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
  fetchSupplyPricesForProduct: (productName: string) => void;
}
