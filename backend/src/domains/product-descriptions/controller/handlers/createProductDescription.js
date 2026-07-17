const { db } = require("@/db");
const { quoteIdent } = require("@/utils/sql");
const { normalizeTextInput, trimToLength } = require("@/utils/normalizers");
const logger = require("@/utils/logger");
const {
  TABLES,
  productDescColNames,
  productColNames,
  variantColNames,
} = require("@/domains/product-descriptions/controller/shared/constants");
const {
  findVariantForProductId,
  mapProductDescRow,
} = require("@/domains/product-descriptions/controller/shared/queries");
const { invalidateWebsiteSeoCache } = require("@/domains/product-descriptions/controller/shared/cache");

/**
 * Tạo bản ghi desc_variant. Có thể gắn variant (productId) nếu truyền mã;
 * không truyền thì chỉ INSERT (nối sau).
 */
const createProductDescription = async (req, res) => {
  const { productId, rules, description, shortDesc } = req.body || {};
  const normalizedProductId = normalizeTextInput(productId);

  const normalizedRules = trimToLength(rules ?? "", 8000) || "";
  const normalizedDescription = trimToLength(description ?? "", 8000) || "";
  const normalizedShortDesc = trimToLength(shortDesc ?? "", 2000) || "";

  if (!normalizedProductId) {
    try {
      const insertSql = `
        INSERT INTO ${TABLES.productDesc} (
          ${quoteIdent(productDescColNames.rules)},
          ${quoteIdent(productDescColNames.description)},
          ${quoteIdent(productDescColNames.shortDesc)},
          ${quoteIdent(productDescColNames.updatedAt)}
        ) VALUES (?, ?, ?, now())
        RETURNING *;
      `;
      const inserted = await db.raw(insertSql, [
        normalizedRules,
        normalizedDescription,
        normalizedShortDesc,
      ]);
      const insRow = inserted.rows?.[0];
      if (!insRow) {
        return res.status(500).json({ error: "Không tạo được desc_variant." });
      }
      const newId =
        insRow[productDescColNames.id] ?? insRow.id ?? insRow.desc_variant_id;
      const merged = await db.raw(
        `
        SELECT DISTINCT ON (d.${quoteIdent(productDescColNames.id)})
          v.${quoteIdent(variantColNames.id)} AS variant_id,
          COALESCE(v.${quoteIdent(variantColNames.displayName)}::text, '') AS product_id,
          v.${quoteIdent(variantColNames.variantName)} AS product_name,
          d.${quoteIdent(productDescColNames.id)} AS desc_variant_id,
          d.${quoteIdent(productDescColNames.rules)} AS rules,
          d.${quoteIdent(productDescColNames.description)} AS description,
          v.${quoteIdent(variantColNames.imageUrl)} AS image_url,
          p.${quoteIdent(productColNames.imageUrl)} AS package_image_url,
          d.${quoteIdent(productDescColNames.shortDesc)} AS short_desc
        FROM ${TABLES.productDesc} d
        LEFT JOIN ${TABLES.variant} v
          ON v.${quoteIdent(variantColNames.descVariantId)} = d.${quoteIdent(productDescColNames.id)}
        LEFT JOIN ${TABLES.product} p
          ON p.${quoteIdent(productColNames.id)} = v.${quoteIdent(variantColNames.productId)}
        WHERE d.${quoteIdent(productDescColNames.id)} = ?
        ORDER BY d.${quoteIdent(productDescColNames.id)}, v.${quoteIdent(variantColNames.id)} ASC NULLS LAST
        LIMIT 1
      `,
        [newId]
      );
      const row = merged.rows?.[0] || {
        variant_id: null,
        product_id: "",
        product_name: null,
        desc_variant_id: newId,
        rules: insRow.rules,
        description: insRow.description,
        image_url: null,
        short_desc: insRow.short_desc,
      };
      await invalidateWebsiteSeoCache();
      return res.status(201).json(mapProductDescRow(req, row));
    } catch (error) {
      logger.error("Create standalone desc_variant failed", {
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Không thể tạo desc_variant." });
    }
  }

  let variantIdForMerge = null;

  try {
    await db.transaction(async (trx) => {
      const variantRow = await findVariantForProductId(normalizedProductId, trx);
      if (!variantRow || variantRow.id == null) {
        const err = new Error("productId không tồn tại trong variant.");
        err.statusCode = 400;
        throw err;
      }
      const variantId = Number(variantRow.id);
      variantIdForMerge = variantId;

      const rawLink = variantRow.id_desc;
      if (rawLink != null && rawLink !== "") {
        const linked = Number(rawLink);
        if (Number.isFinite(linked) && linked > 0) {
          const err = new Error(
            "Variant này đã có bản ghi desc_variant. Dùng Sửa hoặc chọn mã variant khác."
          );
          err.statusCode = 409;
          throw err;
        }
      }

      const insertSql = `
        INSERT INTO ${TABLES.productDesc} (
          ${quoteIdent(productDescColNames.rules)},
          ${quoteIdent(productDescColNames.description)},
          ${quoteIdent(productDescColNames.shortDesc)},
          ${quoteIdent(productDescColNames.updatedAt)}
        ) VALUES (?, ?, ?, now())
        RETURNING ${quoteIdent(productDescColNames.id)} AS id;
      `;
      const inserted = await trx.raw(insertSql, [
        normalizedRules,
        normalizedDescription,
        normalizedShortDesc,
      ]);
      const newDescId = inserted.rows?.[0]?.id;
      if (newDescId == null) {
        const err = new Error("Không tạo được desc_variant.");
        err.statusCode = 500;
        throw err;
      }

      await trx.raw(
        `
        UPDATE ${TABLES.variant}
        SET ${quoteIdent(variantColNames.descVariantId)} = ?
        WHERE ${quoteIdent(variantColNames.id)} = ?
      `,
        [newDescId, variantId]
      );
    });

    const merged = await db.raw(
      `
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
      JOIN ${TABLES.productDesc} d
        ON d.${quoteIdent(productDescColNames.id)} = v.${quoteIdent(variantColNames.descVariantId)}
      WHERE v.${quoteIdent(variantColNames.id)} = ?
      LIMIT 1
    `,
      [variantIdForMerge]
    );
    const row = merged.rows?.[0];
    if (!row) {
      return res.status(404).json({ error: "Không đọc lại được dữ liệu sau khi tạo." });
    }
    await invalidateWebsiteSeoCache();
    res.status(201).json(mapProductDescRow(req, row));
  } catch (error) {
    const status = error.statusCode || error.status;
    if (status === 400) {
      return res.status(400).json({ error: error.message || "Yêu cầu không hợp lệ." });
    }
    if (status === 409) {
      return res.status(409).json({ error: error.message || "Variant đã có nội dung." });
    }
    logger.error("Create desc_variant failed (POST /api/product-descriptions/create)", {
      productId: normalizedProductId,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể tạo desc_variant." });
  }
};

module.exports = { createProductDescription };
