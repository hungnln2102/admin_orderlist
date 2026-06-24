const { db } = require("../../../db");
const { SCHEMA_SUPPLIER_COST, tableName } = require("../../../config/dbSchema");
const { SUPPLIER_COST_DEF } = require("../../../config/dbSchema/shared");
const { nextId } = require("../../../services/idService");

const SUPPLIER_COST_TABLE = tableName(
  SUPPLIER_COST_DEF.TABLE,
  SCHEMA_SUPPLIER_COST
);
const SUPPLIER_COST_COLS = SUPPLIER_COST_DEF.COLS;

const getQuery = (trxOrDb) => trxOrDb || db;

const normalizePositiveId = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizePrice = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const findSupplierCostRow = async ({ supplierId, variantId, latest = false }, trxOrDb = null) => {
  const normalizedSupplierId = normalizePositiveId(supplierId);
  const normalizedVariantId = normalizePositiveId(variantId);
  if (!normalizedSupplierId || !normalizedVariantId) return null;

  const query = getQuery(trxOrDb)(SUPPLIER_COST_TABLE)
    .where({
      [SUPPLIER_COST_COLS.SUPPLIER_ID]: normalizedSupplierId,
      [SUPPLIER_COST_COLS.VARIANT_ID]: normalizedVariantId,
    });

  if (latest) {
    query.orderBy(SUPPLIER_COST_COLS.ID, "desc");
  }

  return query.first();
};

const findSupplierCostPrice = async ({ supplierId, variantId, latest = false }, trxOrDb = null) => {
  const row = await findSupplierCostRow({ supplierId, variantId, latest }, trxOrDb);
  if (!row) return null;
  const price = normalizePrice(row[SUPPLIER_COST_COLS.PRICE]);
  return price === null ? null : price;
};

const findMaxSupplierCostPrice = async (variantId, trxOrDb = null) => {
  const normalizedVariantId = normalizePositiveId(variantId);
  if (!normalizedVariantId) return 0;

  const row = await getQuery(trxOrDb)(SUPPLIER_COST_TABLE)
    .max(`${SUPPLIER_COST_COLS.PRICE} as maxPrice`)
    .where(SUPPLIER_COST_COLS.VARIANT_ID, normalizedVariantId)
    .first();
  const price = normalizePrice(row?.maxPrice);
  return price === null ? 0 : price;
};

const upsertSupplierCostPrice = async ({ supplierId, variantId, price }, trxOrDb = null) => {
  const normalizedSupplierId = normalizePositiveId(supplierId);
  const normalizedVariantId = normalizePositiveId(variantId);
  const normalizedPrice = normalizePrice(price);

  if (!normalizedSupplierId || !normalizedVariantId || normalizedPrice === null) {
    throw new Error("Invalid supplier cost payload.");
  }

  const query = getQuery(trxOrDb);
  const existing = await findSupplierCostRow(
    { supplierId: normalizedSupplierId, variantId: normalizedVariantId },
    query
  );

  if (existing) {
    if (Number(existing[SUPPLIER_COST_COLS.PRICE]) !== normalizedPrice) {
      await query(SUPPLIER_COST_TABLE)
        .where(SUPPLIER_COST_COLS.ID, existing[SUPPLIER_COST_COLS.ID])
        .update({ [SUPPLIER_COST_COLS.PRICE]: normalizedPrice });
    }
    return {
      id: existing[SUPPLIER_COST_COLS.ID],
      supplierId: normalizedSupplierId,
      variantId: normalizedVariantId,
      price: normalizedPrice,
    };
  }

  const id = await nextId(SUPPLIER_COST_TABLE, SUPPLIER_COST_COLS.ID, query);
  await query(SUPPLIER_COST_TABLE).insert({
    [SUPPLIER_COST_COLS.ID]: id,
    [SUPPLIER_COST_COLS.SUPPLIER_ID]: normalizedSupplierId,
    [SUPPLIER_COST_COLS.VARIANT_ID]: normalizedVariantId,
    [SUPPLIER_COST_COLS.PRICE]: normalizedPrice,
  });

  return {
    id,
    supplierId: normalizedSupplierId,
    variantId: normalizedVariantId,
    price: normalizedPrice,
  };
};

module.exports = {
  SUPPLIER_COST_COLS,
  SUPPLIER_COST_TABLE,
  findSupplierCostPrice,
  findSupplierCostRow,
  findMaxSupplierCostPrice,
  upsertSupplierCostPrice,
};
