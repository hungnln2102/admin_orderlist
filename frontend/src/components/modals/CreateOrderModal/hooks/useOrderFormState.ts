import { useCallback, useState } from "react";
import { INITIAL_FORM_DATA } from "../helpers";
import { CustomerType, Order } from "../types";

export const useOrderFormState = (defaultCustomerType: CustomerType) => {
  const [formData, setFormData] = useState<Partial<Order>>(INITIAL_FORM_DATA);
  const [customerType, setCustomerType] =
    useState<CustomerType>(defaultCustomerType);
  const [selectedSupplyId, setSelectedSupplyId] = useState<number | null>(null);
  const [customProductTouched, setCustomProductTouched] = useState(false);

  const updateForm = useCallback((patch: Partial<Order>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  return {
    formData,
    setFormData,
    customerType,
    setCustomerType,
    selectedSupplyId,
    setSelectedSupplyId,
    customProductTouched,
    setCustomProductTouched,
    updateForm,
  };
};

export type UseOrderFormStateReturn = ReturnType<typeof useOrderFormState>;
