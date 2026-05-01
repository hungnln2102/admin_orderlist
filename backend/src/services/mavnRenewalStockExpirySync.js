"use strict";

/**
 * Đơn MAVN gia hạn (renewal.js): đồng bộ `product_stocks.expires_at` với ngày hết hạn mới trên đơn,
 * theo quy tắc ghép slot / information_order giống package-product (tài khoản gốc vs kích hoạt).
 */

const {
  SCHEMA_ORDERS,
  SCHEMA_PRODUCT,
  ORDERS_SCHEMA,
  PRODUCT_SCHEMA,
  tableName,
  getDefinition,
} = require("../config/dbSchema");
const logger = require("../utils/logger");

const ORDER_DEF = getDefinition("ORDER_LIST", ORDERS_SCHEMA);
const VARIANT_DEF = getDefinition("VARIANT", PRODUCT_SCHEMA);
const PKG_DEF = getDefinition("PACKAGE_PRODUCT", PRODUCT_SCHEMA);
const STOCK_DEF = getDefinition("PRODUCT_STOCK", PRODUCT_SCHEMA);

const ORDER_TABLE = tableName(ORDER_DEF.tableName, SCHEMA_ORDERS);
const VARIANT_TABLE = tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT);
const PKG_TABLE = tableName(PKG_DEF.tableName, SCHEMA_PRODUCT);
const STOCK_TABLE = tableName(STOCK_DEF.tableName, SCHEMA_PRODUCT);

const O = ORDER_DEF.columns;
const V = VARIANT_DEF.columns;
const PP = PKG_DEF.columns;
const S = STOCK_DEF.columns;

const toCleanString = (value) => {
  if (value == null) return "";
  return typeof value === "string" ? value.trim() : String(value).trim();
};

const normalizeMatchKey = (value) => {
  const s = toCleanString(value);
  return s ? s.toLowerCase().replace(/\s+/g, "") : "";
};

const buildPackageLinkKeys = (username) => {
  const n = normalizeMatchKey(username);
  return n ? [n] : [];
};

const linkMatches = (packageKeys, linkValue) => {
  if (!linkValue || packageKeys.length === 0) return false;
  return packageKeys.some(
    (pkgKey) =>
      pkgKey === linkValue ||
      pkgKey.includes(linkValue) ||
      linkValue.includes(pkgKey)
  );
};

function orderMatchesStockUsername(matchMode, orderRow, linkUsername) {
  const packageKeys = buildPackageLinkKeys(linkUsername);
  if (packageKeys.length === 0) return false;
  const slot = toCleanString(orderRow[O.slot]);
  const info = toCleanString(orderRow[O.informationOrder]);
  const linkValue =
    matchMode === "slot" ? normalizeMatchKey(slot) : normalizeMatchKey(info);
  return linkMatches(packageKeys, linkValue);
}

async function resolvePackageIdFromOrderProduct(client, idProductRaw) {
  if (idProductRaw == null || idProductRaw === "") return null;
  const str = String(idProductRaw).trim();
  const num = Number(str);
  const isNumericVariant =
    Number.isFinite(num) && num >= 1 && String(num) === str;

  if (isNumericVariant) {
    const r = await client.query(
      `SELECT ${V.productId} FROM ${VARIANT_TABLE} WHERE ${V.id} = $1 LIMIT 1`,
      [num]
    );
    const pid = r.rows[0]?.[V.productId];
    return pid != null ? Number(pid) : null;
  }

  const r2 = await client.query(
    `
      SELECT ${V.productId}
      FROM ${VARIANT_TABLE}
      WHERE LOWER(TRIM(${V.displayName}::text)) = LOWER(TRIM($1::text))
         OR LOWER(TRIM(${V.variantName}::text)) = LOWER(TRIM($1::text))
      LIMIT 1
    `,
    [str]
  );
  const pid2 = r2.rows[0]?.[V.productId];
  return pid2 != null ? Number(pid2) : null;
}

function dateToIsoYmd(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * @param {import("pg").PoolClient} client
 * @param {{ orderCode: string, newExpiryDate: Date }} params
 */
async function syncMavnStockExpiryAfterOrderRenewal(client, { orderCode, newExpiryDate }) {
  const iso = dateToIsoYmd(newExpiryDate);
  const normalizedCode = String(orderCode || "").trim();
  if (!normalizedCode || !iso) {
    return { updated: 0, skipped: true, reason: "missing_order_or_date" };
  }

  const orderRes = await client.query(
    `
      SELECT ${O.idProduct}, ${O.informationOrder}, ${O.slot}
      FROM ${ORDER_TABLE}
      WHERE LOWER(${O.idOrder}::text) = LOWER($1::text)
      LIMIT 1
    `,
    [normalizedCode]
  );
  if (!orderRes.rows.length) {
    return { updated: 0, reason: "order_not_found" };
  }
  const orderRow = orderRes.rows[0];

  const packageId = await resolvePackageIdFromOrderProduct(client, orderRow[O.idProduct]);
  if (!packageId) {
    logger.warn("[MAVN renewal stock sync] Không resolve được package_id (product) từ id_product", {
      orderCode: normalizedCode,
      idProduct: orderRow[O.idProduct],
    });
    return { updated: 0, reason: "no_package_id" };
  }

  const ppRes = await client.query(
    `
      SELECT
        pp.${PP.id} AS pp_id,
        pp.${PP.match} AS match_mode,
        pp.${PP.stockId} AS stock_id,
        pp.${PP.storageId} AS storage_id,
        s.${S.accountUsername} AS stock_username,
        st.${S.accountUsername} AS storage_username
      FROM ${PKG_TABLE} pp
      LEFT JOIN ${STOCK_TABLE} s ON s.${S.id} = pp.${PP.stockId}
      LEFT JOIN ${STOCK_TABLE} st ON st.${S.id} = pp.${PP.storageId}
      WHERE pp.${PP.packageId} = $1
    `,
    [packageId]
  );

  const stockIds = new Set();
  for (const row of ppRes.rows) {
    const mm = row.match_mode === "slot" ? "slot" : "information_order";
    if (mm === "slot") {
      if (
        row.stock_id &&
        orderMatchesStockUsername("slot", orderRow, row.stock_username)
      ) {
        stockIds.add(Number(row.stock_id));
      }
    } else {
      if (
        row.storage_id &&
        orderMatchesStockUsername("information_order", orderRow, row.storage_username)
      ) {
        stockIds.add(Number(row.storage_id));
      }
      if (
        row.stock_id &&
        orderMatchesStockUsername("information_order", orderRow, row.stock_username)
      ) {
        stockIds.add(Number(row.stock_id));
      }
    }
  }

  if (!stockIds.size) {
    logger.info("[MAVN renewal stock sync] Không có dòng kho khớp đơn", {
      orderCode: normalizedCode,
      packageId,
    });
    return { updated: 0, packageId, reason: "no_matching_stock" };
  }

  const ids = Array.from(stockIds).filter((id) => Number.isFinite(id));
  await client.query(
    `
      UPDATE ${STOCK_TABLE}
      SET ${S.expiresAt} = $1::date,
          ${S.updatedAt} = NOW()
      WHERE ${S.id} = ANY($2::bigint[])
    `,
    [iso, ids]
  );

  logger.info("[MAVN renewal stock sync] Đã cập nhật expires_at kho", {
    orderCode: normalizedCode,
    packageId,
    stockIds: ids,
    expiresAt: iso,
  });

  return { updated: ids.length, packageId, stockIds: ids, expiresAt: iso };
}

module.exports = {
  syncMavnStockExpiryAfterOrderRenewal,
};
