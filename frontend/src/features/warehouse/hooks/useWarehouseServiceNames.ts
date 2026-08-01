import { useState, useEffect } from "react";
import { apiFetch } from "@/shared/api/client";

export type ServiceNameOption = {
  value: string;
  label: string;
  product_id: number | null;
  slot?: number | null;
  match?: string | null;
};

interface ServiceNameBackendItem {
  id: number;
  name: string;
  product_id: number | null;
  slot?: number | null;
  match?: string | null;
}

export function useWarehouseServiceNames() {
  const [serviceNameOptions, setServiceNameOptions] = useState<ServiceNameOption[]>([]);
  const [loadingNames, setLoadingNames] = useState(true);

  const fetchNames = async () => {
    setLoadingNames(true);
    try {
      const res = await apiFetch("/api/warehouse/product-names");
      if (res.ok) {
        const data = await res.json();
        const options = data.map((item: ServiceNameBackendItem) => ({
          value: String(item.id),
          label: item.name,
          product_id: item.product_id,
          slot: item.slot,
          match: item.match,
        }));

        options.sort((a: ServiceNameOption, b: ServiceNameOption) => a.label.localeCompare(b.label, "vi"));
        setServiceNameOptions(options);
      }
    } catch (error) {
      console.error("Failed to load warehouse service names", error);
    } finally {
      setLoadingNames(false);
    }
  };

  useEffect(() => {
    fetchNames();
  }, []);

  return {
    serviceNameOptions,
    loadingNames,
    reloadNames: fetchNames,
  };
}
