import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ORDER_FIELDS } from "../../../../constants";
import { usePriceCalculation } from "../../CreateOrderModal/hooks/usePriceCalculation";
import type { Order as PricingOrder } from "../../CreateOrderModal/types";
import { Order } from "../types";
import {
  getCustomerTypeFromIdOrder,
  mergeCurrentProductOption,
} from "./editOrderPricingRules";
import { getEditOrderSupplySelection } from "./editOrderSupplySelection";
import { useEditOrderLifecycle } from "./useEditOrderLifecycle";
import { useEditOrderResources } from "./useEditOrderResources";

export const useEditOrderLogic = (order: Order | null, isOpen: boolean) => {
  const [formData, setFormData] = useState<Order | null>(null);
  const baseOrderRef = useRef<Order | null>(order);
  const [isCustomSupply, setIsCustomSupply] = useState(false);

  const {
    productOptions,
    supplies,
    supplyPrices,
    setSupplies,
    fetchProductOptions,
    fetchSuppliesForProduct,
    fetchSupplyPricesForProduct,
    mergeCurrentSupply,
    resetResources,
  } = useEditOrderResources(baseOrderRef);

  const setFormDataForPricing = useCallback<
    Dispatch<SetStateAction<Partial<PricingOrder>>>
  >((updater) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const patch =
        typeof updater === "function"
          ? (updater as (p: Partial<PricingOrder>) => Partial<PricingOrder>)({
              ...prev,
            } as Partial<PricingOrder>)
          : updater;
      return { ...prev, ...patch } as Order;
    });
  }, []);

  const currentOrderCode = String(
    formData?.[ORDER_FIELDS.ID_ORDER as keyof Order] ?? ""
  );
  const customerType = useMemo(
    () => getCustomerTypeFromIdOrder(currentOrderCode),
    [currentOrderCode]
  );

  const pricingProductName = String(
    formData?.[ORDER_FIELDS.ID_PRODUCT as keyof Order] ?? ""
  );

  const { recalcPrice, infoRef } = usePriceCalculation({
    customerType,
    setFormData: setFormDataForPricing,
    productName: pricingProductName,
  });

  useEffect(() => {
    if (!formData) return;
    infoRef.current = String(
      formData[ORDER_FIELDS.INFORMATION_ORDER as keyof Order] ?? ""
    );
  }, [formData, infoRef]);

  useEditOrderLifecycle({
    isOpen,
    order,
    formData,
    baseOrderRef,
    setFormData,
    setIsCustomSupply,
    setSupplies,
    fetchProductOptions,
    fetchSuppliesForProduct,
    fetchSupplyPricesForProduct,
    mergeCurrentSupply,
    resetResources,
  });

  const setFieldValue = useCallback(
    <K extends keyof Order>(key: K, value: Order[K]) => {
      setFormData((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const handleProductChange = useCallback((value: string) => {
    const nextProduct = String(value || "");
    setIsCustomSupply(false);
    setFormData((prev) => {
      if (!prev) return prev;
      const prevProduct = String(
        prev[ORDER_FIELDS.ID_PRODUCT as keyof Order] || ""
      );
      if (prevProduct === nextProduct) return prev;
      return {
        ...prev,
        [ORDER_FIELDS.ID_PRODUCT]: nextProduct,
        [ORDER_FIELDS.SUPPLY]: "",
      };
    });
  }, []);

  const handleSupplySelect = useCallback(
    (supplyId: number) => {
      const selection = getEditOrderSupplySelection({
        supplyId,
        formData,
        baseOrder: baseOrderRef.current,
        supplies,
        supplyPrices,
      });

      setIsCustomSupply(false);
      setFieldValue(
        ORDER_FIELDS.SUPPLY as keyof Order,
        (selection.supplyName || "") as Order[keyof Order]
      );

      if (selection.shouldRecalculatePrice) {
        recalcPrice(
          supplyId,
          selection.productName,
          selection.orderTypePrefix,
          selection.registerDate,
          Number.isFinite(selection.normalizedPrice)
            ? selection.normalizedPrice
            : undefined,
          {
            updateCost: true,
            onlyPricing: true,
          }
        );
        return;
      }

      if (Number.isFinite(selection.normalizedPrice)) {
        setFieldValue(
          ORDER_FIELDS.COST as keyof Order,
          selection.normalizedPrice as Order[typeof ORDER_FIELDS.COST]
        );
      } else if (selection.fallbackCost != null) {
        setFieldValue(
          ORDER_FIELDS.COST as keyof Order,
          selection.fallbackCost as Order[typeof ORDER_FIELDS.COST]
        );
      }
    },
    [formData, recalcPrice, setFieldValue, supplies, supplyPrices]
  );

  const handleCustomSupplyChange = useCallback(
    (value: string) => {
      setIsCustomSupply(true);
      setFieldValue(
        ORDER_FIELDS.SUPPLY as keyof Order,
        value as Order[keyof Order]
      );
    },
    [setFieldValue]
  );

  const toggleCustomSupply = useCallback(() => {
    setIsCustomSupply((prev) => {
      const next = !prev;
      if (!next) {
        setFieldValue(
          ORDER_FIELDS.SUPPLY as keyof Order,
          "" as Order[typeof ORDER_FIELDS.SUPPLY]
        );
      }
      return next;
    });
  }, [setFieldValue]);

  const resetForm = useCallback(() => {
    setFormData(baseOrderRef.current);
    const productName = baseOrderRef.current?.id_product as string | undefined;
    if (productName) {
      fetchSuppliesForProduct(productName);
      fetchSupplyPricesForProduct(productName);
    }
  }, [fetchSuppliesForProduct, fetchSupplyPricesForProduct]);

  const currentProduct = String(formData?.[ORDER_FIELDS.ID_PRODUCT] || "");
  const selectableProducts = mergeCurrentProductOption(
    productOptions,
    currentProduct
  );

  return {
    formData,
    productOptions: selectableProducts,
    supplies,
    isCustomSupply,
    supplyPrices,
    handleProductChange,
    handleSupplySelect,
    resetForm,
    setFieldValue,
    handleCustomSupplyChange,
    toggleCustomSupply,
  };
};
