import { useEffect } from "react";
import { CustomerType } from "../types";

type RecalcPrice = (
  supplyId: number,
  productName: string,
  orderId: string,
  registerDate: string,
  fallbackImport?: number,
  options?: { updateCost?: boolean }
) => void;

type UseOrderPricingSyncParams = {
  infoValue: string;
  infoRef: React.MutableRefObject<string>;
  productName: string;
  orderId: string;
  registerDate: string;
  selectedSupplyId: number | null;
  customMode: boolean;
  customerType: CustomerType;
  recalcPrice: RecalcPrice;
};

export const useOrderPricingSync = ({
  infoValue,
  infoRef,
  productName,
  orderId,
  registerDate,
  selectedSupplyId,
  customMode,
  customerType,
  recalcPrice,
}: UseOrderPricingSyncParams) => {
  useEffect(() => {
    infoRef.current = infoValue || "";
  }, [infoValue, infoRef]);

  useEffect(() => {
    if (!productName || !orderId || !registerDate) return;
    if (customMode) return;

    const supplyId = selectedSupplyId ?? 0;
    recalcPrice(supplyId, productName, orderId, registerDate, undefined, {
      updateCost: Boolean(supplyId),
    });
  }, [
    customerType,
    recalcPrice,
    productName,
    orderId,
    registerDate,
    selectedSupplyId,
    customMode,
  ]);
};
