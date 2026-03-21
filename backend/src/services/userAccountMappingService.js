/**
 * userAccountMappingService.js
 * Quản lý bảng system_automation.user_account_mapping.
 * Mỗi row: user_email ↔ id_order + adobe_account_id (nullable).
 * Khi đơn hết hạn hoặc user bị xóa → DELETE row (không soft-delete).
 */

const logger = require("../utils/logger");
const { db } = require("../db");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  SCHEMA_ORDERS,
  ORDERS_SCHEMA,
  tableName,
} = require("../config/dbSchema");
const { STATUS } = require("../utils/statuses");


const TABLE = tableName(RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING.TABLE, SCHEMA_RENEW_ADOBE);
const COLS = RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING.COLS;

// Statuses coi là đơn còn hiệu lực → cần có trong mapping
const ACTIVE_STATUSES = [STATUS.PROCESSING, STATUS.PAID, STATUS.RENEWAL];

// system_code của Adobe
const ADOBE_SYSTEM_CODE = "renew_adobe";

/**
 * Đồng bộ đơn hàng từ order_list vào user_account_mapping.
 * - Lọc đơn có id_product thuộc product_system với system_code = 'renew_adobe'.
 * - Chỉ xét đơn có status còn hiệu lực.
 * - INSERT những đơn chưa có mapping (adobe_account_id = null, chờ reassign).
 * - Xóa mapping của những đơn đã hết hạn/hủy.
 * @returns {{ inserted: number, removed: number }}
 */
async function syncOrdersToMapping() {
  const PS_TABLE = tableName(RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.TABLE, SCHEMA_RENEW_ADOBE);
  const PS_COLS = RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.COLS;
  const O_TABLE = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
  const O_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;

  // Bước 1: Lấy variant_id thuộc renew_adobe
  const variants = await db(PS_TABLE)
    .where(PS_COLS.SYSTEM_CODE, ADOBE_SYSTEM_CODE)
    .select(PS_COLS.VARIANT_ID);
  const variantIds = variants.map((v) => v[PS_COLS.VARIANT_ID]);

  if (variantIds.length === 0) {
    logger.info("[Mapping] Không có variant_id nào cho system_code=%s", ADOBE_SYSTEM_CODE);
    return { inserted: 0, removed: 0 };
  }

  // Bước 2: Lấy tất cả đơn còn hiệu lực thuộc variant_id này
  const activeOrders = await db(O_TABLE)
    .whereIn(O_COLS.ID_PRODUCT, variantIds)
    .whereIn(O_COLS.STATUS, ACTIVE_STATUSES)
    .whereNotNull(O_COLS.INFORMATION_ORDER)
    .select(O_COLS.ID_ORDER, O_COLS.INFORMATION_ORDER, O_COLS.STATUS, O_COLS.ID_PRODUCT);

  // Bước 3: Lấy tất cả id_order hiện có trong mapping
  const existingMappings = await db(TABLE).select(COLS.ORDER_ID);
  const existingOrderIds = new Set(existingMappings.map((r) => r[COLS.ORDER_ID]));

  // Bước 4: INSERT những đơn chưa có mapping
  const toInsert = activeOrders.filter((o) => !existingOrderIds.has(o[O_COLS.ID_ORDER]));
  const now = new Date();
  let inserted = 0;
  for (const order of toInsert) {
    const email = (order[O_COLS.INFORMATION_ORDER] || "").toLowerCase().trim();
    if (!email) continue;
    await db(TABLE)
      .insert({
        [COLS.USER_EMAIL]: email,
        [COLS.ORDER_ID]: order[O_COLS.ID_ORDER],
        [COLS.ADOBE_ACCOUNT_ID]: null,  // chờ được reassign
        [COLS.ASSIGNED_AT]: now,
        [COLS.UPDATED_AT]: now,
      })
      .onConflict([COLS.USER_EMAIL, COLS.ORDER_ID])
      .ignore();
    inserted++;
  }

  // Bước 5: Xóa mapping của đơn không còn trong active list nữa
  const activeOrderIds = activeOrders.map((o) => o[O_COLS.ID_ORDER]);
  let removed = 0;
  if (existingOrderIds.size > 0) {
    const toRemove = [...existingOrderIds].filter((id) => !activeOrderIds.includes(id));
    if (toRemove.length > 0) {
      removed = await db(TABLE).whereIn(COLS.ORDER_ID, toRemove).delete();
    }
  }

  logger.info("[Mapping] Sync xong: inserted=%d, removed=%d, total_active_orders=%d",
    inserted, removed, activeOrders.length);
  return { inserted, removed };
}


/**
 * Ghi nhận user được add vào Adobe account từ một đơn hàng.
 * Nếu đã tồn tại (cùng user_email + id_order) thì update adobe_account_id + updated_at.
 * @param {string|string[]} userEmails
 * @param {string} idOrder            - order code từ order_list.id_order
 * @param {number|null} adobeAccountId - ID trong accounts_admin (nullable)
 */
async function recordUsersAssigned(userEmails, idOrder, adobeAccountId = null) {
  const emails = Array.isArray(userEmails) ? userEmails : [userEmails];
  const validEmails = emails.map((e) => (e || "").toString().trim().toLowerCase()).filter(Boolean);
  if (validEmails.length === 0 || !idOrder) return;

  const orderId = idOrder.toString().trim();
  const now = new Date();

  for (const email of validEmails) {
    await db(TABLE)
      .insert({
        [COLS.USER_EMAIL]: email,
        [COLS.ORDER_ID]: orderId,
        [COLS.ADOBE_ACCOUNT_ID]: adobeAccountId || null,
        [COLS.ASSIGNED_AT]: now,
        [COLS.UPDATED_AT]: now,
      })
      .onConflict([COLS.USER_EMAIL, COLS.ORDER_ID])
      .merge({
        [COLS.ADOBE_ACCOUNT_ID]: adobeAccountId || null,
        [COLS.UPDATED_AT]: now,
      });
  }

  logger.info("[Mapping] Ghi nhận %d user | order=%s | adobeAccount=%s",
    validEmails.length, orderId, adobeAccountId ?? "null");
}

/**
 * Xóa mapping theo adobe_account_id (khi account hết hạn).
 * Trả về danh sách { user_email, id_order } đã xóa để reassign.
 * @param {number} adobeAccountId
 * @returns {{ user_email: string, id_order: string }[]}
 */
async function removeMappingsForAccount(adobeAccountId) {
  if (!adobeAccountId) return [];

  const rows = await db(TABLE)
    .where(COLS.ADOBE_ACCOUNT_ID, adobeAccountId)
    .select(COLS.USER_EMAIL, COLS.ORDER_ID);

  if (rows.length === 0) {
    logger.info("[Mapping] Account %s không có mapping nào.", adobeAccountId);
    return [];
  }

  await db(TABLE).where(COLS.ADOBE_ACCOUNT_ID, adobeAccountId).delete();

  logger.info("[Mapping] Đã xóa %d mapping của account %s", rows.length, adobeAccountId);
  return rows.map((r) => ({ user_email: r[COLS.USER_EMAIL], id_order: r[COLS.ORDER_ID] }));
}

/**
 * Xóa mapping theo id_order (khi đơn hàng hết hạn).
 * @param {string|string[]} idOrders
 */
async function removeMappingsByOrders(idOrders) {
  const orders = (Array.isArray(idOrders) ? idOrders : [idOrders]).filter(Boolean);
  if (orders.length === 0) return;

  const deleted = await db(TABLE).whereIn(COLS.ORDER_ID, orders).delete();
  logger.info("[Mapping] Đã xóa %d mapping theo %d đơn hàng hết hạn", deleted, orders.length);
}

/**
 * Lấy mapping theo adobe_account_id.
 * @param {number} adobeAccountId
 * @returns {{ user_email: string, id_order: string }[]}
 */
async function getMappingsForAccount(adobeAccountId) {
  const rows = await db(TABLE)
    .where(COLS.ADOBE_ACCOUNT_ID, adobeAccountId)
    .select(COLS.USER_EMAIL, COLS.ORDER_ID);
  return rows.map((r) => ({ user_email: r[COLS.USER_EMAIL], id_order: r[COLS.ORDER_ID] }));
}

/**
 * Lấy adobe_account_id hiện tại của một user email.
 * @param {string} userEmail
 * @returns {number|null}
 */
async function getAccountForUser(userEmail) {
  const email = (userEmail || "").toString().trim().toLowerCase();
  if (!email) return null;
  const row = await db(TABLE)
    .where(COLS.USER_EMAIL, email)
    .orderBy(COLS.UPDATED_AT, "desc")
    .first();
  return row ? row[COLS.ADOBE_ACCOUNT_ID] : null;
}

/**
 * Khi add user vào Adobe account:
 * - Tìm đơn hàng trong order_list theo email (đơn còn hiệu lực, thuộc renew_adobe).
 * - Nếu đã có mapping cho (user_email, id_order) → bỏ qua.
 * - Nếu chưa có → INSERT vào mapping table.
 * @param {string|string[]} userEmails  - email của user vừa được add
 * @param {number} adobeAccountId       - ID của accounts_admin vừa add user vào
 * @returns {{ recorded: string[], skipped: string[], notFound: string[] }}
 */
async function lookupAndRecordIfNeeded(userEmails, adobeAccountId) {
  const emails = (Array.isArray(userEmails) ? userEmails : [userEmails])
    .map((e) => (e || "").toString().trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return { recorded: [], skipped: [], notFound: [] };

  const PS_TABLE = tableName(RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.TABLE, SCHEMA_RENEW_ADOBE);
  const PS_COLS = RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.COLS;
  const O_TABLE = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
  const O_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;

  // Lấy variant_id thuộc renew_adobe
  const variants = await db(PS_TABLE)
    .where(PS_COLS.SYSTEM_CODE, ADOBE_SYSTEM_CODE)
    .select(PS_COLS.VARIANT_ID);
  const variantIds = variants.map((v) => v[PS_COLS.VARIANT_ID]);

  const recorded = [];
  const skipped = [];
  const notFound = [];
  const now = new Date();

  for (const email of emails) {
    // Tìm đơn hàng renew_adobe của email này (lấy mới nhất, trừ đơn đã Hết Hạn)
    const order = await db(O_TABLE)
      .whereIn(O_COLS.ID_PRODUCT, variantIds)
      .whereNot(O_COLS.STATUS, STATUS.EXPIRED)

      .whereRaw(`LOWER(${O_COLS.INFORMATION_ORDER}) = ?`, [email])
      .orderBy(O_COLS.ORDER_DATE, "desc")
      .first();

    if (!order) {
      logger.warn("[Mapping] Không tìm thấy đơn hàng renew_adobe cho email: %s", email);
      notFound.push(email);
      continue;
    }

    const idOrder = order[O_COLS.ID_ORDER];

    // Kiểm tra xem đã có mapping chưa
    const existing = await db(TABLE)
      .where(COLS.USER_EMAIL, email)
      .where(COLS.ORDER_ID, idOrder)
      .first();

    if (existing) {
      // Đã có → chỉ cập nhật adobe_account_id và updated_at nếu khác
      if (existing[COLS.ADOBE_ACCOUNT_ID] !== adobeAccountId) {
        await db(TABLE)
          .where(COLS.USER_EMAIL, email)
          .where(COLS.ORDER_ID, idOrder)
          .update({
            [COLS.ADOBE_ACCOUNT_ID]: adobeAccountId || null,
            [COLS.UPDATED_AT]: now,
          });
        logger.info("[Mapping] Cập nhật adobe_account_id cho %s (order=%s)", email, idOrder);
      }
      skipped.push(email);
      continue;
    }

    // Chưa có → INSERT mới
    await db(TABLE).insert({
      [COLS.USER_EMAIL]: email,
      [COLS.ORDER_ID]: idOrder,
      [COLS.ADOBE_ACCOUNT_ID]: adobeAccountId || null,
      [COLS.ASSIGNED_AT]: now,
      [COLS.UPDATED_AT]: now,
    });
    logger.info("[Mapping] Ghi mới mapping: %s | order=%s | adobe=%s", email, idOrder, adobeAccountId);
    recorded.push(email);
  }

  return { recorded, skipped, notFound };
}

module.exports = {
  syncOrdersToMapping,
  lookupAndRecordIfNeeded,
  recordUsersAssigned,
  removeMappingsForAccount,
  removeMappingsByOrders,
  getMappingsForAccount,
  getAccountForUser,
};
