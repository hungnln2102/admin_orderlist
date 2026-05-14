import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  API_ENDPOINTS,
  DEFAULT_ORDER_CODE_PREFIX,
  ORDER_CODE_PREFIXES,
  ORDER_FIELDS,
  ORDER_STATUSES,
} from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import { apiFetch } from "@/lib/api";
import { resolveOrderType } from "@/features/bill-order/helpers";
import { usePriceCalculation } from "../../CreateOrderModal/hooks/usePriceCalculation";
import type { CustomerType, Order as PricingOrder } from "../../CreateOrderModal/types";
import { Order, Supply, SupplyPrice } from "../types";
import { getSupplyName } from "../utils";

const getCustomerTypeFromIdOrder = (idOrder: string): CustomerType => {
  const upper = String(idOrder || "").trim().toUpperCase();
  if (upper.startsWith(ORDER_CODE_PREFIXES.IMPORT)) {
    return ORDER_CODE_PREFIXES.IMPORT;
  }
  return resolveOrderType(idOrder) ?? DEFAULT_ORDER_CODE_PREFIX;
};

export const useEditOrderLogic = (order: Order | null, isOpen: boolean) => {
  const [formData, setFormData] = useState<Order | null>(null);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [supplyPrices, setSupplyPrices] = useState<SupplyPrice[]>([]);
  const baseOrderRef = useRef<Order | null>(order);
  const [isCustomSupply, setIsCustomSupply] = useState(false);

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

  const customerType = useMemo(
    () =>
      getCustomerTypeFromIdOrder(
        String(formData?.[ORDER_FIELDS.ID_ORDER as keyof Order] ?? "")
      ),
    [formData?.[ORDER_FIELDS.ID_ORDER as keyof Order]]
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

  const fetchProductOptions = useCallback(async () => {
    try {
      const response = await apiFetch(API_ENDPOINTS.PRODUCT_PRICES);
      if (!response.ok) throw new Error("Lỗi tải danh sách sản phẩm.");
      const data = (await response.json()) as Array<Record<string, unknown>>;
      const names = data
        .map((item) => {
          const raw = item.san_pham ?? item.id_product ?? item.product_name ?? item.name;
          return String(raw || "").trim();
        })
        .filter(Boolean);
      setProductOptions(Array.from(new Set(names)));
    } catch (error) {
      console.error("Lỗi khi fetch product options:", error);
      setProductOptions([]);
    }
  }, []);

  const mergedProductOptions = useCallback(
    (baseOptions: string[], currentProduct: string) => {
      if (!currentProduct.trim()) return baseOptions;
      if (baseOptions.some((item) => item === currentProduct)) return baseOptions;
      return [currentProduct, ...baseOptions];
    },
    []
  );

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
      const response = await apiFetch(
        API_ENDPOINTS.SUPPLIES_BY_PRODUCT(productName)
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
        const response = await apiFetch(
          API_ENDPOINTS.SUPPLY_PRICES_BY_PRODUCT_NAME(productName)
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
      fetchProductOptions();
      const productName = order.id_product as string;
      if (productName) {
        fetchSuppliesForProduct(productName);
        fetchSupplyPricesForProduct(productName);
      }
      setIsCustomSupply(false);
    } else if (!isOpen) {
      setFormData(null);
      setProductOptions([]);
      setSupplies([]);
      setSupplyPrices([]);
      setIsCustomSupply(false);
    }
  }, [
    isOpen,
    order,
    fetchSuppliesForProduct,
    fetchSupplyPricesForProduct,
    fetchProductOptions,
    mergeCurrentSupply,
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

  const setFieldValue = useCallback(
    <K extends keyof Order>(key: K, value: Order[K]) => {
      setFormData((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const handleProductChange = useCallback(
    (value: string) => {
      const nextProduct = String(value || "");
      setIsCustomSupply(false);
      setFormData((prev) => {
        if (!prev) return prev;
        const prevProduct = String(prev[ORDER_FIELDS.ID_PRODUCT as keyof Order] || "");
        if (prevProduct === nextProduct) return prev;
        return {
          ...prev,
          [ORDER_FIELDS.ID_PRODUCT]: nextProduct,
          [ORDER_FIELDS.SUPPLY]: "",
        };
      });
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
      const statusText = String(
        formData?.[ORDER_FIELDS.STATUS as keyof Order] ?? ""
      );
      const isUnpaid = statusText === ORDER_STATUSES.CHUA_THANH_TOAN;
      const productName = String(
        formData?.[ORDER_FIELDS.ID_PRODUCT as keyof Order] || ""
      );
      const orderTypePrefix = getCustomerTypeFromIdOrder(
        String(formData?.[ORDER_FIELDS.ID_ORDER as keyof Order] || "")
      );
      let registerDate = String(
        formData?.[ORDER_FIELDS.ORDER_DATE as keyof Order] || ""
      ).trim();
      if (!registerDate) {
        registerDate = Helpers.getTodayDMY();
      }
      if (
        isUnpaid &&
        Number.isFinite(supplyId) &&
        supplyId > 0 &&
        productName &&
        orderTypePrefix
      ) {
        const fallbackImport = Number.isFinite(normalizedPrice)
          ? normalizedPrice
          : undefined;
        recalcPrice(supplyId, productName, orderTypePrefix, registerDate, fallbackImport, {
          updateCost: true,
          onlyPricing: true,
        });
        return;
      }
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
  const selectableProducts = mergedProductOptions(productOptions, currentProduct);

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
