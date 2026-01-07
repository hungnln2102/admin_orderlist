const { db } = require("../../db");
const { QUOTED_COLS } = require("./constants");
const { quoteIdent } = require("../../utils/sql");
const { normalizeTextInput, toNullableNumber } = require("../../utils/normalizers");
const { getNextSupplyId } = require("../../services/idService");
const { TABLES, variantCols, supplyPriceCols, supplyCols, productCols } = require("./constants");

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
  const normalized = normalizeTextInput(nameRaw).toLowerCase();
  if (!normalized) return null;
  const sql = `
    SELECT ${QUOTED_COLS.supplier.id} AS id
    FROM ${TABLES.supply}
    WHERE LOWER(TRIM(${QUOTED_COLS.supplier.supplierName}::text)) = ?
    LIMIT 1;
  `;
  const result = await db.raw(sql, [normalized]);
  if (result.rows && result.rows[0] && result.rows[0].id !== undefined) {
    const parsed = Number(result.rows[0].id);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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
  } catch (err) {
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

  const existing = await client.raw(
    `
    SELECT id
    FROM ${TABLES.supplyPrice}
    WHERE ${quoteIdent(supplyPriceCols.productId)} = ?
      AND ${quoteIdent(supplyPriceCols.supplierId)} = ?
    LIMIT 1;
  `,
    [variantId, parsedSupplierId]
  );

  if (existing.rows && existing.rows.length) {
    await client.raw(
      `
      UPDATE ${TABLES.supplyPrice}
      SET ${quoteIdent(supplyPriceCols.price)} = ?
      WHERE ${quoteIdent(supplyPriceCols.productId)} = ?
        AND ${quoteIdent(supplyPriceCols.supplierId)} = ?;
    `,
      [normalizedPrice, variantId, parsedSupplierId]
    );
    return {
      id: existing.rows[0].id,
      productId: variantId,
      supplierId: parsedSupplierId,
      price: normalizedPrice,
    };
  }

  const inserted = await client.raw(
    `
    INSERT INTO ${TABLES.supplyPrice} (
      ${quoteIdent(supplyPriceCols.productId)},
      ${quoteIdent(supplyPriceCols.supplierId)},
      ${quoteIdent(supplyPriceCols.price)}
    )
    VALUES (?, ?, ?)
    RETURNING id;
  `,
    [variantId, parsedSupplierId, normalizedPrice]
  );
  const newId =
    inserted.rows && inserted.rows[0] && inserted.rows[0].id !== undefined
      ? inserted.rows[0].id
      : null;
  return {
    id: newId,
    productId: variantId,
    supplierId: parsedSupplierId,
    price: normalizedPrice,
  };
};

module.exports = {
  findProductIdByName,
  findSupplyIdByName,
  ensureSupplyRecord,
  upsertSupplyPrice,
};
