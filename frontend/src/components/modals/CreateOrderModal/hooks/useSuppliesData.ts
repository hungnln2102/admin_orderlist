import { useCallback, useState } from "react";
import { API_ENDPOINTS } from "../../../../constants";
import { Product, Supply, SupplyPrice } from "../types";

export const useSuppliesData = (apiBase: string) => {
  const [allSupplies, setAllSupplies] = useState<Supply[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplyPrices, setSupplyPrices] = useState<SupplyPrice[]>([]);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}${API_ENDPOINTS.PRODUCTS_ALL}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Loi tai danh sach san pham.");
      }
      const data: Product[] = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Loi khi fetch products:", error);
    }
  }, [apiBase]);

  const fetchAllSupplies = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}${API_ENDPOINTS.SUPPLIES}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Loi tai danh sach nguon.");
      }
      const data: Supply[] = await response.json();
      setAllSupplies(data);
      setSupplies((prev) => (prev.length ? prev : data));
    } catch (error) {
      console.error("Loi khi fetch all supplies:", error);
      setAllSupplies([]);
    }
  }, [apiBase]);

  const fetchSuppliesByProduct = useCallback(
    async (product: string) => {
      if (!product) {
        setSupplies((prev) => (prev.length ? prev : allSupplies));
        return;
      }
      try {
        const response = await fetch(
          `${apiBase}${API_ENDPOINTS.SUPPLIES_BY_PRODUCT(product)}`,
          { credentials: "include" }
        );
        if (!response.ok) {
          throw new Error("Loi tai danh sach nguon.");
        }
        const data: Supply[] = await response.json();
        setSupplies(data);
      } catch (error) {
        console.error("Loi khi fetch supplies:", error);
        setSupplies(allSupplies);
      }
    },
    [apiBase, allSupplies]
  );

  const fetchAllSupplyPrices = useCallback(
    async (product: string) => {
      try {
        const response = await fetch(
          `${apiBase}${API_ENDPOINTS.SUPPLY_PRICES_BY_PRODUCT_NAME(product)}`,
          { credentials: "include" }
        );
        if (!response.ok) {
          throw new Error("Loi tinh gia nhap cua nguon.");
        }
        const data: SupplyPrice[] = await response.json();
        setSupplyPrices(data);
      } catch (error) {
        console.error("Loi khi fetch all supply prices:", error);
        setSupplyPrices([]);
      }
    },
    [apiBase]
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
