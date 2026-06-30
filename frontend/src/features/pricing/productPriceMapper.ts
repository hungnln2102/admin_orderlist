import { VARIANT_PRICING_COLS } from "@/lib/tableSql";
import type { ProductPricingRow } from "./types";
import { buildVariantLabel, cleanupLabel } from "./priceLabels";
import { parseBoolean, toNumberOrNull } from "./priceParsing";

export const mapProductPriceRow = (
  row: Record<string, unknown>,
  fallbackId: number
): ProductPricingRow => {
  const packageName = cleanupLabel(row?.[VARIANT_PRICING_COLS.packageName] ?? row?.package_label);
  const packageProduct = cleanupLabel(row?.[VARIANT_PRICING_COLS.variantName] ?? row?.package_product_label);
  const sanPhamRaw = (row?.[VARIANT_PRICING_COLS.code] ?? row?.id_product_label ?? row?.id_product ?? "").toString().trim();

  const wholesalePrice = toNumberOrNull(
    row?.[VARIANT_PRICING_COLS.pctCtv] ??
      row?.computed_wholesale_price ??
      row?.wholesale_price ??
      row?.gia_si ??
      row?.gia_ctv
  );
  const pctKhach = toNumberOrNull(
    row?.[VARIANT_PRICING_COLS.pctKhach] ??
      row?.computed_retail_price ??
      row?.retail_price ??
      row?.gia_le
  );
  const pctPromo = toNumberOrNull(
    row?.[VARIANT_PRICING_COLS.pctPromo] ??
      row?.computed_promo_price ??
      row?.promo_price ??
      row?.gia_khuyen_mai ??
      row?.gia_km
  );
  const pctStu = toNumberOrNull(
    row?.[VARIANT_PRICING_COLS.pctStu] ??
      row?.student_price
  );

  return {
    id: Number.isFinite(Number(row?.id)) ? Number(row?.id) : fallbackId,
    packageName: packageName || "Không xác định",
    packageProduct,
    sanPhamRaw,
    variantLabel: buildVariantLabel(packageProduct, sanPhamRaw),
    pctCtv: toNumberOrNull(row?.[VARIANT_PRICING_COLS.pctCtv]),
    pctKhach,
    pctPromo,
    pctStu,
    isActive: parseBoolean(row?.[VARIANT_PRICING_COLS.isActive]),
    basePrice: toNumberOrNull(
      row?.[VARIANT_PRICING_COLS.basePrice] ?? row?.base_price
    ),
    baseSupplyPrice: toNumberOrNull(row?.max_supply_price),
    wholesalePrice,
    retailPrice: pctKhach,
    studentPrice: pctStu,
    promoPrice: pctPromo,
    lastUpdated:
      typeof row?.[VARIANT_PRICING_COLS.updatedAt] === "string"
        ? row[VARIANT_PRICING_COLS.updatedAt]
        : typeof row?.updated_at === "string"
        ? row.updated_at
        : typeof row?.updatedAt === "string"
        ? row.updatedAt
        : typeof row?.update === "string"
        ? row.update
        : null,
  };
};
