const { db } = require("../../db");
const { QUOTED_COLS } = require("./constants");
const { quoteIdent } = require("../../utils/sql");
const { normalizeTextInput, toNullableNumber } = require("../../utils/normalizers");
const { getNextSupplyId } = require("../../services/idService");
const { TABLES, productCols, supplyPriceCols, supplyCols } = require("./constants");

const findProductIdByName = async (nameRaw) => {
  const productName = normalizeTextInput(nameRaw).toLowerCase();
  if (!productName) return null;

  const exactSql = `
    SELECT id
    FROM ${TABLES.productPrice}
    WHERE LOWER(TRIM(${quoteIdent(productCols.product)}::text)) = ?
       OR LOWER(TRIM(${quoteIdent(productCols.packageProduct)}::text)) = ?
       OR LOWER(TRIM(${quoteIdent(productCols.package)}::text)) = ?
    ORDER BY id ASC
    LIMIT 1;
  `;
  const exact = await db.raw(exactSql, [productName, productName, productName]);
  if (exact.rows && exact.rows[0] && Number.isFinite(Number(exact.rows[0].id))) {
    return Number(exact.rows[0].id);
  }

  const fuzzySql = `
    SELECT id
    FROM ${TABLES.productPrice}
    WHERE LOWER(TRIM(?)) LIKE '%' || LOWER(TRIM(${quoteIdent(
      productCols.product
    )}::text)) || '%'
       OR LOWER(TRIM(?)) LIKE '%' || LOWER(TRIM(${quoteIdent(
         productCols.packageProduct
       )}::text)) || '%'
       OR LOWER(TRIM(${quoteIdent(
         productCols.product
       )}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
    ORDER BY id ASC
    LIMIT 1;
  `;
  const fuzzy = await db.raw(fuzzySql, [productName, productName, productName]);
  if (fuzzy.rows && fuzzy.rows[0] && Number.isFinite(Number(fuzzy.rows[0].id))) {
    return Number(fuzzy.rows[0].id);
  }
  return null;
};

const findSupplyIdByName = async (nameRaw) => {
  const normalized = normalizeTextInput(nameRaw).toLowerCase();
  if (!normalized) return null;
  const sql = `
    SELECT ${QUOTED_COLS.supply.id} AS id
    FROM ${TABLES.supply}
    WHERE LOWER(TRIM(${QUOTED_COLS.supply.sourceName}::text)) = ?
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
        ${QUOTED_COLS.supply.id},
        ${QUOTED_COLS.supply.sourceName},
        ${QUOTED_COLS.supply.numberBank},
        ${QUOTED_COLS.supply.binBank},
        ${QUOTED_COLS.supply.activeSupply}
      ) VALUES (${placeholders.join(", ")}, ?)
      RETURNING ${QUOTED_COLS.supply.id} AS id;
    `;
    const inserted = await db.raw(insertSql, [...baseValues, true]);
    const newId =
      inserted.rows && inserted.rows[0] && inserted.rows[0].id !== undefined
        ? Number(inserted.rows[0].id)
        : nextId;
    return Number.isFinite(newId) ? newId : nextId;
  } catch (err) {
    // Fallback for schemas without active_supply
    const insertSql = `
      INSERT INTO ${TABLES.supply} (
        ${QUOTED_COLS.supply.id},
        ${QUOTED_COLS.supply.sourceName},
        ${QUOTED_COLS.supply.numberBank},
        ${QUOTED_COLS.supply.binBank}
      ) VALUES (${placeholders.join(", ")})
      RETURNING ${QUOTED_COLS.supply.id} AS id;
    `;
    const inserted = await db.raw(insertSql, baseValues);
    const newId =
      inserted.rows && inserted.rows[0] && inserted.rows[0].id !== undefined
        ? Number(inserted.rows[0].id)
        : nextId;
    return Number.isFinite(newId) ? newId : nextId;
  }
};

const upsertSupplyPrice = async (productId, sourceId, price) => {
  const parsedProductId = Number(productId);
  const parsedSourceId = Number(sourceId);
  const normalizedPrice = toNullableNumber(price);
  if (!Number.isFinite(parsedProductId) || !Number.isFinite(parsedSourceId)) {
    throw new Error("Invalid product or source id.");
  }

  const existing = await db.raw(
    `
    SELECT id FROM ${TABLES.supplyPrice}
    WHERE ${quoteIdent(supplyPriceCols.productId)} = ?
      AND ${quoteIdent(supplyPriceCols.sourceId)} = ?
    LIMIT 1;
  `,
    [parsedProductId, parsedSourceId]
  );

  if (existing.rows && existing.rows.length) {
    await db.raw(
      `
      UPDATE ${TABLES.supplyPrice}
      SET ${quoteIdent(supplyPriceCols.price)} = ?
      WHERE ${quoteIdent(supplyPriceCols.productId)} = ?
        AND ${quoteIdent(supplyPriceCols.sourceId)} = ?;
    `,
      [normalizedPrice, parsedProductId, parsedSourceId]
    );
    return {
      id: existing.rows[0].id,
      productId: parsedProductId,
      sourceId: parsedSourceId,
      price: normalizedPrice,
    };
  }

  const insertPlaceholders = ["?", "?", "?"];
  const inserted = await db.raw(
    `
    INSERT INTO ${TABLES.supplyPrice} (
      ${quoteIdent(supplyPriceCols.productId)},
      ${quoteIdent(supplyPriceCols.sourceId)},
      ${quoteIdent(supplyPriceCols.price)}
    )
    VALUES (${insertPlaceholders.join(", ")})
    RETURNING id;
  `,
    [parsedProductId, parsedSourceId, normalizedPrice]
  );
  const newId =
    inserted.rows && inserted.rows[0] && inserted.rows[0].id !== undefined
      ? inserted.rows[0].id
      : null;
  return {
    id: newId,
    productId: parsedProductId,
    sourceId: parsedSourceId,
    price: normalizedPrice,
  };
};

module.exports = {
  findProductIdByName,
  findSupplyIdByName,
  ensureSupplyRecord,
  upsertSupplyPrice,
};
