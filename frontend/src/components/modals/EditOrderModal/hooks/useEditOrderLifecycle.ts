import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { Order, Supply } from "../types";

type UseEditOrderLifecycleParams = {
  isOpen: boolean;
  order: Order | null;
  formData: Order | null;
  baseOrderRef: React.MutableRefObject<Order | null>;
  setFormData: Dispatch<SetStateAction<Order | null>>;
  setIsCustomSupply: Dispatch<SetStateAction<boolean>>;
  setSupplies: Dispatch<SetStateAction<Supply[]>>;
  fetchProductOptions: () => Promise<void>;
  fetchSuppliesForProduct: (productName: string) => Promise<Supply[]>;
  fetchSupplyPricesForProduct: (productName: string) => Promise<unknown[]>;
  mergeCurrentSupply: (list: Supply[]) => Supply[];
  resetResources: () => void;
};

export const useEditOrderLifecycle = ({
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
}: UseEditOrderLifecycleParams) => {
  useEffect(() => {
    if (isOpen && order) {
      const normalized: Order = {
        ...order,
        cost: Number(order.cost ?? 0),
        price: Number(order.price ?? 0),
      };
      setFormData(normalized);
      baseOrderRef.current = normalized;
      setSupplies((prev) => mergeCurrentSupply(prev));
      fetchProductOptions();
      const productName = order.id_product as string;
      if (productName) {
        fetchSuppliesForProduct(productName);
        fetchSupplyPricesForProduct(productName);
      }
      setIsCustomSupply(false);
    } else if (!isOpen) {
      setFormData(null);
      resetResources();
      setIsCustomSupply(false);
    }
  }, [
    isOpen,
    order,
    baseOrderRef,
    fetchSuppliesForProduct,
    fetchSupplyPricesForProduct,
    fetchProductOptions,
    mergeCurrentSupply,
    resetResources,
    setFormData,
    setIsCustomSupply,
    setSupplies,
  ]);

  useEffect(() => {
    if (!isOpen || !formData) return;
    const productName = String(formData.id_product || "").trim();
    const timeoutId = window.setTimeout(() => {
      fetchSuppliesForProduct(productName);
      fetchSupplyPricesForProduct(productName);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [
    isOpen,
    formData,
    fetchSuppliesForProduct,
    fetchSupplyPricesForProduct,
  ]);
};
