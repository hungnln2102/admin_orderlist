const { db } = require("../db");
const { DB_SCHEMA, getDefinition, tableName } = require("../config/dbSchema");
const { quoteIdent } = require("../utils/sql");
const { normalizeTextInput, trimToLength } = require("../utils/normalizers");

const PRODUCT_DESC_DEF = getDefinition("PRODUCT_DESC");
const PRODUCT_PRICE_DEF = getDefinition("PRODUCT_PRICE");
const productDescCols = PRODUCT_DESC_DEF.columns;
const productPriceCols = PRODUCT_PRICE_DEF.columns;

const TABLES = {
  productDesc: tableName(DB_SCHEMA.PRODUCT_DESC.TABLE),
  productPrice: tableName(DB_SCHEMA.PRODUCT_PRICE.TABLE),
};

const mapProductDescRow = (row = {}) => ({
  id: Number(row.id) || Number(row[productDescCols.id]) || null,
  productId:
    row.product_id || row[productDescCols.productId] || row.productId || "",
  productName: row.product_name || row.productName || null,
  rules: row.rules || row[productDescCols.rules] || "",
  rulesHtml: row.rules_html || row.rulesHtml || null,
  description: row.description || row[productDescCols.description] || "",
  descriptionHtml: row.description_html || row.descriptionHtml || null,
  imageUrl: row.image_url || row[productDescCols.imageUrl] || null,
});

const listProductDescriptions = async (req, res) => {
  const search = normalizeTextInput(req.query.search || "");
  const limitParam = Number(req.query.limit);
  const offsetParam = Number(req.query.offset);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

  try {
    const whereFragments = [];
    const values = [];
    if (search) {
      whereFragments.push(
        `(
          LOWER(TRIM(${quoteIdent(productDescCols.productId)}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
          OR LOWER(TRIM(${quoteIdent(productDescCols.description)}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
          OR LOWER(TRIM(${quoteIdent(productDescCols.rules)}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
        )`
      );
      values.push(search, search, search);
    }
    const whereClause = whereFragments.length
      ? `WHERE ${whereFragments.join(" AND ")}`
      : "";

    const q = `
      SELECT
        pd.*,
        pp.${quoteIdent(productPriceCols.packageProduct)} AS product_name
      FROM ${TABLES.productDesc} pd
      LEFT JOIN ${TABLES.productPrice} pp
        ON TRIM(pp.${quoteIdent(productPriceCols.product)}::text) = TRIM(pd.${quoteIdent(productDescCols.productId)}::text)
      ${whereClause}
      ORDER BY pd.${quoteIdent(productDescCols.id)} ASC
      OFFSET ?
      LIMIT ?;
    `;
    const result = await db.raw(q, [...values, offset, limit]);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM ${TABLES.productDesc}
      ${whereClause};
    `;
    const countResult = await db.raw(countQuery, values);
    const total = Number(countResult.rows?.[0]?.total) || 0;

    res.json({
      items: (result.rows || []).map(mapProductDescRow),
      count: Number(result.rowCount) || (result.rows || []).length || 0,
      total,
      offset,
      limit,
    });
  } catch (error) {
    console.error("Query failed (GET /api/product-descriptions):", error);
    res.status(500).json({ error: "Unable to load product descriptions." });
  }
};

const saveProductDescription = async (req, res) => {
  const { productId, rules, description, imageUrl } = req.body || {};
  const normalizedProductId = normalizeTextInput(productId);
  if (!normalizedProductId) {
    return res.status(400).json({ error: "productId is required." });
  }

  const normalizedRules = trimToLength(rules ?? "", 8000) || "";
  const normalizedDescription = trimToLength(description ?? "", 8000) || "";
  const normalizedImage = trimToLength(imageUrl ?? "", 1000);

  try {
    const existing = await db.raw(
      `
      SELECT *
      FROM ${TABLES.productDesc}
      WHERE ${quoteIdent(productDescCols.productId)} = ?
      LIMIT 1;
    `,
      [normalizedProductId]
    );

    if (existing.rows && existing.rows.length) {
      const updateSql = `
        UPDATE ${TABLES.productDesc}
        SET ${quoteIdent(productDescCols.rules)} = ?,
            ${quoteIdent(productDescCols.description)} = ?,
            ${quoteIdent(productDescCols.imageUrl)} = ?
        WHERE ${quoteIdent(productDescCols.productId)} = ?
        RETURNING *;
      `;
      const updated = await db.raw(updateSql, [
        normalizedRules,
        normalizedDescription,
        normalizedImage,
        normalizedProductId,
      ]);
      return res.json(mapProductDescRow(updated.rows[0]));
    }

    const insertSql = `
      INSERT INTO ${TABLES.productDesc} (
        ${quoteIdent(productDescCols.productId)},
        ${quoteIdent(productDescCols.rules)},
        ${quoteIdent(productDescCols.description)},
        ${quoteIdent(productDescCols.imageUrl)}
      )
      VALUES (?, ?, ?, ?)
      RETURNING *;
    `;
    const inserted = await db.raw(insertSql, [
      normalizedProductId,
      normalizedRules,
      normalizedDescription,
      normalizedImage,
    ]);
    res.status(201).json(mapProductDescRow(inserted.rows[0]));
  } catch (error) {
    console.error("Save failed (POST /api/product-descriptions):", error);
    res.status(500).json({ error: "Unable to save product description." });
  }
};

module.exports = {
  listProductDescriptions,
  saveProductDescription,
};
