const { db } = require("../../../db");
const { quoteIdent } = require("../../../utils/sql");
const { normalizeTextInput } = require("../../../utils/normalizers");
const logger = require("../../../utils/logger");
const {
  TABLES,
  productDescColNames,
  productColNames,
  variantColNames,
} = require("../shared/constants");
const { mapProductDescRow } = require("../shared/queries");

const listProductDescriptions = async (req, res) => {
  const search = normalizeTextInput(req.query.search || "");
  const limitParam = Number(req.query.limit);
  const offsetParam = Number(req.query.offset);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 2000) : 500;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;
  /** Tab nội dung: một dòng / bản ghi desc_variant (LEFT JOIN variant tùy chọn). */
  const scopeDescVariant =
    String(req.query.scope || "").toLowerCase() === "desc_variant";

  try {
    if (scopeDescVariant) {
      const descIdCol = quoteIdent(productDescColNames.id);
      const whereFragments = [];
      const values = [];
      if (search) {
        whereFragments.push(
          `(
            LOWER(TRIM(COALESCE(d.${quoteIdent(productDescColNames.description)}, '')::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
            OR LOWER(TRIM(COALESCE(d.${quoteIdent(productDescColNames.rules)}, '')::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
            OR LOWER(TRIM(COALESCE(d.${quoteIdent(productDescColNames.shortDesc)}, '')::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
            OR EXISTS (
              SELECT 1 FROM ${TABLES.variant} sv
              WHERE sv.${quoteIdent(variantColNames.descVariantId)} = d.${descIdCol}
              AND (
                LOWER(TRIM(sv.${quoteIdent(variantColNames.displayName)}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
                OR LOWER(TRIM(sv.${quoteIdent(variantColNames.variantName)}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
              )
            )
          )`
        );
        values.push(search, search, search, search, search);
      }
      const whereClause = whereFragments.length
        ? `WHERE ${whereFragments.join(" AND ")}`
        : "";

      const listSql = `
        SELECT DISTINCT ON (d.${descIdCol})
          v.${quoteIdent(variantColNames.id)} AS variant_id,
          COALESCE(v.${quoteIdent(variantColNames.displayName)}::text, '') AS product_id,
          v.${quoteIdent(variantColNames.variantName)} AS product_name,
          d.${descIdCol} AS desc_variant_id,
          d.${quoteIdent(productDescColNames.rules)} AS rules,
          d.${quoteIdent(productDescColNames.description)} AS description,
          v.${quoteIdent(variantColNames.imageUrl)} AS image_url,
          p.${quoteIdent(productColNames.imageUrl)} AS package_image_url,
          d.${quoteIdent(productDescColNames.shortDesc)} AS short_desc
        FROM ${TABLES.productDesc} d
        LEFT JOIN ${TABLES.variant} v
          ON v.${quoteIdent(variantColNames.descVariantId)} = d.${descIdCol}
        LEFT JOIN ${TABLES.product} p
          ON p.${quoteIdent(productColNames.id)} = v.${quoteIdent(variantColNames.productId)}
        ${whereClause}
        ORDER BY d.${descIdCol}, v.${quoteIdent(variantColNames.id)} ASC NULLS LAST
        OFFSET ?
        LIMIT ?
      `;
      const result = await db.raw(listSql, [...values, offset, limit]);

      const countSql = `
        SELECT COUNT(*)::bigint AS total
        FROM ${TABLES.productDesc} d
        ${whereClause}
      `;
      const countResult = await db.raw(countSql, values);
      const total = Number(countResult.rows?.[0]?.total) || 0;

      res.json({
        items: (result.rows || []).map((row) => mapProductDescRow(req, row)),
        count: Number(result.rowCount) || (result.rows || []).length || 0,
        total,
        offset,
        limit,
      });
      return;
    }

    const whereFragments = [];
    const values = [];
    if (search) {
      whereFragments.push(
        `(
          LOWER(TRIM(v.${quoteIdent(variantColNames.displayName)}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
          OR LOWER(TRIM(v.${quoteIdent(variantColNames.variantName)}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
          OR LOWER(TRIM(COALESCE(d.${quoteIdent(productDescColNames.description)}, '')::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
          OR LOWER(TRIM(COALESCE(d.${quoteIdent(productDescColNames.rules)}, '')::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
          OR LOWER(TRIM(COALESCE(d.${quoteIdent(productDescColNames.shortDesc)}, '')::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
        )`
      );
      values.push(search, search, search, search, search);
    }
    const whereClause = whereFragments.length
      ? `WHERE ${whereFragments.join(" AND ")}`
      : "";

    const descJoinSql = scopeDescVariant
      ? `INNER JOIN ${TABLES.productDesc} d
        ON d.${quoteIdent(productDescColNames.id)} = v.${quoteIdent(variantColNames.descVariantId)}`
      : `LEFT JOIN ${TABLES.productDesc} d
        ON d.${quoteIdent(productDescColNames.id)} = v.${quoteIdent(variantColNames.descVariantId)}`;

    const q = `
      SELECT
        v.${quoteIdent(variantColNames.id)} AS variant_id,
        v.${quoteIdent(variantColNames.displayName)} AS product_id,
        v.${quoteIdent(variantColNames.variantName)} AS product_name,
        d.${quoteIdent(productDescColNames.id)} AS desc_variant_id,
        d.${quoteIdent(productDescColNames.rules)} AS rules,
        d.${quoteIdent(productDescColNames.description)} AS description,
        v.${quoteIdent(variantColNames.imageUrl)} AS image_url,
        p.${quoteIdent(productColNames.imageUrl)} AS package_image_url,
        d.${quoteIdent(productDescColNames.shortDesc)} AS short_desc
      FROM ${TABLES.variant} v
      LEFT JOIN ${TABLES.product} p
        ON p.${quoteIdent(productColNames.id)} = v.${quoteIdent(variantColNames.productId)}
      ${descJoinSql}
      ${whereClause}
      ORDER BY v.${quoteIdent(variantColNames.id)} ASC
      OFFSET ?
      LIMIT ?;
    `;
    const result = await db.raw(q, [...values, offset, limit]);

    let countQuery = db(`${TABLES.variant} as v`).leftJoin(
      `${TABLES.product} as p`,
      `p.${productColNames.id}`,
      `v.${variantColNames.productId}`
    );
    if (scopeDescVariant) {
      countQuery = countQuery.innerJoin(
        `${TABLES.productDesc} as d`,
        `d.${productDescColNames.id}`,
        `v.${variantColNames.descVariantId}`
      );
    } else {
      countQuery = countQuery.leftJoin(
        `${TABLES.productDesc} as d`,
        `d.${productDescColNames.id}`,
        `v.${variantColNames.descVariantId}`
      );
    }
    if (search) {
      const searchLower = search.toLowerCase();
      const vDisp = variantColNames.displayName;
      const vName = variantColNames.variantName;
      countQuery = countQuery.where(function () {
        this.whereRaw(`LOWER(TRIM(v.${vDisp}::text)) LIKE ?`, [`%${searchLower}%`])
          .orWhereRaw(`LOWER(TRIM(v.${vName}::text)) LIKE ?`, [`%${searchLower}%`])
          .orWhereRaw(
            `LOWER(TRIM(COALESCE(d.${productDescColNames.description}, '')::text)) LIKE ?`,
            [`%${searchLower}%`]
          )
          .orWhereRaw(
            `LOWER(TRIM(COALESCE(d.${productDescColNames.rules}, '')::text)) LIKE ?`,
            [`%${searchLower}%`]
          )
          .orWhereRaw(
            `LOWER(TRIM(COALESCE(d.${productDescColNames.shortDesc}, '')::text)) LIKE ?`,
            [`%${searchLower}%`]
          );
      });
    }
    const countResult = await countQuery.count("* as total").first();
    const total = Number(countResult?.total) || 0;

    res.json({
      items: (result.rows || []).map((row) => mapProductDescRow(req, row)),
      count: Number(result.rowCount) || (result.rows || []).length || 0,
      total,
      offset,
      limit,
    });
  } catch (error) {
    logger.error("Query failed (GET /api/product-descriptions)", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải mô tả sản phẩm." });
  }
};

module.exports = { listProductDescriptions };
