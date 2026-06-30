import { useCallback, useState, type MutableRefObject } from "react";
import { API_ENDPOINTS, ORDER_FIELDS } from "../../../../constants";
import { apiFetch } from "@/shared/api/client";
import type { Order, Supply, SupplyPrice } from "../types";
import { getSupplyName } from "../utils";

export const useEditOrderResources = (
  baseOrderRef: MutableRefObject<Order | null>
) => {
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [supplyPrices, setSupplyPrices] = useState<SupplyPrice[]>([]);

  const getCurrentSupplyOption = useCallback((): Supply | null => {
    const currentSupplyName =
      (baseOrderRef.current?.[ORDER_FIELDS.SUPPLY as keyof Order] as string) ||
      "";
    if (!currentSupplyName.trim()) return null;
    return {
      id: -1,
      supplier_name: currentSupplyName,
      source_name: currentSupplyName,
    };
  }, [baseOrderRef]);

  const mergeCurrentSupply = useCallback(
    (list: Supply[]): Supply[] => {
      const currentSupply = getCurrentSupplyOption();
      if (!currentSupply) return list;

      const exists = list.some(
        (item) => getSupplyName(item) === getSupplyName(currentSupply)
      );
      return exists ? list : [currentSupply, ...list];
    },
    [getCurrentSupplyOption]
  );

  const fetchProductOptions = useCallback(async () => {
    try {
      const response = await apiFetch(API_ENDPOINTS.PRODUCT_PRICES);
      if (!response.ok) throw new Error("L???i t???i danh s??ch s???n ph???m.");
      const data = (await response.json()) as Array<Record<string, unknown>>;
      const names = data
        .map((item) => {
          const raw =
            item.san_pham ?? item.id_product ?? item.product_name ?? item.name;
          return String(raw || "").trim();
        })
        .filter(Boolean);
      setProductOptions(Array.from(new Set(names)));
    } catch (error) {
      console.error("L???i khi fetch product options:", error);
      setProductOptions([]);
    }
  }, []);

  const fetchSuppliesForProduct = useCallback(
    async (productName: string) => {
      if (!productName) {
        const merged = mergeCurrentSupply([]);
        setSupplies(merged);
        return merged;
      }
      try {
        const response = await apiFetch(
          API_ENDPOINTS.SUPPLIES_BY_PRODUCT(productName)
        );
        if (!response.ok) throw new Error("L???i t???i danh s??ch ngu???n.");
        const data: Supply[] = await response.json();
        const merged = mergeCurrentSupply(data);
        setSupplies(merged);
        return merged;
      } catch (error) {
        console.error("L???i khi fetch supplies cho s???n ph???m:", error);
        const merged = mergeCurrentSupply([]);
        setSupplies(merged);
        return merged;
      }
    },
    [mergeCurrentSupply]
  );

  const fetchSupplyPricesForProduct = useCallback(async (productName: string) => {
    if (!productName) {
      setSupplyPrices([]);
      return [];
    }
    try {
      const response = await apiFetch(
        API_ENDPOINTS.SUPPLY_PRICES_BY_PRODUCT_NAME(productName)
      );
      if (!response.ok) throw new Error("L???i t???i danh s??ch gi?? ngu???n.");
      const data: SupplyPrice[] = await response.json();
      setSupplyPrices(data);
      return data;
    } catch (error) {
      console.error("L???i khi fetch gi?? ngu???n cho s???n ph???m:", error);
      setSupplyPrices([]);
      return [];
    }
  }, []);

  const resetResources = useCallback(() => {
    setProductOptions([]);
    setSupplies([]);
    setSupplyPrices([]);
  }, []);

  return {
    productOptions,
    supplies,
    supplyPrices,
    setSupplies,
    fetchProductOptions,
    fetchSuppliesForProduct,
    fetchSupplyPricesForProduct,
    mergeCurrentSupply,
    resetResources,
  };
};
