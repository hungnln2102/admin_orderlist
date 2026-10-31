import { useState, useEffect, useCallback, useRef } from "react";
import { CatalogProduct, CatalogSupplier, CatalogSupplierCost } from "../types";

export type OrderCatalogSnapshot = {
  products: CatalogProduct[];
  suppliers: CatalogSupplier[];
  packages: any[];
  categories: any[];
};

type EnsureCatalogOptions = {
  refresh?: boolean;
};

async function fetchCatalogJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Không thể tải catalog đơn hàng.");
  return data as T;
}

export function useOrderCatalog() {
  const [productsCatalog, setProductsCatalog] = useState<CatalogProduct[]>([]);
  const [allSuppliersCatalog, setAllSuppliersCatalog] = useState<CatalogSupplier[]>([]);
  const [packageProductsList, setPackageProductsList] = useState<any[]>([]);
  const [packageCategoriesList, setPackageCategoriesList] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [productSuppliersCatalog, setProductSuppliersCatalog] = useState<CatalogSupplierCost[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const catalogRef = useRef<OrderCatalogSnapshot | null>(null);
  const catalogPromiseRef = useRef<Promise<OrderCatalogSnapshot> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyCatalog = useCallback((snapshot: OrderCatalogSnapshot) => {
    if (!mountedRef.current) return;
    setProductsCatalog(snapshot.products);
    setAllSuppliersCatalog(snapshot.suppliers);
    setPackageProductsList(snapshot.packages);
    setPackageCategoriesList(snapshot.categories);
  }, []);

  const ensureOrderCatalog = useCallback(async ({ refresh = false }: EnsureCatalogOptions = {}): Promise<OrderCatalogSnapshot> => {
    if (catalogPromiseRef.current) return catalogPromiseRef.current;
    if (catalogRef.current && !refresh) return catalogRef.current;

    setLoadingCatalog(true);
    setCatalogError(null);
    const promise = Promise.all([
      fetchCatalogJson<{ data?: CatalogProduct[] }>("/api/products/prices?limit=1000"),
      fetchCatalogJson<CatalogSupplier[] | { data?: CatalogSupplier[] }>("/api/products/all-suppliers"),
      fetchCatalogJson<{ data?: any[] }>("/api/products/packages"),
      fetchCatalogJson<any[] | { data?: any[] }>("/api/products/packages/categories"),
    ])
      .then(([productsResult, suppliersResult, packagesResult, categoriesResult]) => {
        const products = Array.isArray(productsResult.data) ? productsResult.data : [];
        const rawSuppliers = Array.isArray(suppliersResult)
          ? suppliersResult
          : suppliersResult.data || [];
        const packages = Array.isArray(packagesResult.data) ? packagesResult.data : [];
        const categories = Array.isArray(categoriesResult)
          ? categoriesResult
          : categoriesResult.data || [];
        const snapshot: OrderCatalogSnapshot = {
          products,
          suppliers: rawSuppliers.map((supplier: any) => ({ ...supplier, id: Number(supplier.id) })),
          packages,
          categories,
        };
        catalogRef.current = snapshot;
        applyCatalog(snapshot);
        return snapshot;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Không thể tải catalog đơn hàng.";
        if (mountedRef.current) setCatalogError(message);
        throw error;
      })
      .finally(() => {
        catalogPromiseRef.current = null;
        if (mountedRef.current) setLoadingCatalog(false);
      });

    catalogPromiseRef.current = promise;
    return promise;
  }, [applyCatalog]);

  const fetchSuppliersForProduct = useCallback(async (productId: number) => {
    setLoadingSuppliers(true);
    try {
      const data = await fetchCatalogJson<CatalogSupplierCost[] | { data?: CatalogSupplierCost[] }>(`/api/products/${productId}/suppliers`);
      const list: CatalogSupplierCost[] = Array.isArray(data) ? data : data.data || [];
      setProductSuppliersCatalog(list);
      return list;
    } catch (err) {
      console.error("Lỗi tải NCC cho sản phẩm:", err);
      setProductSuppliersCatalog([]);
      return [];
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  return {
    productsCatalog,
    allSuppliersCatalog,
    packageProductsList,
    packageCategoriesList,
    loadingCatalog,
    catalogError,
    ensureOrderCatalog,
    productSuppliersCatalog,
    setProductSuppliersCatalog,
    loadingSuppliers,
    selectedProductId,
    setSelectedProductId,
    fetchSuppliersForProduct,
  };
}
