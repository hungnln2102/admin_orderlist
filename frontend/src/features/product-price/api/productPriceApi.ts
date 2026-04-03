import { API_ENDPOINTS } from "@/constants";
import type { ProductDesc } from "../types";

function resolveApiBase(): string {
  return (
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env
        ?.VITE_API_BASE_URL) ||
    (typeof process !== "undefined"
      ? (process as { env?: { VITE_API_BASE_URL?: string } }).env
          ?.VITE_API_BASE_URL || ""
      : "") ||
    "http://localhost:3001"
  );
}

export async function fetchVariantPricingRows(): Promise<Record<string, any>[]> {
  const response = await fetch(
    `${resolveApiBase()}${API_ENDPOINTS.PRODUCT_PRICES}`,
    { credentials: "include" }
  );
  if (!response.ok) throw new Error("Failed to load variant pricing");
  const data = await response.json();
  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
}

export async function fetchProductDescList(): Promise<ProductDesc[]> {
  const response = await fetch(
    `${resolveApiBase()}${API_ENDPOINTS.PRODUCT_DESCRIPTIONS}`,
    { credentials: "include" }
  );
  if (!response.ok) throw new Error("Failed to load product_desc");
  const data = await response.json();
  if (!data?.items || !Array.isArray(data.items)) return [];
  return data.items.map((item: Record<string, any>) => ({
    productId: (item.productId || item.product_id || "") as string,
    rules: item.rules ?? "",
    description: item.description ?? "",
  }));
}
