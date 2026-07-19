import { useState, useEffect } from "react";
import { apiGet } from "@/shared/api/client";
import { API_ENDPOINTS } from "@/constants";

export type SystemProductOption = {
  value: string;
  label: string;
};

export function useSystemProducts() {
  const [options, setOptions] = useState<SystemProductOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // We reuse the existing products endpoint which returns all variants
        const data = await apiGet<any[]>(API_ENDPOINTS.PRODUCTS_ALL);
        if (mounted && Array.isArray(data)) {
          const mapped = data.map((p) => {
            const displayName = p.id_product || p.san_pham;
            const variantName = p.package_product;
            let label = displayName;
            if (displayName && variantName) {
              label = `${displayName} - ${variantName}`;
            } else if (variantName) {
              label = variantName;
            }
            return {
              value: String(p.id),
              label: label || `ID: ${p.id}`,
            };
          });
          setOptions(mapped);
        }
      } catch (err) {
        console.error("Failed to load system products", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      mounted = false;
    };
  }, []);

  return { systemProductOptions: options, loadingSystemProducts: loading };
}
