const { db } = require("../../../db");
const { quoteIdent } = require("../../../utils/sql");
const { normalizeTextInput } = require("../../../utils/normalizers");
const { TABLES, variantCols, productCols } = require("../controller/constants");

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

module.exports = {
  findProductIdByName,
};
