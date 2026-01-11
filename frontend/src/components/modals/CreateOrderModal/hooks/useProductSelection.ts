import { useCallback, useEffect } from "react";
import { ORDER_FIELDS } from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import { Order, Supply, SupplyPrice } from "../types";

type RecalcPrice = (
  supplyId: number,
  productName: string,
  orderId: string,
  registerDate: string,
  fallbackImport?: number,
  options?: { updateCost?: boolean }
) => void;

type UseProductSelectionParams = {
  productName: string;
  orderId: string;
  registerDate: string;
  allSupplies: Supply[];
  selectedSupplyId: number | null;
  customMode: boolean;
  todayDate: string;
  setSelectedSupplyId: React.Dispatch<React.SetStateAction<number | null>>;
  setCustomProductTouched: React.Dispatch<React.SetStateAction<boolean>>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Order>>>;
  setSupplies: React.Dispatch<React.SetStateAction<Supply[]>>;
  setSupplyPrices: React.Dispatch<React.SetStateAction<SupplyPrice[]>>;
  setIsDataLoaded: (v: boolean) => void;
  fetchSuppliesByProduct: (product: string) => void;
  fetchAllSupplyPrices: (product: string) => void;
  recalcPrice: RecalcPrice;
};

export const useProductSelection = ({
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
}: UseProductSelectionParams) => {
  useEffect(() => {
    if (productName) return;
    setSelectedSupplyId(null);
    setFormData((prev) => {
      const alreadyCleared =
        !prev[ORDER_FIELDS.ID_PRODUCT] &&
        Number(prev[ORDER_FIELDS.PRICE] || 0) === 0 &&
        String(prev[ORDER_FIELDS.DAYS] || "0") === "0";
      if (alreadyCleared) return prev;
      const resetExpiry =
        (prev[ORDER_FIELDS.ORDER_DATE] as string) || Helpers.getTodayDMY();
      return {
        ...prev,
        [ORDER_FIELDS.ID_PRODUCT]: "",
        [ORDER_FIELDS.SUPPLY]: "",
        [ORDER_FIELDS.COST]: 0,
        [ORDER_FIELDS.PRICE]: 0,
        [ORDER_FIELDS.DAYS]: "0",
        [ORDER_FIELDS.ORDER_EXPIRED]: resetExpiry,
      };
    });
  }, [productName, setFormData, setSelectedSupplyId]);

  const handleProductSelect = useCallback(
    (selectedProduct: string) => {
      const trimmed = (selectedProduct || "").trim();
      setSelectedSupplyId(null);
      setCustomProductTouched(false);

      if (!trimmed) {
        setFormData((prev) => ({
          ...prev,
          [ORDER_FIELDS.ID_PRODUCT]: "",
          [ORDER_FIELDS.SUPPLY]: "",
          [ORDER_FIELDS.COST]: 0,
          [ORDER_FIELDS.PRICE]: 0,
          [ORDER_FIELDS.DAYS]: "0",
          [ORDER_FIELDS.ORDER_EXPIRED]:
            prev[ORDER_FIELDS.ORDER_DATE] || todayDate,
        }));
        setSupplies(allSupplies);
        setSupplyPrices([]);
        setIsDataLoaded(false);
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [ORDER_FIELDS.ID_PRODUCT]: trimmed,
        [ORDER_FIELDS.SUPPLY]: "",
        [ORDER_FIELDS.COST]: 0,
        [ORDER_FIELDS.PRICE]: 0,
        [ORDER_FIELDS.DAYS]: "0",
        [ORDER_FIELDS.ORDER_EXPIRED]: prev[ORDER_FIELDS.ORDER_DATE] || todayDate,
      }));
      setSupplies([]);
      setSupplyPrices([]);

      fetchSuppliesByProduct(trimmed);
      fetchAllSupplyPrices(trimmed);

      if (orderId && registerDate && !customMode) {
        const supplyId = selectedSupplyId ?? 0;
        recalcPrice(supplyId, trimmed, orderId, registerDate, undefined, {
          updateCost: Boolean(supplyId),
        });
      }
    },
    [
      allSupplies,
      customMode,
      fetchAllSupplyPrices,
      fetchSuppliesByProduct,
      orderId,
      recalcPrice,
      registerDate,
      selectedSupplyId,
      setCustomProductTouched,
      setFormData,
      setIsDataLoaded,
      setSelectedSupplyId,
      setSupplies,
      setSupplyPrices,
      todayDate,
    ]
  );

  return { handleProductSelect };
};
