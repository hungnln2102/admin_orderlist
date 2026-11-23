import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { externalApiClient } from "@/features/external-api/api/externalApiClient";

type ProviderNames = Record<string, string>;
const ProviderCatalog = createContext<ProviderNames>({});

export const useWarehouseProviderNames = () => useContext(ProviderCatalog);

export function WarehouseProviderCatalog({ children }: { children: ReactNode }) {
  const [names, setNames] = useState<ProviderNames>({});

  useEffect(() => {
    let active = true;
    externalApiClient.getProviders()
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (active && Array.isArray(data.providers)) {
          setNames(Object.fromEntries(data.providers.map(
            ({ key, name }: { key: string; name: string }) => [key, name || key]
          )));
        }
      })
      .catch(() => {
        if (active) setNames({});
      });
    return () => { active = false; };
  }, []);

  return <ProviderCatalog.Provider value={names}>{children}</ProviderCatalog.Provider>;
}
