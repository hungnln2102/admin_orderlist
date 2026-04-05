const path = require("path"); // eslint-disable-line no-unused-vars
require("dotenv").config(); // eslint-disable-line no-unused-vars
const logger = require("../../utils/logger");
logger.debug("PUBLIC_BASE_URL", { url: process.env.PUBLIC_BASE_URL });

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

// Bảng product.desc_variant: rules, description, short_desc (ảnh lưu trên variant / product).
const productDescColNames = {
  id: productDescCols.ID,
  rules: productDescCols.RULES,
  description: productDescCols.DESCRIPTION,
  shortDesc: productDescCols.SHORT_DESC,
  updatedAt: productDescCols.UPDATED_AT,
};
const productColNames = {
  id: productCols.ID || productCols.id,
  packageName: productCols.PACKAGE_NAME || productCols.packageName,
  imageUrl: productCols.IMAGE_URL || productCols.imageUrl,
};
const variantColNames = {
  id: variantCols.ID || variantCols.id,
  displayName: variantCols.DISPLAY_NAME || variantCols.displayName,
  variantName: variantCols.VARIANT_NAME || variantCols.variantName,
  descVariantId: variantCols.DESC_VARIANT_ID || variantCols.descVariantId,
  productId: variantCols.PRODUCT_ID || variantCols.productId,
  imageUrl: variantCols.IMAGE_URL || variantCols.imageUrl,
};

const TABLES = {
  productDesc: tableName(PRODUCT_DESC_DEF.TABLE, SCHEMA_PRODUCT),
  product: tableName(PRODUCT_DEF.tableName, SCHEMA_PRODUCT),
  variant: tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT),
};

const WEBSITE_CACHE_INVALIDATE_URL =
  process.env.WEBSITE_CACHE_INVALIDATE_URL ||
  process.env.WEBSITE_API_BASE_URL ||
  "";

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

const buildWebsiteInvalidateUrl = () => {
  const trimmed = normalizeBaseUrl(WEBSITE_CACHE_INVALIDATE_URL);
  if (!trimmed) return "";
  if (/\/cache\/invalidate(?:\?|$)/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/cache/invalidate`;
};

const invalidateWebsiteSeoCache = async () => {
  const url = buildWebsiteInvalidateUrl();
  if (!url || typeof fetch !== "function") return;

  try {
    const response = await fetch(url, { method: "POST" });
    if (!response.ok) {
      logger.warn("Website cache invalidate responded non-OK", {
        url,
        status: response.status,
      });
    }
  } catch (error) {
    logger.warn("Website cache invalidate failed", {
      url,
      error: error?.message || String(error || ""),
    });
  }
};

const mapProductDescRow = (req, row = {}) => {
  const rawImage = row.image_url ?? null;
  const normalizedImage = normalizeImageUrl(req, rawImage);
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
    imageUrl: normalizedImage || rawImage || null,
    shortDesc: row.short_desc ?? row[productDescColNames.shortDesc] ?? null,
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

const pickBaseUrl = (envBase, originBase, forwardedBase, hostBase) => {
  const candidates = [envBase, originBase, forwardedBase, hostBase];
  for (const candidate of candidates) {
    if (candidate && !isLocalBaseUrl(candidate)) return candidate;
  }
  // When everything is localhost, prefer the backend host (serves /image).
  if (hostBase) return hostBase;
  if (forwardedBase) return forwardedBase;
  return originBase || envBase || "";
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

  logger.debug("[image-url]", {
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
    logger.debug("[image-url] normalized", { raw, resolved, fileName });
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
    logger.error(
      "List images failed (GET /api/product-descriptions/images)",
      { error: error.message, stack: error.stack }
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
    logger.error(
      "Delete image failed (DELETE /api/product-descriptions/images)",
      { fileName, error: error.message, stack: error.stack }
    );
    res.status(500).json({ error: "Failed to delete image." });
  }
};

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
          COALESCE(
            v.${quoteIdent(variantColNames.imageUrl)},
            p.${quoteIdent(productColNames.imageUrl)}
          ) AS image_url,
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
        COALESCE(
          v.${quoteIdent(variantColNames.imageUrl)},
          p.${quoteIdent(productColNames.imageUrl)}
        ) AS image_url,
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
      countQuery = countQuery.where(function() {
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

/**
 * Tạo bản ghi desc_variant. Có thể gắn variant (productId) nếu truyền mã; không truyền thì chỉ INSERT (nối sau).
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
          COALESCE(
            v.${quoteIdent(variantColNames.imageUrl)},
            p.${quoteIdent(productColNames.imageUrl)}
          ) AS image_url,
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
        COALESCE(
          v.${quoteIdent(variantColNames.imageUrl)},
          p.${quoteIdent(productColNames.imageUrl)}
        ) AS image_url,
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
          COALESCE(
            v.${quoteIdent(variantColNames.imageUrl)},
            p.${quoteIdent(productColNames.imageUrl)}
          ) AS image_url,
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
        COALESCE(
          v.${quoteIdent(variantColNames.imageUrl)},
          p.${quoteIdent(productColNames.imageUrl)}
        ) AS image_url,
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

module.exports = {
  listProductDescriptions,
  createProductDescription,
  saveProductDescription,
  uploadProductImage,
  listProductImages,
  deleteProductImage,
};
