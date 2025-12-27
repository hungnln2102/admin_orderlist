const { toNullableNumber } = require("../../utils/normalizers");
const { productCols, supplyPriceCols, supplyCols } = require("./constants");

const mapProductPriceRow = (row = {}) => {
  const id =
    Number(row.id) ||
    Number(row[productCols.id]) ||
    Number(row.product_id) ||
    Number(row.productId) ||
    null;
  const sanPham =
    row.san_pham ||
    row[productCols.product] ||
    row.id_product ||
    row.product ||
    "";
  const pctCtv = toNullableNumber(row.pct_ctv ?? row[productCols.pctCtv]);
  const pctKhach = toNullableNumber(
    row.pct_khach ?? row[productCols.pctKhach]
  );
  const pctPromo = toNullableNumber(row.pct_promo ?? row[productCols.pctPromo]);
  const isActiveRaw = row.is_active ?? row[productCols.isActive];
  const isActive =
    typeof isActiveRaw === "boolean"
      ? isActiveRaw
      : String(isActiveRaw || "")
          .trim()
          .toLowerCase()
          .startsWith("t") ||
        String(isActiveRaw || "").trim() === "1";

  return {
    id,
    id_product: sanPham,
    san_pham: sanPham,
    package_product:
      row.package_product ?? row[productCols.packageProduct] ?? null,
    package: row.package ?? row[productCols.package] ?? null,
    pct_ctv: pctCtv,
    pct_khach: pctKhach,
    pct_promo: pctPromo,
    is_active: isActive,
    update: row.update ?? row[productCols.updateDate] ?? null,
    max_supply_price: toNullableNumber(row.max_supply_price),
  };
};

const mapSupplyPriceRow = (row = {}) => ({
  source_id:
    Number(row.source_id) ||
    Number(row[supplyPriceCols.sourceId]) ||
    Number(row[supplyCols.id]) ||
    null,
  price: toNullableNumber(row.price ?? row[supplyPriceCols.price]) ?? null,
  source_name:
    row.source_name ||
    row[supplyCols.sourceName] ||
    row.source ||
    row.name ||
    "",
  last_order_date: row.last_order_date ?? null,
});

module.exports = {
  mapProductPriceRow,
  mapSupplyPriceRow,
};
