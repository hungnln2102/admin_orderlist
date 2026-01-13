const { toNullableNumber } = require("../../utils/normalizers");
const {
  variantCols,
  priceConfigCols,
  productSchemaCols,
  supplyPriceCols,
  supplyCols,
  categoryCols,
} = require("./constants");

const parseCategories = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const mapProductPriceRow = (row = {}) => {
  const id =
    Number(row.id) ||
    Number(row[variantCols.id]) ||
    Number(row.product_id) ||
    Number(row.productId) ||
    null;
  const sanPham =
    row.san_pham ||
    row[variantCols.displayName] ||
    row.id_product ||
    row.product ||
    "";
  const pctCtv = toNullableNumber(row.pct_ctv ?? row[priceConfigCols.pctCtv]);
  const pctKhach = toNullableNumber(
    row.pct_khach ?? row[priceConfigCols.pctKhach]
  );
  const pctPromo = toNullableNumber(row.pct_promo ?? row[priceConfigCols.pctPromo]);
  const isActiveRaw = row.is_active ?? row[variantCols.isActive];
  const isActive =
    typeof isActiveRaw === "boolean"
      ? isActiveRaw
      : String(isActiveRaw || "")
          .trim()
          .toLowerCase()
          .startsWith("t") ||
        String(isActiveRaw || "").trim() === "1";

  const categories = parseCategories(row.categories);
  const categoryFallback =
    row.category ?? row[categoryCols.name] ?? null;

  return {
    id,
    id_product: sanPham,
    san_pham: sanPham,
    package_product:
      row.package_product ?? row[variantCols.variantName] ?? null,
    package: row.package ?? row[productSchemaCols.packageName] ?? null,
    category: categoryFallback,
    categories,
    pct_ctv: pctCtv,
    pct_khach: pctKhach,
    pct_promo: pctPromo,
    is_active: isActive,
    update: row.update ?? row[priceConfigCols.updatedAt] ?? null,
    max_supply_price: toNullableNumber(row.max_supply_price),
  };
};

const mapSupplyPriceRow = (row = {}) => ({
  source_id:
    Number(row.source_id) ||
    Number(row[supplyPriceCols.supplierId]) ||
    Number(row[supplyCols.id]) ||
    null,
  price: toNullableNumber(row.price ?? row[supplyPriceCols.price]) ?? null,
  source_name:
    row.source_name ||
    row[supplyCols.supplierName] ||
    row.source ||
    row.name ||
    "",
  last_order_date: row.last_order_date ?? null,
});

module.exports = {
  mapProductPriceRow,
  mapSupplyPriceRow,
};
