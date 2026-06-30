import type { ProductPricingRow, SupplyPriceItem } from "../../types";
import {
  applyBasePriceToProduct,
  computeHighestSupplyPrice,
  dedupeSupplyItems,
  hasValidPromoRatio,
  normalizeProductKey,
  sortSupplyItems,
} from "../../utils";

export function mapSupplyPriceResponse(payload: unknown): {
  items: SupplyPriceItem[];
  highestPrice: number | null;
} {
  const mappedItems: SupplyPriceItem[] = Array.isArray(payload)
    ? payload.map((entry, index: number) => {
        const item =
          entry && typeof entry === "object"
            ? (entry as Record<string, unknown>)
            : {};
        return {
        sourceId: Number.isFinite(Number(item.sourceId ?? item.source_id))
          ? Number(item.sourceId ?? item.source_id)
          : index,
        sourceName:
          String(item.supplier_name ?? "").trim() ||
          String(item.sourceName ?? "").trim() ||
          String(item.source_name ?? "").trim() ||
          `Nhà Cung Cấp #${Number(item.sourceId) || index + 1}`,
        price:
          typeof item.price === "number" && Number.isFinite(item.price)
            ? item.price
            : null,
        lastOrderDate:
          typeof item.last_order_date === "string"
            ? item.last_order_date
            : null,
      };
    })
    : [];

  const items = sortSupplyItems(dedupeSupplyItems(mappedItems));
  return {
    items,
    highestPrice: computeHighestSupplyPrice(items, null),
  };
}

export function reconcileFetchedProductPrices(
  rows: ProductPricingRow[],
  productKey: string,
  highestPrice: number
) {
  let changed = false;

  const nextRows = rows.map((row) => {
    if (normalizeProductKey(row.sanPhamRaw) !== productKey) return row;

    const hasSameBase =
      typeof row.baseSupplyPrice === "number" &&
      Number.isFinite(row.baseSupplyPrice) &&
      Math.abs(row.baseSupplyPrice - highestPrice) < 0.00001;
    const hasWholesale =
      typeof row.wholesalePrice === "number" &&
      Number.isFinite(row.wholesalePrice) &&
      row.wholesalePrice > 0;
    const hasRetail =
      typeof row.retailPrice === "number" &&
      Number.isFinite(row.retailPrice) &&
      row.retailPrice > 0;
    const hasStudent =
      typeof row.studentPrice === "number" &&
      Number.isFinite(row.studentPrice) &&
      row.studentPrice > 0;
    const promoNeeded = hasValidPromoRatio(
      row.pctPromo,
      row.pctKhach,
      row.pctCtv
    );
    const hasPromo =
      typeof row.promoPrice === "number" &&
      Number.isFinite(row.promoPrice) &&
      row.promoPrice > 0;

    if (hasSameBase && hasWholesale && hasRetail && hasStudent && (!promoNeeded || hasPromo)) {
      return row;
    }

    changed = true;
    return applyBasePriceToProduct(
      { ...row, baseSupplyPrice: highestPrice },
      highestPrice
    );
  });

  return changed ? nextRows : rows;
}

