import { useState, useEffect, useCallback } from "react";
import { CatalogProduct, CatalogSupplier, CatalogSupplierCost } from "../types";

export function useOrderCatalog() {
  const [productsCatalog, setProductsCatalog] = useState<CatalogProduct[]>([]);
  const [allSuppliersCatalog, setAllSuppliersCatalog] = useState<CatalogSupplier[]>([]);
  const [productSuppliersCatalog, setProductSuppliersCatalog] = useState<CatalogSupplierCost[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Fetch product catalog and all suppliers catalog once on mount
  useEffect(() => {
    fetch("/api/products/prices?limit=500&activeOnly=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setProductsCatalog(data.data);
      })
      .catch((err) => console.error("Lỗi tải danh mục sản phẩm:", err));

    fetch("/api/products/all-suppliers")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setAllSuppliersCatalog(list);
      })
      .catch((err) => console.error("Lỗi tải danh sách NCC:", err));
  }, []);

  const fetchSuppliersForProduct = useCallback(async (productId: number) => {
    setLoadingSuppliers(true);
    try {
      const res = await fetch(`/api/products/${productId}/suppliers`);
      const data = await res.json();
      if (res.ok) {
        const list: CatalogSupplierCost[] = Array.isArray(data) ? data : data.data || [];
        setProductSuppliersCatalog(list);
        return list;
      }
    } catch (err) {
      console.error("Lỗi tải NCC cho sản phẩm:", err);
    } finally {
      setLoadingSuppliers(false);
    }
    setProductSuppliersCatalog([]);
    return [];
  }, []);

  return {
    productsCatalog,
    allSuppliersCatalog,
    productSuppliersCatalog,
    setProductSuppliersCatalog,
    loadingSuppliers,
    selectedProductId,
    setSelectedProductId,
    fetchSuppliersForProduct,
  };
}
