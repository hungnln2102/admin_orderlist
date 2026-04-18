import { useEffect } from "react";
import {
  DEFAULT_ORDER_CODE_PREFIX,
  ORDER_FIELDS,
} from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import { INITIAL_FORM_DATA } from "../helpers";
import { CreateOrderPrefillContext, CustomerType, Order, Supply, SupplyPrice } from "../types";

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
  prefillContext?: CreateOrderPrefillContext | null;
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
  prefillContext,
}: UseOrderInitParams) => {
  useEffect(() => {
    if (!isOpen) return;
    const prefillReservedCode = String(prefillContext?.reservedOrderCode || "").trim().toUpperCase();
    const detectedPrefix = (["MAVC", "MAVL", "MAVK", "MAVT", "MAVN", "MAVS"] as const).find((prefix) =>
      prefillReservedCode.startsWith(prefix)
    );
    const initialType: CustomerType = (detectedPrefix || DEFAULT_ORDER_CODE_PREFIX) as CustomerType;
    const initialDate = Helpers.getTodayDMY();

    setCustomerType(initialType);
    setFormData({
      ...INITIAL_FORM_DATA,
      ...(prefillContext?.initialFormData || {}),
      [ORDER_FIELDS.ID_ORDER]: initialType,
      [ORDER_FIELDS.ORDER_DATE]:
        ((prefillContext?.initialFormData?.[ORDER_FIELDS.ORDER_DATE] as string) || initialDate),
      [ORDER_FIELDS.EXPIRY_DATE]:
        ((prefillContext?.initialFormData?.[ORDER_FIELDS.EXPIRY_DATE] as string) || initialDate),
    });
    setIsDataLoaded(false);
    setSelectedSupplyId(null);
    setSupplies([]);
    setSupplyPrices([]);
    setCustomProductTouched(false);
    fetchProducts();
    fetchAllSupplies();
  }, [
    prefillContext,
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
      [ORDER_FIELDS.ID_ORDER]: customerType,
    }));
  }, [customerType, isOpen, setFormData]);
};
