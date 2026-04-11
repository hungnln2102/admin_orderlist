import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/lib/api";
import type { ProductDesc } from "../types";

export async function fetchVariantPricingRows(): Promise<Record<string, any>[]> {
  const response = await apiFetch(API_ENDPOINTS.PRODUCT_PRICES);
  if (!response.ok) throw new Error("Failed to load variant pricing");
  const data = await response.json();
  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
}

export async function fetchProductDescList(): Promise<ProductDesc[]> {
  const response = await apiFetch(API_ENDPOINTS.PRODUCT_DESCRIPTIONS);
  if (!response.ok) throw new Error("Failed to load product_desc");
  const data = await response.json();
  if (!data?.items || !Array.isArray(data.items)) return [];
  return data.items.map((item: Record<string, any>) => ({
    productId: (item.productId || item.product_id || "") as string,
    rules: item.rules ?? "",
    description: item.description ?? "",
  }));
}
