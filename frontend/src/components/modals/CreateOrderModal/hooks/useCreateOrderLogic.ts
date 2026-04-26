import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ORDER_CODE_PREFIX,
  ORDER_CODE_PREFIXES,
  ORDER_FIELDS,
} from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
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
import { fetchAvailableRefundCredits } from "@/lib/refundCreditsApi";
import type { AvailableRefundCredit } from "@/lib/refundCreditsApi";
import { usePriceCalculation } from "./usePriceCalculation";
import { useProductSelection } from "./useProductSelection";
import { useSuppliesData } from "./useSuppliesData";
import { useSupplySelection } from "./useSupplySelection";

export const useCreateOrderLogic = (
  isOpen: boolean,
  onSave: (newOrderData: Partial<Order> | Order) => void,
  customMode: boolean,
  prefillContext?: CreateOrderPrefillContext | null,
  orderCreationKind: CreateOrderCreationKind = "sales"
): UseCreateOrderLogicResult => {
  const [creditMode, setCreditMode] = useState(false);
  const [availableCreditNotes, setAvailableCreditNotes] = useState<
    AvailableRefundCredit[]
  >([]);
  const [creditListLoading, setCreditListLoading] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] =
    useState<AvailableRefundCredit | null>(null);

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
  const infoValue =
    (formData[ORDER_FIELDS.INFORMATION_ORDER] as string) || "";

  const {
    isLoading,
    isDataLoaded,
    setIsDataLoaded,
    recalcPrice,
    infoRef,
  } = usePriceCalculation({
    customerType,
    setFormData,
    productName,
  });

  const todayDate = useMemo(() => Helpers.getTodayDMY(), []);

  useEffect(() => {
    if (!isOpen) {
      setCreditMode(false);
      setSelectedCreditNote(null);
      setAvailableCreditNotes([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !creditMode) return;
    let cancelled = false;
    (async () => {
      setCreditListLoading(true);
      try {
        const rows = await fetchAvailableRefundCredits();
        if (!cancelled) {
          setAvailableCreditNotes(rows);
        }
      } catch {
        if (!cancelled) {
          setAvailableCreditNotes([]);
        }
      } finally {
        if (!cancelled) {
          setCreditListLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, creditMode]);

  const selectCreditNoteRow = useCallback(
    (row: AvailableRefundCredit) => {
      setSelectedCreditNote(row);
      setFormData((prev) => ({
        ...prev,
        [ORDER_FIELDS.CUSTOMER]: String(row.customer_name || "").trim(),
      }));
    },
    [setFormData]
  );

  const clearSelectedCreditNote = useCallback(() => {
    setSelectedCreditNote(null);
    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.CUSTOMER]: "",
    }));
  }, [setFormData]);

  const toggleCreditMode = useCallback(() => {
    setCreditMode((prev) => {
      if (prev) {
        setSelectedCreditNote(null);
        setFormData((f) => ({
          ...f,
          [ORDER_FIELDS.CUSTOMER]: "",
        }));
      }
      return !prev;
    });
  }, [setFormData]);

  const creditOrderSelection = useMemo(() => {
    if (prefillContext?.creditNoteId) {
      return null;
    }
    if (!creditMode || !selectedCreditNote) {
      return null;
    }
    return {
      id: Number(selectedCreditNote.id),
      availableAmount: Math.max(
        0,
        Number(selectedCreditNote.available_amount) || 0
      ),
    };
  }, [prefillContext?.creditNoteId, creditMode, selectedCreditNote]);

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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    updateForm({ [name]: value });
  };

  const handleCustomerTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newType = e.target.value as CustomerType;
    setCustomerType(newType);
    setIsDataLoaded(false);
    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.ID_ORDER]: newType,
      [ORDER_FIELDS.PRICE]:
        newType === ORDER_CODE_PREFIXES.GIFT ? 0 : prev[ORDER_FIELDS.PRICE],
    }));
  };

  const clearSelectedSupplySelection = useCallback(() => {
    setSelectedSupplyId(null);
    setIsDataLoaded(false);
  }, [setIsDataLoaded, setSelectedSupplyId]);

  const { handleSubmit } = useOrderSubmit({
    formData,
    isLoading,
    updateForm,
    onSave,
    selectedSupplyId,
    products,
    prefillContext,
    creditOrderSelection,
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
  };
};

export default useCreateOrderLogic;
