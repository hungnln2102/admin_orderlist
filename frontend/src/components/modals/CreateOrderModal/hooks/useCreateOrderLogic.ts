import { useMemo } from "react";
import {
  DEFAULT_ORDER_CODE_PREFIX,
  ORDER_FIELDS,
} from "../../../../constants";
import { API_BASE_URL } from "../../../../lib/api";
import * as Helpers from "../../../../lib/helpers";
import { CustomerType, Order, UseCreateOrderLogicResult } from "../types";
import { useOrderFormState } from "./useOrderFormState";
import { useOrderInit } from "./useOrderInit";
import { useOrderPricingSync } from "./useOrderPricingSync";
import { useOrderSubmit } from "./useOrderSubmit";
import { usePriceCalculation } from "./usePriceCalculation";
import { useProductSelection } from "./useProductSelection";
import { useSuppliesData } from "./useSuppliesData";
import { useSupplySelection } from "./useSupplySelection";

const API_BASE = API_BASE_URL;

export const useCreateOrderLogic = (
  isOpen: boolean,
  onSave: (newOrderData: Partial<Order> | Order) => void,
  customMode: boolean
): UseCreateOrderLogicResult => {
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
  } = useSuppliesData(API_BASE);

  const productName = formData[ORDER_FIELDS.ID_PRODUCT] as string;
  const orderId = formData[ORDER_FIELDS.ID_ORDER] as string;
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

  useOrderInit({
    isOpen,
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
  });

  useOrderPricingSync({
    infoValue,
    infoRef,
    productName,
    orderId,
    registerDate,
    selectedSupplyId,
    customMode,
    customerType,
    recalcPrice,
  });

  const { handleProductSelect } = useProductSelection({
    productName,
    orderId,
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
    orderId,
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
    setSelectedSupplyId(null);
    setSupplies([]);
    setSupplyPrices([]);
    setIsDataLoaded(false);
    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.ID_PRODUCT]: "",
      [ORDER_FIELDS.SUPPLY]: "",
      [ORDER_FIELDS.COST]: 0,
      [ORDER_FIELDS.PRICE]: 0,
      [ORDER_FIELDS.DAYS]: "0",
      [ORDER_FIELDS.ORDER_EXPIRED]:
        prev[ORDER_FIELDS.ORDER_DATE] || Helpers.getTodayDMY(),
    }));
  };

  const { handleSubmit } = useOrderSubmit({
    formData,
    isLoading,
    updateForm,
    onSave,
    selectedSupplyId,
    products,
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
    handleChange,
    handleProductSelect,
    handleSourceSelect,
    handleCustomerTypeChange,
    handleSubmit,
  };
};

export default useCreateOrderLogic;
