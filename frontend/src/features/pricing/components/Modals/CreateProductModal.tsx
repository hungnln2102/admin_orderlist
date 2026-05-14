import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import type {
  BankOption,
  CreateProductFormState,
  CreateSupplierEntry,
  ProductPricingRow,
  SupplierOption,
} from "../../types";
import { ProductBasicsSection } from "./create-product/ProductBasicsSection";
import { PricingRatiosSection } from "./create-product/PricingRatiosSection";
import { SuppliersSection } from "./create-product/SuppliersSection";
import { CreateProductActions } from "./create-product/CreateProductActions";

interface CreateProductModalProps {
  isOpen: boolean;
  createForm: CreateProductFormState;
  existingProductRows: ProductPricingRow[];
  productNameOptions: string[];
  productPackageOptionsByName: Record<string, string[]>;
  createSuppliers: CreateSupplierEntry[];
  supplierOptions: SupplierOption[];
  bankOptions: BankOption[];
  isLoadingSuppliers: boolean;
  isLoadingBanks: boolean;
  isSubmitting: boolean;
  createError: string | null;
  onClose: () => void;
  onFormChange: (field: keyof CreateProductFormState, value: string) => void;
  onSupplierChange: (
    supplierId: string,
    field: keyof Omit<CreateSupplierEntry, "id">,
    value: string
  ) => void;
  onSupplierSelectChange: (supplierId: string, optionValue: string) => void;
  onSupplierPriceInput: (supplierId: string, rawValue: string) => void;
  onEnableCustomSupplier: (supplierId: string) => void;
  onAddSupplier: () => void;
  onRemoveSupplier: (supplierId: string) => void;
  onSubmit: () => void;
}

const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  createForm,
  existingProductRows,
  productNameOptions,
  productPackageOptionsByName,
  createSuppliers,
  supplierOptions,
  bankOptions,
  isLoadingSuppliers,
  isLoadingBanks,
  isSubmitting,
  createError,
  onClose,
  onFormChange,
  onSupplierChange,
  onSupplierSelectChange,
  onSupplierPriceInput,
  onEnableCustomSupplier,
  onAddSupplier,
  onRemoveSupplier,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/50 px-2 py-4 sm:px-4 sm:py-6"
      style={{ zIndex: 9999 }}
    >
      <div
        className="relative flex w-full max-w-4xl flex-col rounded-[32px] border border-white/15 bg-gradient-to-br from-slate-800/95 via-slate-700/90 to-slate-900/95 shadow-2xl backdrop-blur-sm"
        style={{ zIndex: 10000 }}
      >
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors z-10"
          onClick={onClose}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <div>
            <h2 className="text-xl font-bold text-white">Thêm Sản Phẩm mới</h2>
            <p className="text-base text-slate-300">
              Nhập Thông tin Sản Phẩm, Tỷ Giá và Nhà Cung Cấp
            </p>
          </div>

          <ProductBasicsSection
            createForm={createForm}
            existingProductRows={existingProductRows}
            productNameOptions={productNameOptions}
            productPackageOptionsByName={productPackageOptionsByName}
            onFormChange={onFormChange}
          />

          <PricingRatiosSection
            createForm={createForm}
            onFormChange={onFormChange}
          />

          <SuppliersSection
            createForm={createForm}
            createSuppliers={createSuppliers}
            supplierOptions={supplierOptions}
            bankOptions={bankOptions}
            isLoadingSuppliers={isLoadingSuppliers}
            isLoadingBanks={isLoadingBanks}
            onSupplierChange={onSupplierChange}
            onSupplierSelectChange={onSupplierSelectChange}
            onSupplierPriceInput={onSupplierPriceInput}
            onEnableCustomSupplier={onEnableCustomSupplier}
            onAddSupplier={onAddSupplier}
            onRemoveSupplier={onRemoveSupplier}
          />

          {createError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{createError}</p>
            </div>
          )}

          <CreateProductActions
            isSubmitting={isSubmitting}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export default CreateProductModal;
