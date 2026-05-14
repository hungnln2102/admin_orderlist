const { db } = require("../../../db");
const { quoteIdent } = require("../../../utils/sql");
const { normalizeTextInput, trimToLength } = require("../../../utils/normalizers");
const logger = require("../../../utils/logger");
const {
  TABLES,
  productDescColNames,
  productColNames,
  variantColNames,
} = require("../shared/constants");
const { normalizeImageUrl } = require("../shared/urlHelpers");
const {
  findVariantForProductId,
  mapProductDescRow,
} = require("../shared/queries");
const { invalidateWebsiteSeoCache } = require("../shared/cache");

const saveProductDescription = async (req, res) => {
  const { productId, rules, description, imageUrl, shortDesc, descVariantId } =
    req.body || {};
  const normalizedProductId = normalizeTextInput(productId);

  const normalizedRules = trimToLength(rules ?? "", 8000) || "";
  const normalizedDescription = trimToLength(description ?? "", 8000) || "";
  const normalizedShortDesc = trimToLength(shortDesc ?? "", 2000) || "";
  const normalizedImage = trimToLength(imageUrl ?? "", 1000);
  const resolvedImageUrl = normalizeImageUrl(req, normalizedImage) || normalizedImage;

  if (!normalizedProductId) {
    const targetRaw =
      descVariantId !== undefined && descVariantId !== null && descVariantId !== ""
        ? Number(descVariantId)
        : NaN;
    if (!Number.isFinite(targetRaw) || targetRaw <= 0) {
      return res.status(400).json({
        error: "Thiếu productId hoặc descVariantId hợp lệ để lưu.",
      });
    }
    try {
      const updated = await db.raw(
        `
        UPDATE ${TABLES.productDesc} d
        SET
          ${quoteIdent(productDescColNames.rules)} = ?,
          ${quoteIdent(productDescColNames.description)} = ?,
          ${quoteIdent(productDescColNames.shortDesc)} = ?,
          ${quoteIdent(productDescColNames.updatedAt)} = now()
        WHERE d.${quoteIdent(productDescColNames.id)} = ?
        RETURNING *;
      `,
        [normalizedRules, normalizedDescription, normalizedShortDesc, targetRaw]
      );
      const ins = updated.rows?.[0];
      if (!ins) {
        return res.status(404).json({ error: "Không tìm thấy desc_variant." });
      }
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
        [targetRaw]
      );
      const row =
        merged.rows?.[0] || {
          variant_id: null,
          product_id: "",
          product_name: null,
          desc_variant_id:
            ins[productDescColNames.id] ?? ins.id ?? ins.desc_variant_id ?? targetRaw,
          rules: ins[productDescColNames.rules] ?? ins.rules,
          description: ins[productDescColNames.description] ?? ins.description,
          image_url: null,
          short_desc: ins[productDescColNames.shortDesc] ?? ins.short_desc,
        };
      await invalidateWebsiteSeoCache();
      return res.json(mapProductDescRow(req, row));
    } catch (error) {
      logger.error("Save orphan desc_variant failed (POST /api/product-descriptions)", {
        descVariantId: targetRaw,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Không thể lưu mô tả sản phẩm." });
    }
  }

  try {
    const variantRow = await findVariantForProductId(normalizedProductId);
    if (!variantRow || variantRow.id == null) {
      return res.status(400).json({ error: "productId không tồn tại trong variant." });
    }
    const variantId = Number(variantRow.id);

    const reassignIdRaw =
      descVariantId !== undefined && descVariantId !== null && descVariantId !== ""
        ? Number(descVariantId)
        : null;
    if (reassignIdRaw !== null) {
      if (!Number.isFinite(reassignIdRaw) || reassignIdRaw <= 0) {
        return res.status(400).json({ error: "descVariantId không hợp lệ." });
      }
      const exists = await db.raw(
        `SELECT 1 FROM ${TABLES.productDesc} WHERE ${quoteIdent(productDescColNames.id)} = ? LIMIT 1`,
        [reassignIdRaw]
      );
      if (!exists.rows?.length) {
        return res.status(400).json({ error: "desc_variant không tồn tại." });
      }
      await db.raw(
        `
        UPDATE ${TABLES.variant}
        SET ${quoteIdent(variantColNames.descVariantId)} = ?
        WHERE ${quoteIdent(variantColNames.id)} = ?
      `,
        [reassignIdRaw, variantId]
      );
    } else {
      const updateSql = `
        UPDATE ${TABLES.productDesc} d
        SET
          ${quoteIdent(productDescColNames.rules)} = ?,
          ${quoteIdent(productDescColNames.description)} = ?,
          ${quoteIdent(productDescColNames.shortDesc)} = ?,
          ${quoteIdent(productDescColNames.updatedAt)} = now()
        FROM ${TABLES.variant} v
        WHERE v.${quoteIdent(variantColNames.id)} = ?
          AND d.${quoteIdent(productDescColNames.id)} = v.${quoteIdent(variantColNames.descVariantId)}
        RETURNING d.*;
      `;
      const updated = await db.raw(updateSql, [
        normalizedRules,
        normalizedDescription,
        normalizedShortDesc,
        variantId,
      ]);
      if (!updated.rows?.[0]) {
        return res.status(404).json({ error: "Không cập nhật được desc_variant." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "imageUrl")) {
      await db.raw(
        `
        UPDATE ${TABLES.variant}
        SET ${quoteIdent(variantColNames.imageUrl)} = ?
        WHERE ${quoteIdent(variantColNames.id)} = ?
      `,
        [resolvedImageUrl || null, variantId]
      );
    }

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
      [variantId]
    );
    const row = merged.rows?.[0];
    if (!row) {
      return res.status(404).json({ error: "Variant không tồn tại." });
    }
    await invalidateWebsiteSeoCache();
    res.json(mapProductDescRow(req, row));
  } catch (error) {
    logger.error("Save failed (POST /api/product-descriptions)", { productId: normalizedProductId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể lưu mô tả sản phẩm." });
  }
};

module.exports = { saveProductDescription };
