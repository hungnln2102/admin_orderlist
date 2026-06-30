import { useEffect, useMemo, useState } from "react";
import type { ProductEditFormState } from "../types";
import PricePreviewGrid from "./product-edit-panel/PricePreviewGrid";
import { ProductEditActions } from "./product-edit-panel/ProductEditActions";
import { ProductEditFormSections } from "./product-edit-panel/ProductEditFormSections";

type ProductEditPanelProps = {
  productId: number;
  currentEditForm: ProductEditFormState;
  productNameOptions: string[];
  highestSupplyPriceDisplay: string;
  previewWholesaleProfitLabel: string | null;
  previewRetailProfitLabel: string | null;
  previewWholesalePrice: number | null;
  previewRetailPrice: number | null;
  previewStudentPrice: number | null;
  previewStudentBlendHint: string | null;
  previewPromoPrice: number | null;
  previewPromoPercentLabel: string | null;
  showPreviewPromo: boolean;
  showPreviewStudent: boolean;
  productEditError: string | null;
  isSavingProductEdit: boolean;
  onProductEditChange: (
    field: keyof ProductEditFormState,
    value: string
  ) => void;
  onCancelProductEdit: () => void;
  onSubmitProductEdit: () => void;
};

export function ProductEditPanel({
  productId,
  currentEditForm,
  productNameOptions,
  highestSupplyPriceDisplay,
  previewWholesaleProfitLabel,
  previewRetailProfitLabel,
  previewWholesalePrice,
  previewRetailPrice,
  previewStudentPrice,
  previewStudentBlendHint,
  previewPromoPrice,
  previewPromoPercentLabel,
  showPreviewPromo,
  showPreviewStudent,
  productEditError,
  isSavingProductEdit,
  onProductEditChange,
  onCancelProductEdit,
  onSubmitProductEdit,
}: ProductEditPanelProps) {
  const [isCustomProductName, setIsCustomProductName] = useState(false);

  const availableProductNameOptions = useMemo(() => {
    const seen = new Set<string>();
    return productNameOptions.filter((name) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [productNameOptions]);

  const dropdownProductNameOptions = useMemo(() => {
    const currentName = currentEditForm.packageName.trim();
    if (!currentName) return availableProductNameOptions;

    const exists = availableProductNameOptions.some(
      (option) => option.toLowerCase() === currentName.toLowerCase()
    );
    return exists
      ? availableProductNameOptions
      : [currentName, ...availableProductNameOptions];
  }, [availableProductNameOptions, currentEditForm.packageName]);

  useEffect(() => {
    setIsCustomProductName(false);
  }, [productId]);

  const handleUseDropdownProductName = () => {
    const fallbackName = availableProductNameOptions[0] ?? "";
    setIsCustomProductName(false);
    if (
      fallbackName &&
      fallbackName.toLowerCase() !== currentEditForm.packageName.trim().toLowerCase()
    ) {
      onProductEditChange("packageName", fallbackName);
    }
  };

  return (
    <div className="space-y-5 rounded-[24px] border border-white/10 bg-gradient-to-br from-[#101739]/90 via-[#0b1530]/85 to-[#1c1345]/85 px-4 py-5 text-white shadow-[0_30px_70px_-45px_rgba(0,0,0,0.95)] md:space-y-6 md:px-6 md:py-6">
      <ProductEditFormSections
        currentEditForm={currentEditForm}
        dropdownProductNameOptions={dropdownProductNameOptions}
        isCustomProductName={isCustomProductName}
        onUseCustomProductName={() => setIsCustomProductName(true)}
        onUseDropdownProductName={handleUseDropdownProductName}
        onProductEditChange={onProductEditChange}
      />

      <PricePreviewGrid
        highestSupplyPriceDisplay={highestSupplyPriceDisplay}
        previewWholesaleProfitLabel={previewWholesaleProfitLabel}
        previewRetailProfitLabel={previewRetailProfitLabel}
        previewWholesalePrice={previewWholesalePrice}
        previewRetailPrice={previewRetailPrice}
        previewStudentPrice={previewStudentPrice}
        previewStudentBlendHint={previewStudentBlendHint}
        previewPromoPrice={previewPromoPrice}
        previewPromoPercentLabel={previewPromoPercentLabel}
        showPreviewPromo={showPreviewPromo}
        showPreviewStudent={showPreviewStudent}
      />

      {productEditError && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
          {productEditError}
        </div>
      )}

      <ProductEditActions
        isSaving={isSavingProductEdit}
        onCancel={onCancelProductEdit}
        onSubmit={onSubmitProductEdit}
      />
    </div>
  );
}
