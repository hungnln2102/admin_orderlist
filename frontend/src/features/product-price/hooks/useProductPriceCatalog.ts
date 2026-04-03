import { useEffect, useState } from "react";
import { fetchProductDescList, fetchVariantPricingRows } from "../api/productPriceApi";
import type { ProductDesc } from "../types";

/** Tải bảng giá biến thể + mô tả sản phẩm cho trang báo giá. */
export function useProductPriceCatalog() {
  const [productPrices, setProductPrices] = useState<Record<string, any>[]>([]);
  const [productDescs, setProductDescs] = useState<ProductDesc[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const rows = await fetchVariantPricingRows();
        if (isMounted) setProductPrices(rows);
      } catch (err) {
        console.error("Không thể tải pricing:", err);
      }
    })();
    (async () => {
      try {
        const items = await fetchProductDescList();
        if (isMounted) setProductDescs(items);
      } catch (err) {
        console.error("Không thể tải product_desc:", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return { productPrices, productDescs };
}
