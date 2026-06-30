import { getTodayDMY } from "@/shared/date";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ORDER_CODE_PREFIX,
  ORDER_CODE_PREFIXES,
  ORDER_FIELDS,
} from "../../../../constants";
import {
  CreateOrderPrefillContext,
  CreateOrderCreationKind,
  CustomerType,
  Order,
  UseCreateOrderLogicResult,
} from "../types";
import { useOrderFormState } from "./useOrderFormState";
import { useOrderInit } from "./useOrderInit";
import { useOrderPricingSync } from "./useOrderPricingSync";
import { useOrderSubmit } from "./useOrderSubmit";
import { usePriceCalculation } from "./usePriceCalculation";
import { useProductSelection } from "./useProductSelection";
import { useSupplySelection } from "./useSupplySelection";
import { useSuppliesData } from "./useSuppliesData";
import { isDraftOrderComplete } from "../buildOrderPayload";
import { useOrderDetailLines } from "./useOrderDetailLines";
import type { PaymentMethod } from "@/features/usdt-wallets/types";
import { useCreateOrderCredit } from "./useCreateOrderCredit";

export const useCreateOrderLogic = (
  isOpen: boolean,
  onSave: (newOrderData: Partial<Order> | Order | Array<Partial<Order> | Order>) => void,
  customMode: boolean,
  prefillContext?: CreateOrderPrefillContext | null,
  orderCreationKind: CreateOrderCreationKind = "sales"
): UseCreateOrderLogicResult => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank");

  useEffect(() => {
    if (isOpen) {
      setPaymentMethod("bank");
    }
  }, [isOpen]);

  const {
    formData,
    setFormData,
    customerType,
    setCustomerType,
    selectedSupplyId,
    setSelectedSupplyId,
    customProductTouched,
    setCustomProductTouched,
    updateForm,
  } = useOrderFormState(DEFAULT_ORDER_CODE_PREFIX);

  const {
    allSupplies,
    supplies,
    products,
    supplyPrices,
    setSupplies,
    setSupplyPrices,
    fetchProducts,
    fetchAllSupplies,
    fetchSuppliesByProduct,
    fetchAllSupplyPrices,
  } = useSuppliesData();

  const productName = formData[ORDER_FIELDS.ID_PRODUCT] as string;
  const orderPrefix = formData[ORDER_FIELDS.ID_ORDER] as string;
  const registerDate = formData[ORDER_FIELDS.ORDER_DATE] as string;
  const infoValue = (formData[ORDER_FIELDS.INFORMATION_ORDER] as string) || "";

  const { isLoading, isDataLoaded, setIsDataLoaded, recalcPrice, infoRef } = usePriceCalculation({
    customerType,
    setFormData,
    productName,
  });

  const todayDate = useMemo(() => getTodayDMY(), []);

  const {
    creditMode,
    toggleCreditMode,
    availableCreditNotes,
    creditListLoading,
    selectedCreditNote,
    selectCreditNoteRow,
    clearSelectedCreditNote,
    creditOrderSelection,
  } = useCreateOrderCredit({
    isOpen,
    prefillContext,
    setFormData,
  });

  useOrderInit({
    isOpen,
    orderCreationKind,
    customerType,
    setCustomerType,
    setFormData,
    setIsDataLoaded,
    setSelectedSupplyId,
    setSupplies,
    setSupplyPrices,
    setCustomProductTouched,
    fetchProducts,
    fetchAllSupplies,
    prefillContext,
  });

  useOrderPricingSync({
    infoValue,
    infoRef,
    productName,
    orderId: orderPrefix,
    registerDate,
    selectedSupplyId,
    customMode,
    customerType,
    recalcPrice,
  });

  const { handleProductSelect } = useProductSelection({
    productName,
    orderId: orderPrefix,
    registerDate,
    allSupplies,
    selectedSupplyId,
    customMode,
    todayDate,
    setSelectedSupplyId,
    setCustomProductTouched,
    setFormData,
    setSupplies,
    setSupplyPrices,
    setIsDataLoaded,
    fetchSuppliesByProduct,
    fetchAllSupplyPrices,
    recalcPrice,
  });

  const { handleSourceSelect } = useSupplySelection({
    supplies,
    supplyPrices,
    formData,
    customerType,
    productName,
    orderId: orderPrefix,
    registerDate,
    setSelectedSupplyId,
    setFormData,
    setIsDataLoaded,
    recalcPrice,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    updateForm({ [name]: value });
  };

  const handleCustomerTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as CustomerType;
    setCustomerType(newType);
    setIsDataLoaded(false);
    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.ID_ORDER]: newType,
      [ORDER_FIELDS.PRICE]: newType === ORDER_CODE_PREFIXES.GIFT ? 0 : prev[ORDER_FIELDS.PRICE],
    }));
  };

  const clearSelectedSupplySelection = useCallback(() => {
    setSelectedSupplyId(null);
    setIsDataLoaded(false);
  }, [setIsDataLoaded, setSelectedSupplyId]);

  const multiOrderEnabled = useMemo(
    () => !prefillContext?.creditNoteId && !creditMode,
    [creditMode, prefillContext?.creditNoteId]
  );

  const {
    detailLines,
    addDetailLine,
    removeDetailLine,
    updateDetailLine,
    totalOrdersToCreate,
    estimatedTotalPrice,
    collectAllPayloads,
    isMultiReady,
    completeLineCount,
  } = useOrderDetailLines({
    isOpen,
    multiOrderEnabled,
    formData,
    selectedSupplyId,
    products,
    paymentMethod,
    prefillContext,
    creditOrderSelection,
    updateForm,
  });

  const isDraftComplete = useMemo(
    () => isDraftOrderComplete(formData, selectedSupplyId),
    [formData, selectedSupplyId]
  );

  const { handleSubmit } = useOrderSubmit({
    formData,
    isLoading,
    onSave,
    selectedSupplyId,
    products,
    prefillContext,
    creditOrderSelection,
    paymentMethod,
    multiOrderEnabled,
    collectAllPayloads,
  });

  return {
    formData,
    supplies,
    allSupplies,
    products,
    isLoading,
    isDataLoaded,
    selectedSupplyId,
    customerType,
    updateForm,
    setIsDataLoaded,
    customProductTouched,
    setCustomProductTouched,
    clearSelectedSupplySelection,
    handleChange,
    handleProductSelect,
    handleSourceSelect,
    handleCustomerTypeChange,
    handleSubmit,
    creditMode,
    toggleCreditMode,
    availableCreditNotes,
    creditListLoading,
    selectedCreditNote,
    selectCreditNoteRow,
    clearSelectedCreditNote,
    paymentMethod,
    setPaymentMethod,
    multiOrderEnabled,
    detailLines,
    addDetailLine,
    removeDetailLine,
    updateDetailLine,
    isDraftComplete,
    totalOrdersToCreate,
    estimatedTotalPrice,
    completeLineCount,
    isMultiReady,
  };
};

export default useCreateOrderLogic;
