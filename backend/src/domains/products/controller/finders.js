const { db } = require("../../../db");
const { QUOTED_COLS } = require("./constants");
const { quoteIdent } = require("../../../utils/sql");
const { normalizeTextInput, toNullableNumber } = require("../../../utils/normalizers");
const { getNextSupplyId } = require("../../../services/idService");
const {
  findSupplierIdByNormalizedName,
} = require("../../supplies/services/supplierLookupService");
const { upsertSupplierCostPrice } = require("../../supplies/services/supplierCostService");
const { TABLES, variantCols, productCols } = require("./constants");

const findProductIdByName = async (nameRaw) => {
  const normalizedInput = normalizeTextInput(nameRaw);
  const productName = normalizedInput || "";
  if (!productName) return { variantId: null, productId: null };

  const variantSql = `
    SELECT v.id AS variant_id
    FROM ${TABLES.variant} v
    LEFT JOIN ${TABLES.product} p
      ON p.${quoteIdent(productCols.id)} = v.${quoteIdent(variantCols.productId)}
    WHERE v.${quoteIdent(variantCols.displayName)} = ?
       OR v.${quoteIdent(variantCols.variantName)} = ?
       OR p.${quoteIdent(productCols.packageName)} = ?
    LIMIT 1;
  `;
  const variantRes = await db.raw(variantSql, [productName, productName, productName]);
  const variantRow = variantRes.rows?.[0];
  if (variantRow && Number.isFinite(Number(variantRow.variant_id))) {
    return { variantId: Number(variantRow.variant_id), productId: null };
  }

  // Fallback fuzzy match on display_name
  const fuzzySql = `
    SELECT v.id AS variant_id
    FROM ${TABLES.variant} v
    WHERE LOWER(TRIM(v.${quoteIdent(variantCols.displayName)}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
    ORDER BY v.id ASC
    LIMIT 1;
  `;
  const fuzzy = await db.raw(fuzzySql, [productName.toLowerCase()]);
  if (fuzzy.rows && fuzzy.rows[0] && Number.isFinite(Number(fuzzy.rows[0].variant_id))) {
    return { variantId: Number(fuzzy.rows[0].variant_id), productId: null };
  }

  return { variantId: null, productId: null };
};

const findSupplyIdByName = async (nameRaw) => {
  const normalized = normalizeTextInput(nameRaw);
  return findSupplierIdByNormalizedName(normalized);
};

const ensureSupplyRecord = async (nameRaw, numberBank, binBank) => {
  const normalizedName = normalizeTextInput(nameRaw);
  if (!normalizedName) return null;
  const existing = await findSupplyIdByName(normalizedName);
  if (existing) return existing;

  const nextId = await getNextSupplyId();
  const baseValues = [
    nextId,
    normalizedName,
    normalizeTextInput(numberBank) || null,
    normalizeTextInput(binBank) || null,
  ];
  const placeholders = baseValues.map(() => "?");
  try {
    const insertSql = `
      INSERT INTO ${TABLES.supply} (
        ${QUOTED_COLS.supplier.id},
        ${QUOTED_COLS.supplier.supplierName},
        ${QUOTED_COLS.supplier.numberBank},
        ${QUOTED_COLS.supplier.binBank},
        ${QUOTED_COLS.supplier.activeSupply}
      ) VALUES (${placeholders.join(", ")}, ?)
      RETURNING ${QUOTED_COLS.supplier.id} AS id;
    `;
    const inserted = await db.raw(insertSql, [...baseValues, true]);
    const newId =
      inserted.rows && inserted.rows[0] && inserted.rows[0].id !== undefined
        ? Number(inserted.rows[0].id)
        : nextId;
    return Number.isFinite(newId) ? newId : nextId;
  } catch (_err) {
    const insertSql = `
      INSERT INTO ${TABLES.supply} (
        ${QUOTED_COLS.supplier.id},
        ${QUOTED_COLS.supplier.supplierName},
        ${QUOTED_COLS.supplier.numberBank},
        ${QUOTED_COLS.supplier.binBank}
      ) VALUES (${placeholders.join(", ")})
      RETURNING ${QUOTED_COLS.supplier.id} AS id;
    `;
    const inserted = await db.raw(insertSql, baseValues);
    const newId =
      inserted.rows && inserted.rows[0] && inserted.rows[0].id !== undefined
        ? Number(inserted.rows[0].id)
        : nextId;
    return Number.isFinite(newId) ? newId : nextId;
  }
};

const upsertSupplyPrice = async (identifiers, supplierId, price, trx = db) => {
  const idObj =
    typeof identifiers === "object"
      ? identifiers || {}
      : { productId: identifiers };
  const variantId = Number.isFinite(Number(idObj.variantId))
    ? Number(idObj.variantId)
    : Number.isFinite(Number(idObj.productId))
    ? Number(idObj.productId)
    : null;
  const parsedSupplierId = Number(supplierId);
  const normalizedPrice = toNullableNumber(price);

  if (!Number.isFinite(variantId) || !Number.isFinite(parsedSupplierId)) {
    throw new Error("Invalid product or source id.");
  }

  const client = trx || db;

  const result = await upsertSupplierCostPrice(
    { variantId, supplierId: parsedSupplierId, price: normalizedPrice },
    client
  );

  return {
    id: result.id,
    productId: result.variantId,
    supplierId: result.supplierId,
    price: result.price,
  };
};

module.exports = {
  findProductIdByName,
  findSupplyIdByName,
  ensureSupplyRecord,
  upsertSupplyPrice,
};
