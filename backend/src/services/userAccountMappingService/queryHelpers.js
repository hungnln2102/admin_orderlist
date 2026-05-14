const {
  db,
  STATUS,
  ORDER_TABLE,
  ORDER_COLS,
  PRODUCT_SYSTEM_TABLE,
  PRODUCT_SYSTEM_COLS,
  ADOBE_SYSTEM_CODE,
  ACTIVE_STATUSES,
} = require("./shared");

async function getRenewAdobeVariantIds() {
  const variants = await db(PRODUCT_SYSTEM_TABLE)
    .where(PRODUCT_SYSTEM_COLS.SYSTEM_CODE, ADOBE_SYSTEM_CODE)
    .select(PRODUCT_SYSTEM_COLS.VARIANT_ID);
  return variants.map((v) => v[PRODUCT_SYSTEM_COLS.VARIANT_ID]);
}

async function findLatestRenewAdobeOrderByEmail(email, variantIds) {
  if (!email || !Array.isArray(variantIds) || variantIds.length === 0) return null;
  return db(ORDER_TABLE)
    .whereIn(ORDER_COLS.ID_PRODUCT, variantIds)
    .whereNot(ORDER_COLS.STATUS, STATUS.EXPIRED)
    .whereRaw(`LOWER(TRIM(${ORDER_COLS.INFORMATION_ORDER})) = ?`, [email])
    .orderBy(ORDER_COLS.ORDER_DATE, "desc")
    .first();
}

async function listActiveRenewAdobeOrdersByVariants(variantIds) {
  if (!Array.isArray(variantIds) || variantIds.length === 0) return [];
  return db(ORDER_TABLE)
    .whereIn(ORDER_COLS.ID_PRODUCT, variantIds)
    .whereIn(ORDER_COLS.STATUS, ACTIVE_STATUSES)
    .whereNotNull(ORDER_COLS.INFORMATION_ORDER)
    .select(ORDER_COLS.ID_ORDER, ORDER_COLS.INFORMATION_ORDER, ORDER_COLS.STATUS, ORDER_COLS.ID_PRODUCT);
}

module.exports = {
  getRenewAdobeVariantIds,
  findLatestRenewAdobeOrderByEmail,
  listActiveRenewAdobeOrdersByVariants,
};
