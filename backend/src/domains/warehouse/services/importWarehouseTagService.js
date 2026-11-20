const { db } = require("@/db");
const { TABLES, COLS } = require("@/db/tables");

const { VARIANT, PRODUCT, PRODUCT_NAMES, ACCOUNT_SLOTS } = COLS;

async function listImportWarehouseTags(variantId, connection = db) {
  if (!Number.isSafeInteger(variantId) || variantId <= 0) return [];
  const variant = await connection(TABLES.VARIANT).where(VARIANT.ID, variantId).first();
  if (!variant) return [];

  const productId = variant[VARIANT.PRODUCT_ID];
  const product = await connection(TABLES.PRODUCT).where(PRODUCT.ID, productId).first();
  const productName = product?.[PRODUCT.PACKAGE_NAME] ||
    variant[VARIANT.VARIANT_NAME] || variant[VARIANT.DISPLAY_NAME];
  const [variants, catalog] = await Promise.all([
    connection(TABLES.VARIANT).where(VARIANT.PRODUCT_ID, productId)
      .where(VARIANT.IS_ACTIVE, true).pluck(VARIANT.VARIANT_NAME),
    connection(TABLES.PRODUCT_NAMES)
      .whereRaw("LOWER(??) = ?", [PRODUCT_NAMES.NAME, String(productName || "").trim().toLowerCase()])
      .first(),
  ]);
  const slotTags = catalog
    ? await connection(TABLES.ACCOUNT_SLOTS)
      .where(ACCOUNT_SLOTS.NAME_ID, catalog[PRODUCT_NAMES.ID]).distinct(ACCOUNT_SLOTS.VARIANT_TAG)
      .pluck(ACCOUNT_SLOTS.VARIANT_TAG)
    : [];
  return [...new Set([...variants, ...slotTags, catalog?.[PRODUCT_NAMES.CATEGORY]]
    .map((tag) => String(tag || "").trim()).filter(Boolean))].sort();
}

module.exports = { listImportWarehouseTags };
