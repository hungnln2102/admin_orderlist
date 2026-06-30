import type { NormalizedOrderRecord } from "./packageHelpers";

export const buildOrderLookupKey = (
  record: NormalizedOrderRecord,
  fallbackIndex: number
): string => {
  const base = record.base;
  if (base?.id !== undefined && base?.id !== null) return `id:${base.id}`;
  if (base?.id_order !== undefined && base?.id_order !== null)
    return `code:${base.id_order}`;
  return `${record.productKey || record.infoKey}-${fallbackIndex}`;
};

export function collectOrdersByProductCodes(
  codes: Set<string>,
  orderMap: Map<string, NormalizedOrderRecord[]>
): NormalizedOrderRecord[] {
  if (codes.size === 0) return [];
  const collected = new Map<string, NormalizedOrderRecord>();
  codes.forEach((code) => {
    const records = orderMap.get(code);
    if (!records?.length) return;
    records.forEach((record) => {
      const key = buildOrderLookupKey(record, collected.size);
      if (!collected.has(key)) collected.set(key, record);
    });
  });
  return Array.from(collected.values());
}

/** Match column for link: which order column to compare with package account. */
export function getMatchColumn(slotMode: "slot" | "information"): "slot" | "information" {
  return slotMode === "information" ? "information" : "slot";
}

/** Display column (opposite of match). */
export function getDisplayColumn(slotMode: "slot" | "information"): "slot" | "information" {
  return slotMode === "information" ? "slot" : "information";
}

