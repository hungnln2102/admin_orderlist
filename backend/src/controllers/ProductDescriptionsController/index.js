const path = require("path"); // eslint-disable-line no-unused-vars
require("dotenv").config(); // eslint-disable-line no-unused-vars
console.log(">>> [DEBUG] PUBLIC_BASE_URL:", process.env.PUBLIC_BASE_URL);

const { db } = require("../../db");
const {
  tableName,
  PRODUCT_SCHEMA,
  SCHEMA_PRODUCT,
  getDefinition,
} = require("../../config/dbSchema");
const { quoteIdent } = require("../../utils/sql");
const { normalizeTextInput, trimToLength } = require("../../utils/normalizers");
const fs = require("fs");

const PRODUCT_DESC_DEF = PRODUCT_SCHEMA.PRODUCT_DESC;
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
  productDesc: tableName(PRODUCT_DESC_DEF.TABLE, SCHEMA_PRODUCT),
  product: tableName(PRODUCT_DEF.tableName, SCHEMA_PRODUCT),
  variant: tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT),
};

const IMAGE_DIR = path.join(__dirname, "../../../image");
try {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
} catch {}

const ALLOWED_IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".avif",
]);

const isImageFile = (filename) => {
  const ext = path.extname(filename || "").toLowerCase();
  return ALLOWED_IMAGE_EXTS.has(ext);
};

const findVariantForProductId = async (productId) => {
  const query = `
    SELECT
      ${quoteIdent(variantColNames.id)} AS id,
      ${quoteIdent(variantColNames.displayName)} AS display_name
    FROM ${TABLES.variant}
    WHERE
      LOWER(TRIM(${quoteIdent(variantColNames.displayName)}::text)) = LOWER(TRIM(?))
      OR LOWER(TRIM(regexp_replace(${quoteIdent(variantColNames.displayName)}::text, '--\\d+m$', '', 'i'))) = LOWER(TRIM(?))
    LIMIT 1;
  `;
  const result = await db.raw(query, [productId, productId]);
  return result.rows?.[0] || null;
};

const mapProductDescRow = (req, row = {}) => {
  const rawImage = row.image_url || row[productDescColNames.imageUrl] || null;
  const normalizedImage = normalizeImageUrl(req, rawImage);
  return {
    id: Number(row.id) || Number(row[productDescColNames.id]) || null,
    productId:
      row.product_id || row[productDescColNames.productId] || row.productId || "",
    productName: row.product_name || row.productName || null,
    rules: row.rules || row[productDescColNames.rules] || "",
    rulesHtml: row.rules_html || row.rulesHtml || null,
    description: row.description || row[productDescColNames.description] || "",
    descriptionHtml: row.description_html || row.descriptionHtml || null,
    imageUrl: normalizedImage || rawImage || null,
  };
};
const getForwardedHeader = (req, headerName) => {
  const raw = req.get(headerName);
  if (!raw) return "";
  return String(raw).split(",")[0].trim();
};

const getBaseFromHeader = (req, headerName) => {
  const raw = getForwardedHeader(req, headerName);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
};

const isLocalHostValue = (value) =>
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(value || "");

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const isLocalBaseUrl = (baseUrl) => {
  if (!baseUrl) return false;
  try {
    return isLocalHostValue(new URL(baseUrl).host);
  } catch {
    return false;
  }
};

const pickBaseUrl = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate && !isLocalBaseUrl(candidate)) return candidate;
  }
  return candidates.find(Boolean) || "";
};

const buildImageUrl = (req, filename) => {
  const envBase = normalizeBaseUrl(
    process.env.PUBLIC_BASE_URL || process.env.BASE_PUBLIC_URL
  );

  const originBase = normalizeBaseUrl(
    getBaseFromHeader(req, "origin") || getBaseFromHeader(req, "referer")
  );

  const forwardedProto = getForwardedHeader(req, "x-forwarded-proto");
  const forwardedHost =
    getForwardedHeader(req, "x-forwarded-host") ||
    getForwardedHeader(req, "x-original-host") ||
    getForwardedHeader(req, "x-forwarded-server");
  const forwardedPort = getForwardedHeader(req, "x-forwarded-port");

  const protocol = forwardedProto || req.protocol || "http";
  const forwardedHostValue =
    forwardedHost && forwardedPort && !forwardedHost.includes(":")
      ? `${forwardedHost}:${forwardedPort}`
      : forwardedHost;
  const forwardedBase = forwardedHostValue
    ? normalizeBaseUrl(`${protocol}://${forwardedHostValue}`)
    : "";
  const hostHeader = req.get("host") || "";
  const hostBase = hostHeader
    ? normalizeBaseUrl(`${protocol}://${hostHeader}`)
    : "";

  const base = pickBaseUrl(envBase, originBase, forwardedBase, hostBase);

  console.log("[image-url]", {
    envBase,
    originBase,
    forwardedProto,
    forwardedHost,
    forwardedPort,
    hostHeader,
    pickedBase: base,
  });

  const finalBase = base || normalizeBaseUrl("http://localhost:3001");
  return `${finalBase}/image/${encodeURIComponent(filename)}`;
};

const extractImageFileName = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withoutHash = raw.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0];
  try {
    const url = new URL(withoutQuery);
    return path.basename(url.pathname || "");
  } catch {
    if (withoutQuery.includes("/")) {
      return path.basename(withoutQuery);
    }
    return withoutQuery;
  }
};

const normalizeImageUrl = (req, value) => {
  const raw = String(value || "").trim();
  if (!raw || !req) return raw;

  try {
    const parsed = new URL(raw);
    if (!isLocalHostValue(parsed.host)) {
      return raw;
    }
  } catch {
    // Not an absolute URL, continue normalization.
  }

  const fileName = extractImageFileName(raw);
  if (!fileName || !isImageFile(fileName)) {
    return raw;
  }

  const resolved = buildImageUrl(req, fileName);
  if (resolved && resolved != raw) {
    console.log("[image-url] normalized", { raw, resolved, fileName });
  }
  return resolved || raw;
};

const uploadProductImage = (req, res) => {
  if (!req.file || !req.file.filename) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  return res.json({
    fileName: req.file.filename,
    url: buildImageUrl(req, req.file.filename),
  });
};

const listProductImages = async (req, res) => {
  try {
    const entries = await fs.promises.readdir(IMAGE_DIR, { withFileTypes: true });
    const items = entries
      .filter((entry) => entry.isFile() && isImageFile(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        fileName: name,
        url: buildImageUrl(req, name),
      }));
    res.json({ items, count: items.length });
  } catch (error) {
    console.error(
      "List images failed (GET /api/product-descriptions/images):",
      error
    );
    res.status(500).json({ error: "Failed to list images." });
  }
};

const deleteProductImage = async (req, res) => {
  const rawName = normalizeTextInput(req.params.fileName || "");
  const fileName = path.basename(rawName);
  if (!fileName || fileName !== rawName || !isImageFile(fileName)) {
    return res.status(400).json({ error: "Invalid file name." });
  }
  const targetPath = path.join(IMAGE_DIR, fileName);
  try {
    await fs.promises.unlink(targetPath);
    res.json({ ok: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return res.status(404).json({ error: "File not found." });
    }
    console.error(
      "Delete image failed (DELETE /api/product-descriptions/images):",
      error
    );
    res.status(500).json({ error: "Failed to delete image." });
  }
};

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
      items: (result.rows || []).map((row) => mapProductDescRow(req, row)),
      count: Number(result.rowCount) || (result.rows || []).length || 0,
      total,
      offset,
      limit,
    });
  } catch (error) {
    console.error("Query failed (GET /api/product-descriptions):", error);
    res.status(500).json({ error: "Không thể tải mô tả sản phẩm." });
  }
};

const saveProductDescription = async (req, res) => {
  const { productId, rules, description, imageUrl } = req.body || {};
  const normalizedProductId = normalizeTextInput(productId);
  if (!normalizedProductId) {
    return res.status(400).json({ error: "productId là bắt buộc." });
  }

  const normalizedRules = trimToLength(rules ?? "", 8000) || "";
  const normalizedDescription = trimToLength(description ?? "", 8000) || "";
  const normalizedImage = trimToLength(imageUrl ?? "", 1000);
  const resolvedImageUrl = normalizeImageUrl(req, normalizedImage) || normalizedImage;

  try {
    const variantRow = await findVariantForProductId(normalizedProductId);
    const resolvedProductId = variantRow?.display_name || normalizedProductId;

    const existing = await db.raw(
      `
      SELECT *
      FROM ${TABLES.productDesc}
      WHERE ${quoteIdent(productDescColNames.productId)} = ?
      LIMIT 1;
    `,
      [resolvedProductId]
    );
    let existingRow = existing.rows?.[0] || null;

    if (!existingRow && variantRow && resolvedProductId !== normalizedProductId) {
      const fallback = await db.raw(
        `
        SELECT *
        FROM ${TABLES.productDesc}
        WHERE ${quoteIdent(productDescColNames.productId)} = ?
        LIMIT 1;
      `,
        [normalizedProductId]
      );
      existingRow = fallback.rows?.[0] || null;
    }

    if (!existingRow && !variantRow) {
      return res.status(400).json({ error: "productId không tồn tại trong variant." });
    }

    if (existingRow) {
      const updateSql = `
        UPDATE ${TABLES.productDesc}
        SET ${quoteIdent(productDescColNames.productId)} = ?,
            ${quoteIdent(productDescColNames.rules)} = ?,
            ${quoteIdent(productDescColNames.description)} = ?,
            ${quoteIdent(productDescColNames.imageUrl)} = ?
        WHERE ${quoteIdent(productDescColNames.id)} = ?
        RETURNING *;
      `;
      const updated = await db.raw(updateSql, [
        resolvedProductId,
        normalizedRules,
        normalizedDescription,
        resolvedImageUrl,
        existingRow[productDescColNames.id] || existingRow.id,
      ]);
      return res.json(mapProductDescRow(req, updated.rows[0]));
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
      resolvedProductId,
      normalizedRules,
      normalizedDescription,
      resolvedImageUrl,
    ]);
    res.status(201).json(mapProductDescRow(req, inserted.rows[0]));
  } catch (error) {
    console.error("Save failed (POST /api/product-descriptions):", error);
    res.status(500).json({ error: "Không thể lưu mô tả sản phẩm." });
  }
};

module.exports = {
  listProductDescriptions,
  saveProductDescription,
  uploadProductImage,
  listProductImages,
  deleteProductImage,
};
