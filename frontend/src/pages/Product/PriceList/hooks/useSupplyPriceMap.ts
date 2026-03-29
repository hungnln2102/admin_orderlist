import { useCallback, useState } from "react";
import type React from "react";
import { API_ENDPOINTS } from "../../../../constants";
import type { ProductPricingRow, SupplyPriceState } from "../types";
import { normalizeProductKey } from "../utils";
import {
  mapSupplyPriceResponse,
  reconcileFetchedProductPrices,
} from "./supplyActionHelpers";

interface UseSupplyPriceMapParams {
  apiBase: string;
  setProductPrices: React.Dispatch<React.SetStateAction<ProductPricingRow[]>>;
}

export function useSupplyPriceMap({
  apiBase,
  setProductPrices,
}: UseSupplyPriceMapParams) {
  const [supplyPriceMap, setSupplyPriceMap] = useState<
    Record<string, SupplyPriceState>
  >({});

  const fetchSupplyPricesForProduct = useCallback(
    async (productName: string) => {
      const productKey = normalizeProductKey(productName);
      if (!productKey) return;

      setSupplyPriceMap((prev) => ({
        ...prev,
        [productKey]: {
          items: prev[productKey]?.items ?? [],
          loading: true,
          error: null,
          productName: prev[productKey]?.productName ?? productName,
        },
      }));

      try {
        const response = await fetch(
          `${apiBase}${API_ENDPOINTS.SUPPLY_PRICES_BY_PRODUCT_NAME(productName)}`,
          { credentials: "include" }
        );
        if (!response.ok) {
          throw new Error("Không thể tải giá nguồn. Vui lòng thử lại.");
        }

        const payload = await response.json();
        const { items, highestPrice } = mapSupplyPriceResponse(payload);

        if (
          typeof highestPrice === "number" &&
          Number.isFinite(highestPrice) &&
          highestPrice > 0
        ) {
          setProductPrices((prev) =>
            reconcileFetchedProductPrices(prev, productKey, highestPrice)
          );
        }

        setSupplyPriceMap((prev) => ({
          ...prev,
          [productKey]: {
            loading: false,
            error: null,
            items,
            productName,
          },
        }));
      } catch (err) {
        setSupplyPriceMap((prev) => ({
          ...prev,
          [productKey]: {
            loading: false,
            items: prev[productKey]?.items ?? [],
            error:
              err instanceof Error
                ? err.message
                : "Không thể tải giá nguồn. Vui lòng thử lại.",
            productName: prev[productKey]?.productName ?? productName,
          },
        }));
      }
    },
    [apiBase, setProductPrices]
  );

  return {
    supplyPriceMap,
    setSupplyPriceMap,
    fetchSupplyPricesForProduct,
  };
}
