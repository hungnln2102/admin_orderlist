import type { CreateSupplierEntry, SupplyPriceItem } from "./types";

export const createSupplierEntry = (): CreateSupplierEntry => {
  const globalCrypto =
    typeof globalThis !== "undefined"
      ? (globalThis as { crypto?: Crypto }).crypto
      : null;
  const id =
    globalCrypto && typeof globalCrypto.randomUUID === "function"
      ? globalCrypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return {
    id,
    sourceId: null,
    sourceName: "",
    price: "",
    numberBank: "",
    bankBin: "",
    useCustomName: false,
  };
};

const normalizeSupplyName = (value: string | null | undefined): string => {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const dedupeSupplyItems = (items: SupplyPriceItem[]): SupplyPriceItem[] => {
  const map = new Map<string, SupplyPriceItem>();
  for (const item of items) {
    const key =
      Number.isFinite(item.sourceId) && item.sourceId > 0
        ? `id:${item.sourceId}`
        : `name:${normalizeSupplyName(item.sourceName)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }

    const existingPrice = existing.price ?? Number.POSITIVE_INFINITY;
    const candidatePrice = item.price ?? Number.POSITIVE_INFINITY;
    const existingDate = Date.parse(existing.lastOrderDate ?? "") || 0;
    const candidateDate = Date.parse(item.lastOrderDate ?? "") || 0;

    if (candidatePrice < existingPrice || (candidatePrice === existingPrice && candidateDate > existingDate)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
};

export const sortSupplyItems = (items: SupplyPriceItem[]): SupplyPriceItem[] => {
  return [...items].sort((a, b) => {
    const priceA = a.price ?? Number.POSITIVE_INFINITY;
    const priceB = b.price ?? Number.POSITIVE_INFINITY;
    if (priceA !== priceB) return priceA - priceB;
    const tsA = Date.parse(a.lastOrderDate ?? "") || 0;
    const tsB = Date.parse(b.lastOrderDate ?? "") || 0;
    if (tsA !== tsB) return tsB - tsA;
    return a.sourceName.localeCompare(b.sourceName);
  });
};

export const buildSupplyRowKey = (productId: number, sourceId: number): string => `${productId}-${sourceId}`;

export const toTimestamp = (value?: string | null): number => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

export const pickCheapestSupplier = (items: SupplyPriceItem[]): SupplyPriceItem | null => {
  if (!items.length) return null;
  return items.reduce<SupplyPriceItem | null>((best, current) => {
    if (!best) return current;
    const bestPrice = best.price ?? Number.POSITIVE_INFINITY;
    const currentPrice = current.price ?? Number.POSITIVE_INFINITY;
    if (currentPrice < bestPrice) return current;
    if (currentPrice > bestPrice) return best;
    const bestTs = toTimestamp(best.lastOrderDate);
    const currentTs = toTimestamp(current.lastOrderDate);
    if (currentTs > bestTs) return current;
    return best;
  }, null);
};

export const computeHighestSupplyPrice = (items: SupplyPriceItem[], fallback?: number | null): number | null => {
  const highest = items.reduce<number>((maxValue, current) => {
    const price = typeof current.price === "number" && Number.isFinite(current.price) ? current.price : Number.NEGATIVE_INFINITY;
    return price > maxValue ? price : maxValue;
  }, Number.NEGATIVE_INFINITY);

  if (Number.isFinite(highest) && highest > 0) {
    return highest;
  }

  if (typeof fallback === "number" && Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }

  return null;
};
