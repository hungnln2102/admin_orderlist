import { useEffect, useMemo } from "react";
import {
  DEFAULT_ORDER_CODE_PREFIX,
  ORDER_FIELDS,
} from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import { INITIAL_FORM_DATA } from "../helpers";
import { CustomerType, Order, Supply, SupplyPrice } from "../types";

type UseOrderInitParams = {
  isOpen: boolean;
  customerType: CustomerType;
  setCustomerType: React.Dispatch<React.SetStateAction<CustomerType>>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Order>>>;
  setIsDataLoaded: (v: boolean) => void;
  setSelectedSupplyId: React.Dispatch<React.SetStateAction<number | null>>;
  setSupplies: React.Dispatch<React.SetStateAction<Supply[]>>;
  setSupplyPrices: React.Dispatch<React.SetStateAction<SupplyPrice[]>>;
  setCustomProductTouched: React.Dispatch<React.SetStateAction<boolean>>;
  fetchProducts: () => void;
  fetchAllSupplies: () => void;
};

export const useOrderInit = ({
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
}: UseOrderInitParams) => {
  const currentOrderId = useMemo(
    () => customerType + Helpers.generateRandomId(5),
    [customerType]
  );

  useEffect(() => {
    if (!isOpen) return;
    const initialType: CustomerType = DEFAULT_ORDER_CODE_PREFIX;
    const initialID = initialType + Helpers.generateRandomId(5);
    const initialDate = Helpers.getTodayDMY();

    setCustomerType(initialType);
    setFormData({
      ...INITIAL_FORM_DATA,
      [ORDER_FIELDS.ID_ORDER]: initialID,
      [ORDER_FIELDS.ORDER_DATE]: initialDate,
      [ORDER_FIELDS.ORDER_EXPIRED]: initialDate,
    });
    setIsDataLoaded(false);
    setSelectedSupplyId(null);
    setSupplies([]);
    setSupplyPrices([]);
    setCustomProductTouched(false);
    fetchProducts();
    fetchAllSupplies();
  }, [
    fetchAllSupplies,
    fetchProducts,
    isOpen,
    setCustomerType,
    setFormData,
    setIsDataLoaded,
    setSelectedSupplyId,
    setSupplies,
    setSupplyPrices,
    setCustomProductTouched,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.ID_ORDER]: currentOrderId,
    }));
  }, [currentOrderId, isOpen, setFormData]);
};
