import { useCallback, useState } from "react";
import type React from "react";
import { apiGet } from "@/shared/api/client";
import { API_ENDPOINTS } from "@/constants";
import type { ProductPricingRow, SupplyPriceState } from "../types";
import { normalizeProductKey } from "../priceLabels";
import {
  mapSupplyPriceResponse,
  reconcileFetchedProductPrices,
} from "./supplyActionHelpers";

interface UseSupplyPriceMapParams {
  setProductPrices: React.Dispatch<React.SetStateAction<ProductPricingRow[]>>;
}

export function useSupplyPriceMap({
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
        const payload = await apiGet<unknown>(
          API_ENDPOINTS.SUPPLY_PRICES_BY_PRODUCT_NAME(productName)
        );
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
    [setProductPrices]
  );

  return {
    supplyPriceMap,
    setSupplyPriceMap,
    fetchSupplyPricesForProduct,
  };
}
