import { useCallback, useState } from "react";
import { API_ENDPOINTS } from "../../../../constants";
import { apiFetch } from "@/lib/api";
import { Product, Supply, SupplyPrice } from "../types";

type CacheEntry<T> = {
  data?: T;
  ts: number;
  promise?: Promise<T>;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const dataCache = new Map<string, CacheEntry<unknown>>();

const getCacheEntry = <T,>(key: string): CacheEntry<T> => {
  const existing = dataCache.get(key) as CacheEntry<T> | undefined;
  if (existing) return existing;
  const entry: CacheEntry<T> = { ts: 0 };
  dataCache.set(key, entry as CacheEntry<unknown>);
  return entry;
};

const isFresh = <T,>(entry: CacheEntry<T>) =>
  Boolean(entry.data && Date.now() - entry.ts < CACHE_TTL_MS);

const fetchCached = async <T,>(
  key: string,
  fetcher: () => Promise<T>,
  force = false
): Promise<T> => {
  const entry = getCacheEntry<T>(key);
  if (!force && isFresh(entry)) {
    return entry.data as T;
  }
  if (entry.promise) {
    return entry.promise;
  }
  const promise = fetcher()
    .then((data) => {
      entry.data = data;
      entry.ts = Date.now();
      entry.promise = undefined;
      return data;
    })
    .catch((error) => {
      entry.promise = undefined;
      throw error;
    });
  entry.promise = promise;
  return promise;
};

const normalizeKey = (value: string) => value.trim();

export const useSuppliesData = () => {
  const [allSupplies, setAllSupplies] = useState<Supply[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplyPrices, setSupplyPrices] = useState<SupplyPrice[]>([]);

  const fetchProducts = useCallback(async (force = false) => {
    try {
      const data = await fetchCached<Product[]>(
        "products",
        async () => {
          const response = await apiFetch(API_ENDPOINTS.PRODUCT_PRICES);
          if (!response.ok) {
            throw new Error("Lỗi tải danh sách sản phẩm.");
          }
          return (await response.json()) as Product[];
        },
        force
      );
      setProducts(data);
    } catch (error) {
      console.error("Lỗi khi fetch products:", error);
    }
  }, []);

  const fetchAllSupplies = useCallback(async (force = false) => {
    try {
      const data = await fetchCached<Supply[]>(
        "supplies",
        async () => {
          const response = await apiFetch(API_ENDPOINTS.SUPPLIES);
          if (!response.ok) {
            throw new Error("Lỗi tải danh sách nguồn.");
          }
          return (await response.json()) as Supply[];
        },
        force
      );
      setAllSupplies(data);
      setSupplies((prev) => (prev.length ? prev : data));
    } catch (error) {
      console.error("Lỗi khi fetch all supplies:", error);
      setAllSupplies([]);
    }
  }, []);

  const fetchSuppliesByProduct = useCallback(
    async (product: string, force = false) => {
      const key = normalizeKey(product);
      if (!key) {
        setSupplies((prev) => (prev.length ? prev : allSupplies));
        return;
      }
      try {
        const data = await fetchCached<Supply[]>(
          `suppliesByProduct:${key}`,
          async () => {
            const response = await apiFetch(
              API_ENDPOINTS.SUPPLIES_BY_PRODUCT(key)
            );
            if (!response.ok) {
              throw new Error("Lỗi tải danh sách nguồn.");
            }
            return (await response.json()) as Supply[];
          },
          force
        );
        setSupplies(data);
      } catch (error) {
        console.error("Lỗi khi fetch supplies:", error);
        setSupplies(allSupplies);
      }
    },
    [allSupplies]
  );

  const fetchAllSupplyPrices = useCallback(
    async (product: string, force = false) => {
      const key = normalizeKey(product);
      if (!key) {
        setSupplyPrices([]);
        return;
      }
      try {
        const data = await fetchCached<SupplyPrice[]>(
          `supplyPricesByProduct:${key}`,
          async () => {
            const response = await apiFetch(
              API_ENDPOINTS.SUPPLY_PRICES_BY_PRODUCT_NAME(key)
            );
            if (!response.ok) {
              throw new Error("Lỗi tính giá nhập của nguồn.");
            }
            return (await response.json()) as SupplyPrice[];
          },
          force
        );
        setSupplyPrices(data);
      } catch (error) {
        console.error("Lỗi khi fetch all supply prices:", error);
        setSupplyPrices([]);
      }
    },
    []
  );

  return {
    allSupplies,
    supplies,
    products,
    supplyPrices,
    setSupplies,
    setSupplyPrices,
    fetchProducts,
    fetchAllSupplies,
    fetchSuppliesByProduct,
    fetchAllSupplyPrices,
  };
};

export type UseSuppliesDataReturn = ReturnType<typeof useSuppliesData>;
