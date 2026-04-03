import { useCallback, useRef, useState } from "react";
import { fetchCalculatedPrice } from "@/lib/pricingApi";
import type { ApiPriceEntry } from "../types";
import { parseApiPriceEntry } from "../utils/quoteApiParsing";
import { normalizeProductKey } from "../utils/quoteNormalize";

/**
 * Cache giá tính từ API (calculate-price) theo mã sản phẩm đã chuẩn hóa;
 * gộp request trùng key đang pending.
 */
export function useQuoteCalculatedPriceMap() {
  const [priceMap, setPriceMap] = useState<Record<string, ApiPriceEntry>>({});
  const pendingPriceRequests = useRef<
    Record<string, Promise<ApiPriceEntry | null>>
  >({});

  const ensurePriceForCodes = useCallback(
    async (codes: string[]) => {
      const pairs = codes
        .map((c) => ({ original: c, key: normalizeProductKey(c) }))
        .filter((p) => p.key);
      if (!pairs.length) return priceMap;

      const missing = pairs.filter((p) => !priceMap[p.key]);
      if (!missing.length) return priceMap;

      const updates: Record<string, ApiPriceEntry> = {};
      const started: Array<Promise<void>> = [];

      missing.forEach(({ original, key }) => {
        const existing = pendingPriceRequests.current[key];
        if (existing !== undefined) {
          started.push(
            existing.then((entry) => {
              if (entry) updates[key] = entry;
            })
          );
          return;
        }

        const request = (async (): Promise<ApiPriceEntry | null> => {
          try {
            const data = await fetchCalculatedPrice({
              san_pham_name: original,
              id_product: original,
              customer_type: "LE",
              for_quote: true,
            });
            return parseApiPriceEntry(data);
          } catch (err) {
            console.error("calculate-price failed", original, err);
            return null;
          }
        })();

        pendingPriceRequests.current[key] = request;
        started.push(
          request
            .then((entry) => {
              if (entry) updates[key] = entry;
            })
            .finally(() => {
              delete pendingPriceRequests.current[key];
            })
        );
      });

      if (started.length) {
        await Promise.all(started);
      }

      if (Object.keys(updates).length) {
        setPriceMap((prev) => ({ ...prev, ...updates }));
        return { ...priceMap, ...updates };
      }
      return priceMap;
    },
    [priceMap]
  );

  return { priceMap, ensurePriceForCodes };
}
