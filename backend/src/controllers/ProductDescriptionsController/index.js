const { db } = require("../../db");
const { DB_SCHEMA, tableName, PRODUCT_SCHEMA, SCHEMA_PRODUCT, getDefinition } = require("../../config/dbSchema");
const { quoteIdent } = require("../../utils/sql");
const { normalizeTextInput, trimToLength } = require("../../utils/normalizers");

const PRODUCT_DESC_DEF = DB_SCHEMA.PRODUCT_DESC;
const PRODUCT_DEF = getDefinition("PRODUCT", PRODUCT_SCHEMA);
const VARIANT_DEF = getDefinition("VARIANT", PRODUCT_SCHEMA);
const productDescCols = PRODUCT_DESC_DEF.COLS;
const productCols = PRODUCT_DEF.columns;
const variantCols = VARIANT_DEF.columns;

// Normalize column names for easier reuse
const productDescColNames = {
  id: productDescCols.ID,
  productId: productDescCols.PRODUCT_ID,
  rules: productDescCols.RULES,
  description: productDescCols.DESCRIPTION,
  imageUrl: productDescCols.IMAGE_URL,
};
const productColNames = {
  id: productCols.ID || productCols.id,
  packageName: productCols.PACKAGE_NAME || productCols.packageName,
};
const variantColNames = {
  id: variantCols.ID || variantCols.id,
  displayName: variantCols.DISPLAY_NAME || variantCols.displayName,
  variantName: variantCols.VARIANT_NAME || variantCols.variantName,
};

const TABLES = {
  productDesc: tableName(DB_SCHEMA.PRODUCT_DESC.TABLE),
  product: tableName(PRODUCT_DEF.tableName, SCHEMA_PRODUCT),
  variant: tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT),
};

const mapProductDescRow = (row = {}) => ({
  id: Number(row.id) || Number(row[productDescColNames.id]) || null,
  productId:
    row.product_id || row[productDescColNames.productId] || row.productId || "",
  productName: row.product_name || row.productName || null,
  rules: row.rules || row[productDescColNames.rules] || "",
  rulesHtml: row.rules_html || row.rulesHtml || null,
  description: row.description || row[productDescColNames.description] || "",
  descriptionHtml: row.description_html || row.descriptionHtml || null,
  imageUrl: row.image_url || row[productDescColNames.imageUrl] || null,
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
          LOWER(TRIM(${quoteIdent(productDescColNames.productId)}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
          OR LOWER(TRIM(${quoteIdent(productDescColNames.description)}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
          OR LOWER(TRIM(${quoteIdent(productDescColNames.rules)}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
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
        v.${quoteIdent(variantColNames.variantName)} AS product_name
      FROM ${TABLES.productDesc} pd
      LEFT JOIN ${TABLES.variant} v
        ON TRIM(v.${quoteIdent(variantColNames.displayName)}::text) = TRIM(pd.${quoteIdent(productDescColNames.productId)}::text)
      ${whereClause}
      ORDER BY pd.${quoteIdent(productDescColNames.id)} ASC
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
    res.status(500).json({ error: "Khong the tai mo ta san pham." });
  }
};

const saveProductDescription = async (req, res) => {
  const { productId, rules, description, imageUrl } = req.body || {};
  const normalizedProductId = normalizeTextInput(productId);
  if (!normalizedProductId) {
    return res.status(400).json({ error: "productId la bat buoc." });
  }

  // Ensure productId exists in variant.display_name
  const variantRes = await db.raw(
    `SELECT ${quoteIdent(variantColNames.id)} AS id FROM ${TABLES.variant}
     WHERE ${quoteIdent(variantColNames.displayName)} = ?
     LIMIT 1`,
    [normalizedProductId]
  );
  if (!variantRes.rows?.length) {
    return res.status(400).json({ error: "productId khong ton tai trong variant." });
  }

  const normalizedRules = trimToLength(rules ?? "", 8000) || "";
  const normalizedDescription = trimToLength(description ?? "", 8000) || "";
  const normalizedImage = trimToLength(imageUrl ?? "", 1000);

  try {
    const existing = await db.raw(
      `
      SELECT *
      FROM ${TABLES.productDesc}
      WHERE ${quoteIdent(productDescColNames.productId)} = ?
      LIMIT 1;
    `,
      [normalizedProductId]
    );

    if (existing.rows && existing.rows.length) {
      const updateSql = `
        UPDATE ${TABLES.productDesc}
        SET ${quoteIdent(productDescColNames.rules)} = ?,
            ${quoteIdent(productDescColNames.description)} = ?,
            ${quoteIdent(productDescColNames.imageUrl)} = ?
        WHERE ${quoteIdent(productDescColNames.productId)} = ?
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
        ${quoteIdent(productDescColNames.productId)},
        ${quoteIdent(productDescColNames.rules)},
        ${quoteIdent(productDescColNames.description)},
        ${quoteIdent(productDescColNames.imageUrl)}
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
    res.status(500).json({ error: "Khong the luu mo ta san pham." });
  }
};

module.exports = {
  listProductDescriptions,
  saveProductDescription,
};
