import { useState, useEffect } from "react";
import { apiFetch } from "@/shared/api/client";
import { type WarehouseItem } from "../types";

export type ProductOption = { value: string; label: string; nameId?: number };

export function useWarehouseProducts(items: WarehouseItem[]) {
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const fetchOptions = async () => {
    setLoadingProducts(true);
    try {
      const res = await apiFetch("/api/products/packages");
      if (res.ok) {
        const data = await res.json();
        const options = data.map((item: any) => ({
          value: String(item.id),
          label: item.package_name,
        }));
        
        // Remove duplicates by value
        const seen = new Set<string>();
        const uniqueOptions = options.filter((opt: ProductOption) => {
          if (seen.has(opt.value)) return false;
          seen.add(opt.value);
          return true;
        });

        uniqueOptions.sort((a: ProductOption, b: ProductOption) => a.label.localeCompare(b.label, "vi"));
        setProductOptions(uniqueOptions);
      }
    } catch (error) {
      console.error("Failed to load product names", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  return { productOptions, loadingProducts, reloadProducts: fetchOptions };
}