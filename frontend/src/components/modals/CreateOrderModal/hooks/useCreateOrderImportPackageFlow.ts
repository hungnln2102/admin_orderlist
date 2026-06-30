import { useCallback, useEffect } from "react";
import { ORDER_FIELDS } from "../../../../constants";
import { useImportPackageSubmit } from "@/features/warehouse/hooks/useImportPackageSubmit";
import type { CreateOrderCreationKind, Order, Product } from "../types";

type UseCreateOrderImportPackageFlowParams = {
  isOpen: boolean;
  orderCreationKind: CreateOrderCreationKind;
  products: Product[];
  formData: Partial<Order>;
  selectedSupplyId: number | null;
  pendingImportPackageRef: React.MutableRefObject<Record<string, unknown> | null>;
  handleSubmit: (event: React.FormEvent) => boolean;
};

export const useCreateOrderImportPackageFlow = ({
  isOpen,
  orderCreationKind,
  products,
  formData,
  selectedSupplyId,
  pendingImportPackageRef,
  handleSubmit,
}: UseCreateOrderImportPackageFlowParams) => {
  const isImportOrder = orderCreationKind === "import";
  const {
    rule: importRule,
    ruleLoading: importRuleLoading,
    data: importPackageData,
    updateField: updateImportField,
    loadRule: loadImportRule,
  } = useImportPackageSubmit();

  const selectedProductId =
    products.find(
      (product) => product.san_pham === (formData[ORDER_FIELDS.ID_PRODUCT] as string)
    )?.id ?? null;

  useEffect(() => {
    if (isImportOrder && isOpen) {
      void loadImportRule(
        typeof selectedProductId === "number" ? selectedProductId : null
      );
    }
  }, [isImportOrder, isOpen, selectedProductId, loadImportRule]);

  const handleSubmitWithPackage = useCallback(
    (event: React.FormEvent) => {
      if (isImportOrder && importRule?.enabled && selectedProductId) {
        pendingImportPackageRef.current = {
          productId: selectedProductId,
          supplierId: selectedSupplyId,
          importPrice: Number(formData[ORDER_FIELDS.COST]) || null,
          data: importPackageData,
        };
      } else {
        pendingImportPackageRef.current = null;
      }
      return handleSubmit(event);
    },
    [
      formData,
      handleSubmit,
      importPackageData,
      importRule?.enabled,
      isImportOrder,
      pendingImportPackageRef,
      selectedProductId,
      selectedSupplyId,
    ]
  );

  return {
    isImportOrder,
    importRule,
    importRuleLoading,
    importPackageData,
    updateImportField,
    handleSubmitWithPackage,
  };
};
