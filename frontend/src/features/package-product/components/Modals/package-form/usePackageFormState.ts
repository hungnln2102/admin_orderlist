import { useCallback, useEffect, useMemo, useState } from "react";
import type React from "react";
import type {
  PackageFormValues,
  SlotLinkMode,
} from "../../../utils/packageHelpers";
import { EMPTY_FORM_VALUES } from "../../../utils/packageHelpers";
import {
  formatImportValue,
  getPackageFormValidation,
} from "./packageFormRules";
import { usePackageStockStorageControls } from "./usePackageStockStorageControls";
import { usePackageWarehouseItems } from "./usePackageWarehouseItems";

type UsePackageFormStateParams = {
  open: boolean;
  initialValues?: PackageFormValues;
  onSubmit: (values: PackageFormValues) => void;
  /** B?t khi lo?i g?i c? tr??ng ?activation? ? khi false, kh?ng b?t bu?c k?ch ho?t d? ch?n match theo th?ng tin ??n. */
  requireActivationForInformation: boolean;
};

export const usePackageFormState = ({
  open,
  initialValues,
  onSubmit,
  requireActivationForInformation,
}: UsePackageFormStateParams) => {
  const mergedInitialValues = useMemo(
    () => ({ ...EMPTY_FORM_VALUES, ...(initialValues ?? {}) }),
    [initialValues]
  );
  const [values, setValues] = useState<PackageFormValues>(mergedInitialValues);

  const {
    warehouseLoading,
    inStockItems,
    filterItems,
    findWarehouseItemById,
    handleUpdateWarehouseInfo,
  } = usePackageWarehouseItems(open);

  const stockStorageControls = usePackageStockStorageControls({
    values,
    setValues,
    filterItems,
    findWarehouseItemById,
  });

  const { stockManual, resetStockStorageControls } = stockStorageControls;

  useEffect(() => {
    if (!open) return;

    setValues({
      ...mergedInitialValues,
      import: formatImportValue(mergedInitialValues.import),
    });
    resetStockStorageControls();
  }, [open, mergedInitialValues, resetStockStorageControls]);

  const handleChange = useCallback(
    (
      field: keyof PackageFormValues,
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const value = event.target.value;
      if (field === "import") {
        setValues((prev) => ({ ...prev, import: formatImportValue(value) }));
        return;
      }

      setValues((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const { matchRequiresAccountError, matchRequiresActivationError } =
    getPackageFormValidation({
      values,
      stockManual,
      requireActivationForInformation,
    });

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (matchRequiresAccountError) return;
      if (matchRequiresActivationError) return;
      onSubmit(values);
    },
    [
      matchRequiresAccountError,
      matchRequiresActivationError,
      onSubmit,
      values,
    ]
  );

  const handleSlotLinkModeChange = useCallback((mode: SlotLinkMode) => {
    setValues((prev) => ({ ...prev, slotLinkMode: mode }));
  }, []);

  return {
    values,
    setValues,
    warehouseLoading,
    inStockItemsCount: inStockItems.length,
    ...stockStorageControls,
    handleUpdateWarehouseInfo,
    handleChange,
    matchRequiresAccountError,
    matchRequiresActivationError,
    handleSubmit,
    handleSlotLinkModeChange,
  };
};
