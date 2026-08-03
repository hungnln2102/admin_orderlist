"use strict";

/**
 * Đơn MAVN gia hạn (renewal.js): đồng bộ `product_stocks.expires_at` với ngày hết hạn mới trên đơn.
 *
 * Quy tắc khớp kho (nghiệp vụ nhập hàng): `order_list.information_order` luôn = `account_username`
 * của tài khoản trong kho → chỉ đối chiếu hai giá trị này trên các dòng kho gắn với gói (`package_product`
 * cùng `package_id` với sản phẩm của đơn).
 */

const {
  SCHEMA_ORDERS,
  SCHEMA_PRODUCT,
  ORDERS_SCHEMA,
  PRODUCT_SCHEMA,
  tableName,
  getDefinition,
} = require("@/config/dbSchema");
const logger = require("@/utils/logger");

const ORDER_DEF = getDefinition("ORDER_LIST", ORDERS_SCHEMA);
const VARIANT_DEF = getDefinition("VARIANT", PRODUCT_SCHEMA);

const ORDER_TABLE = tableName(ORDER_DEF.tableName, SCHEMA_ORDERS);
const VARIANT_TABLE = tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT);

const O = ORDER_DEF.columns;
const V = VARIANT_DEF.columns;

const toCleanString = (value) => {
  if (value == null) return "";
  return typeof value === "string" ? value.trim() : String(value).trim();
};

async function executeSql(clientOrKnex, sql, params = []) {
  if (typeof clientOrKnex.query === 'function') {
    return clientOrKnex.query(sql, params);
  } else if (typeof clientOrKnex.raw === 'function') {
    const knexSql = sql.replace(/\$\d+/g, '?');
    return clientOrKnex.raw(knexSql, params);
  } else {
    throw new Error("Invalid database connection client passed");
  }
}

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

/** `information_order` trên đơn ↔ `account_username` trên kho (cùng kiểu chuẩn hóa như package-product). */
function informationOrderMatchesAccountUsername(informationOrder, accountUsername) {
  const infoValue = normalizeMatchKey(informationOrder);
  const packageKeys = buildPackageLinkKeys(accountUsername);
  return linkMatches(packageKeys, infoValue);
}

async function resolvePackageIdFromOrderProduct(client, idProductRaw) {
  if (idProductRaw == null || idProductRaw === "") return null;
  const str = String(idProductRaw).trim();
  const num = Number(str);
  const isNumericVariant =
    Number.isFinite(num) && num >= 1 && String(num) === str;

  if (isNumericVariant) {
    const r = await executeSql(client,
      `SELECT ${V.productId} FROM ${VARIANT_TABLE} WHERE ${V.id} = $1 LIMIT 1`,
      [num]
    );
    const pid = r.rows[0]?.[V.productId];
    return pid != null ? Number(pid) : null;
  }

  const r2 = await executeSql(client,
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
      SELECT ${O.idProduct}, ${O.informationOrder}
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
  const informationOrder = orderRow[O.informationOrder];

  if (!toCleanString(informationOrder)) {
    logger.warn("[MAVN renewal stock sync] Đơn thiếu information_order, không đối chiếu kho", {
      orderCode: normalizedCode,
    });
    return { updated: 0, reason: "missing_information_order" };
  }

  const packageId = await resolvePackageIdFromOrderProduct(client, orderRow[O.idProduct]);
  if (!packageId) {
    logger.warn("[MAVN renewal stock sync] Không resolve được package_id (product) từ id_product", {
      orderCode: normalizedCode,
      idProduct: orderRow[O.idProduct],
    });
    return { updated: 0, reason: "no_package_id" };
  }

  const stockRes = await client.query(
    `
      SELECT
        ss.id AS service_id,
        s.id AS stock_id,
        s.account_username AS stock_username
      FROM warehouse.stock_services ss
      INNER JOIN warehouse.product_stocks s ON s.id = ss.stock_id
      INNER JOIN warehouse.product_names pn ON ss.name_id = pn.id
      WHERE pn.product_id = $1
    `,
    [packageId]
  );

  const serviceIdsToUpdate = new Set();
  const stockIdsMatched = new Set();

  for (const row of stockRes.rows) {
    if (
      row.stock_username &&
      informationOrderMatchesAccountUsername(informationOrder, row.stock_username)
    ) {
      serviceIdsToUpdate.add(Number(row.service_id));
      stockIdsMatched.add(Number(row.stock_id));
    }
  }

  if (!serviceIdsToUpdate.size) {
    logger.warn("[MAVN renewal stock sync] Không có dòng kho khớp information_order = account_username", {
      orderCode: normalizedCode,
      packageId,
      idProduct: orderRow[O.idProduct],
      infoSample: toCleanString(informationOrder).slice(0, 80),
    });
    return { updated: 0, packageId, reason: "no_matching_stock" };
  }

  const ids = Array.from(serviceIdsToUpdate).filter((id) => Number.isFinite(id));
  await client.query(
    `
      UPDATE warehouse.stock_services
      SET expires_at = $1::date,
          updated_at = NOW()
      WHERE id = ANY($2::bigint[])
    `,
    [iso, ids]
  );

  logger.info("[MAVN renewal stock sync] Đã cập nhật expires_at trong stock_services", {
    orderCode: normalizedCode,
    packageId,
    serviceIds: ids,
    expiresAt: iso,
  });

  return { updated: ids.length, packageId, stockIds: Array.from(stockIdsMatched), serviceIds: ids, expiresAt: iso };
}



/**
 * Đồng bộ ngày hết hạn của stock services khớp với packageId và accountUsername.
 * Dựa trên ngày hết hạn của đơn MAVN mới nhất còn hoạt động.
 *
 * @param {import("pg").PoolClient|object} clientOrKnex
 * @param {number} packageId
 * @param {string} accountUsername
 */
async function syncStockExpiryForAccountAndPackage(clientOrKnex, packageId, accountUsername) {
  if (!packageId || !toCleanString(accountUsername)) {
    return { updated: 0, skipped: true, reason: "missing_package_or_account" };
  }

  // 1. Tìm tất cả các stock_services liên kết với packageId và accountUsername
  const stockRes = await executeSql(clientOrKnex,
    `
      SELECT
        ss.id AS service_id,
        s.id AS stock_id,
        s.account_username AS stock_username
      FROM warehouse.stock_services ss
      INNER JOIN warehouse.product_stocks s ON s.id = ss.stock_id
      INNER JOIN warehouse.product_names pn ON ss.name_id = pn.id
      WHERE pn.product_id = $1
    `,
    [packageId]
  );

  const serviceIdsToUpdate = new Set();
  const stockIdsMatched = new Set();

  for (const row of stockRes.rows) {
    if (
      row.stock_username &&
      informationOrderMatchesAccountUsername(accountUsername, row.stock_username)
    ) {
      serviceIdsToUpdate.add(Number(row.service_id));
      stockIdsMatched.add(Number(row.stock_id));
    }
  }

  if (!serviceIdsToUpdate.size) {
    logger.info("[MAVN stock sync] Không tìm thấy dòng kho khớp packageId và accountUsername", {
      packageId,
      accountUsername,
    });
    return { updated: 0, packageId, reason: "no_matching_stock" };
  }

  // 2. Tìm tất cả variant_id tương ứng với packageId
  const variantRes = await executeSql(clientOrKnex,
    `SELECT id FROM product.variant WHERE product_id = $1`,
    [packageId]
  );
  const variantIds = variantRes.rows.map(r => Number(r.id)).filter(id => Number.isFinite(id));

  let latestExpiryStr = null;
  if (variantIds.length > 0) {
    // 3. Tìm tất cả đơn MAVN active khớp với variantIds
    const orderRes = await executeSql(clientOrKnex,
      `
        SELECT id_order, id_product, TO_CHAR(expired_at, 'YYYY-MM-DD') AS expired_at_str, information_order, status
        FROM orders.order_list
        WHERE id_product = ANY($1::bigint[])
          AND id_order LIKE 'MAVN%'
          AND status IN ('Chưa Thanh Toán', 'Đang Xử Lý', 'Đã Thanh Toán', 'Cần Gia Hạn')
          AND canceled_at IS NULL
      `,
      [variantIds]
    );

    const activeOrders = [];
    for (const order of orderRes.rows) {
      if (
        order.information_order &&
        informationOrderMatchesAccountUsername(order.information_order, accountUsername)
      ) {
        activeOrders.push(order);
      }
    }

    // 4. Tìm ngày hết hạn mới nhất
    for (const order of activeOrders) {
      if (order.expired_at_str) {
        if (!latestExpiryStr || order.expired_at_str > latestExpiryStr) {
          latestExpiryStr = order.expired_at_str;
        }
      }
    }
  }

  const iso = latestExpiryStr || null;
  const ids = Array.from(serviceIdsToUpdate).filter((id) => Number.isFinite(id));

  // 5. Cập nhật expires_at cho stock_services
  await executeSql(clientOrKnex,
    `
      UPDATE warehouse.stock_services
      SET expires_at = $1::date,
          updated_at = NOW()
      WHERE id = ANY($2::bigint[])
    `,
    [iso, ids]
  );

  logger.info("[MAVN stock sync] Đã cập nhật ngày hết hạn kho dựa trên đơn nhập hàng", {
    packageId,
    accountUsername,
    serviceIds: ids,
    expiresAt: iso,
  });

  return { updated: ids.length, packageId, stockIds: Array.from(stockIdsMatched), serviceIds: ids, expiresAt: iso };
}

module.exports = {
  syncMavnStockExpiryAfterOrderRenewal,
  syncStockExpiryForAccountAndPackage,
  resolvePackageIdFromOrderProduct,
};
