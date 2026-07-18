import { useMemo } from "react";
import { getWarehouseServiceDisplayName, type WarehouseItem } from "../types";

export type ProductOption = { value: string; label: string };

export function useWarehouseProducts(items: WarehouseItem[]) {
  const productOptions = useMemo((): ProductOption[] => {
    const seen = new Set<string>();
    const merged: ProductOption[] = [];

    items.forEach((it) => {
      if (!Array.isArray(it.services)) return;

      it.services.forEach((srv) => {
        const label = getWarehouseServiceDisplayName(srv);
        const value = String(srv.product_id || srv.category || label || "").trim();

        if (!value || !label) return;

        const key = value.toLowerCase();
        if (seen.has(key)) return;

        seen.add(key);
        merged.push({ value, label });
      });
    });

    merged.sort((a, b) => a.label.localeCompare(b.label, "vi"));
    return merged;
  }, [items]);

  return { productOptions, loadingProducts: false, reloadProducts: () => undefined };
}