const { db } = require("../../../../db");
const { quoteIdent } = require("../../../../utils/sql");
const {
  TABLES,
  productDescColNames,
  productColNames,
  variantColNames,
} = require("./constants");
const { normalizeImageUrl } = require("./urlHelpers");

/**
 * Tìm variant theo `productId` (so khớp display_name có/không hậu tố `--Nm`).
 * Trả về `{ id, id_desc, display_name, variant_name, package_name }` hoặc `null`.
 */
const findVariantForProductId = async (productId, trx = null) => {
  const query = `
    SELECT
      v.${quoteIdent(variantColNames.id)} AS id,
      v.${quoteIdent(variantColNames.descVariantId)} AS id_desc,
      v.${quoteIdent(variantColNames.displayName)} AS display_name,
      v.${quoteIdent(variantColNames.variantName)} AS variant_name,
      p.${quoteIdent(productColNames.packageName)} AS package_name
    FROM ${TABLES.variant} v
    LEFT JOIN ${TABLES.product} p
      ON p.${quoteIdent(productColNames.id)} = v.${quoteIdent(variantColNames.productId)}
    WHERE
      LOWER(TRIM(v.${quoteIdent(variantColNames.displayName)}::text)) = LOWER(TRIM(?))
      OR LOWER(TRIM(regexp_replace(v.${quoteIdent(variantColNames.displayName)}::text, '--\\d+m$', '', 'i'))) = LOWER(TRIM(?))
    LIMIT 1;
  `;
  const runner = trx || db;
  const result = await runner.raw(query, [productId, productId]);
  return result.rows?.[0] || null;
};

/**
 * Map row JOIN từ `product_desc + variant + product` → payload UI.
 * Chuẩn hóa image URL theo request hiện tại để FE không hard-code base URL.
 */
const mapProductDescRow = (req, row = {}) => {
  const rawVariantImage = row.image_url ?? null;
  const normalizedVariantImage = normalizeImageUrl(req, rawVariantImage);
  const rawPackageImage = row.package_image_url ?? null;
  const normalizedPackageImage = normalizeImageUrl(req, rawPackageImage);
  const variantIdRaw = row.variant_id;
  const variantIdParsed =
    variantIdRaw != null && variantIdRaw !== "" ? Number(variantIdRaw) : NaN;
  const variantId = Number.isFinite(variantIdParsed) ? variantIdParsed : null;
  const rawDescId = row.desc_variant_id;
  let descVariantId = null;
  if (rawDescId != null && rawDescId !== "") {
    const descVarParsed = Number(rawDescId);
    if (Number.isFinite(descVarParsed) && descVarParsed > 0) {
      descVariantId = descVarParsed;
    }
  }
  return {
    id: variantId != null ? variantId : 0,
    descVariantId,
    variantId,
    productId: row.product_id ?? row.productId ?? "",
    productName: row.product_name ?? row.productName ?? null,
    rules: row.rules || row[productDescColNames.rules] || "",
    rulesHtml: row.rules_html || row.rulesHtml || null,
    description: row.description || row[productDescColNames.description] || "",
    descriptionHtml: row.description_html || row.descriptionHtml || null,
    imageUrl: normalizedVariantImage || rawVariantImage || null,
    packageImageUrl: normalizedPackageImage || rawPackageImage || null,
    shortDesc: row.short_desc ?? row[productDescColNames.shortDesc] ?? null,
  };
};

module.exports = { findVariantForProductId, mapProductDescRow };
