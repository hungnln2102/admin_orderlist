import { useCallback, useEffect, useRef, useState } from "react";
import { API_ENDPOINTS, ORDER_FIELDS } from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import { API_BASE_URL } from "../../../../lib/api";
import { Order, Supply, SupplyPrice } from "../types";
import { getSupplyName } from "../utils";

const API_BASE = API_BASE_URL;

export const useEditOrderLogic = (order: Order | null, isOpen: boolean) => {
  const [formData, setFormData] = useState<Order | null>(null);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [supplyPrices, setSupplyPrices] = useState<SupplyPrice[]>([]);
  const baseOrderRef = useRef<Order | null>(order);
  const [isCustomSupply, setIsCustomSupply] = useState(false);

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
  }, []);

  const mergeCurrentSupply = useCallback(
    (list: Supply[]): Supply[] => {
      const currentSupply = getCurrentSupplyOption();
      if (currentSupply) {
        const exists = list.some(
          (item) => getSupplyName(item) === getSupplyName(currentSupply)
        );
        if (!exists) {
          return [currentSupply, ...list];
        }
      }
      return list;
    },
    [getCurrentSupplyOption]
  );

  const fetchSuppliesForProduct = useCallback(async (productName: string) => {
    if (!productName) {
      const merged = mergeCurrentSupply([]);
      setSupplies(merged);
      return merged;
    }
    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.SUPPLIES_BY_PRODUCT(productName)}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Lỗi tải danh sách nguồn.");
      const data: Supply[] = await response.json();
      const merged = mergeCurrentSupply(data);
      setSupplies(merged);
      return merged;
    } catch (error) {
      console.error("Lỗi khi fetch supplies cho sản phẩm:", error);
      const merged = mergeCurrentSupply([]);
      setSupplies(merged);
      return merged;
    }
  }, [mergeCurrentSupply]);

  const fetchSupplyPricesForProduct = useCallback(
    async (productName: string) => {
      if (!productName) {
        setSupplyPrices([]);
        return [];
      }
      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.SUPPLY_PRICES_BY_PRODUCT_NAME(
            productName
          )}`,
          { credentials: "include" }
        );
        if (!response.ok) throw new Error("Lỗi tải danh sách giá nguồn.");
        const data: SupplyPrice[] = await response.json();
        setSupplyPrices(data);
        return data;
      } catch (error) {
        console.error("Lỗi khi fetch giá nguồn cho sản phẩm:", error);
        setSupplyPrices([]);
        return [];
      }
    },
    []
  );

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
      const productName = order.id_product as string;
      if (productName) {
        fetchSuppliesForProduct(productName);
        fetchSupplyPricesForProduct(productName);
      }
      setIsCustomSupply(false);
    } else if (!isOpen) {
      setFormData(null);
      setSupplies([]);
      setSupplyPrices([]);
      setIsCustomSupply(false);
    }
  }, [
    isOpen,
    order,
    fetchSuppliesForProduct,
    fetchSupplyPricesForProduct,
    mergeCurrentSupply,
  ]);

  useEffect(() => {
    if (!isOpen || !formData?.id_product) return;
    const productName = formData.id_product as string;
    fetchSuppliesForProduct(productName);
    fetchSupplyPricesForProduct(productName);
  }, [
    isOpen,
    formData?.id_product,
    fetchSuppliesForProduct,
    fetchSupplyPricesForProduct,
  ]);

  const setFieldValue = useCallback(
    <K extends keyof Order>(key: K, value: Order[K]) => {
      setFormData((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const handleSupplySelect = useCallback(
    (supplyId: number) => {
      const selected = supplies.find((s) => s.id === supplyId);
      const supplyName =
        getSupplyName(selected) ||
        (formData?.[ORDER_FIELDS.SUPPLY as keyof Order] as string) ||
        "";
      setIsCustomSupply(false);
      setFieldValue(
        ORDER_FIELDS.SUPPLY as keyof Order,
        (supplyName || "") as Order[keyof Order]
      );
      const matchedPrice =
        Helpers.getImportPriceBySupplyName(
          supplyName,
          supplyPrices,
          supplies
        ) ??
        supplyPrices.find((p) => p.source_id === supplyId)?.price ??
        null;
      const normalizedPrice = Number(matchedPrice);
      if (Number.isFinite(normalizedPrice)) {
        setFieldValue(
          ORDER_FIELDS.COST as keyof Order,
          normalizedPrice as Order[typeof ORDER_FIELDS.COST]
        );
      } else if (baseOrderRef.current) {
        const fallbackCost = Number(
          baseOrderRef.current[ORDER_FIELDS.COST as keyof Order] || 0
        );
        setFieldValue(
          ORDER_FIELDS.COST as keyof Order,
          fallbackCost as Order[typeof ORDER_FIELDS.COST]
        );
      }
    },
    [formData, setFieldValue, supplies, supplyPrices]
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

  return {
    formData,
    supplies,
    isCustomSupply,
    supplyPrices,
    handleSupplySelect,
    resetForm,
    setFieldValue,
    handleCustomSupplyChange,
    toggleCustomSupply,
  };
};
