import { useCallback, useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "@/constants";
import { apiGet } from "@/shared/api/client";
import type { WarehouseItem } from "../types";

type CatalogProduct = {
  id?: number;
  package_name?: string;
};

export type ProductOption = { value: string; label: string };

export function useWarehouseProducts(items: WarehouseItem[]) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const data = await apiGet<CatalogProduct[]>("/api/products/packages");
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const productOptions = useMemo((): ProductOption[] => {
    const fromApi = products
      .filter((p) => p.id && String(p.package_name || "").trim())
      .map((p) => {
        const value = String(p.id).trim();
        const label = String(p.package_name).trim();
        return { value, label };
      });

    const fromStock: string[] = [];
    items.forEach((it) => {
      if (Array.isArray(it.services)) {
        it.services.forEach((srv) => {
          const cat = String(srv.category || "").trim();
          if (cat) fromStock.push(cat);
        });
      }
    });

    const seen = new Set<string>();
    const merged: ProductOption[] = [];

    for (const opt of fromApi) {
      const key = opt.value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(opt);
    }

    for (const name of fromStock) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ value: name, label: name });
    }

    merged.sort((a, b) => a.label.localeCompare(b.label, "vi"));
    return merged;
  }, [products, items]);

  return { productOptions, loadingProducts, reloadProducts: loadProducts };
}
