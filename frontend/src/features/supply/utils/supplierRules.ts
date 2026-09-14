import { SUPPLY_COLS, SUPPLY_PRICE_COLS } from "@/lib/tableSql";

export type SupplyLike = Partial<{
  [SUPPLY_COLS.id]: number;
  [SUPPLY_COLS.sourceName]: string;
  name: string;
}>;

export type SupplyPriceLike = Partial<{
  [SUPPLY_PRICE_COLS.sourceId]: number;
  [SUPPLY_PRICE_COLS.price]: number;
  [SUPPLY_COLS.sourceName]: string;
}>;

export const getImportPriceBySupplyName = (
  supplyName: string,
  supplyPrices: SupplyPriceLike[],
  supplies: SupplyLike[] = []
): number | undefined => {
  const targetName = supplyName || "";
  if (!targetName) return undefined;

  const supplyId =
    supplies.find(
      (s) => (s[SUPPLY_COLS.sourceName] || s.name || "") === targetName
    )?.[SUPPLY_COLS.id] ?? null;

  if (supplyId !== null) {
    const priceById = supplyPrices.find(
      (p) => p[SUPPLY_PRICE_COLS.sourceId] === supplyId
    );
    const priceValue = priceById?.[SUPPLY_PRICE_COLS.price];
    if (Number.isFinite(priceValue)) {
      return Number(priceValue);
    }
  }

  const priceByName = supplyPrices.find(
    (p) => (p[SUPPLY_COLS.sourceName] || "") === targetName
  );
  const priceValue = priceByName?.[SUPPLY_PRICE_COLS.price];
  return Number.isFinite(priceValue) ? Number(priceValue) : undefined;
};

/** NCC cửa hàng nội bộ: không dùng giá nhập; giá bán = lợi nhuận (backend cost = 0). */
export const isMavrykShopSupplierName = (name: string | null | undefined): boolean => {
  const raw = String(name ?? "").trim().toLowerCase();
  return raw === "mavryk" || raw === "shop";
};
