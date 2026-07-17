const {
  logger,
  db,
  TABLE,
  COLS,
} = require("@/services/userAccountMappingService/shared");

/**
 * Ghi nhận user được add vào Adobe account từ một đơn hàng.
 * Nếu đã tồn tại (cùng user_email + id_order) thì update adobe_account_id + updated_at.
 * @param {string|string[]} userEmails
 * @param {string} idOrder
 * @param {number|null} adobeAccountId
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

  logger.info(
    "[Mapping] Ghi nhận %d user | order=%s | adobeAccount=%s",
    validEmails.length,
    orderId,
    adobeAccountId ?? "null"
  );
}

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

async function removeMappingsByOrders(idOrders) {
  const orders = (Array.isArray(idOrders) ? idOrders : [idOrders]).filter(Boolean);
  if (orders.length === 0) return;

  const deleted = await db(TABLE).whereIn(COLS.ORDER_ID, orders).delete();
  logger.info("[Mapping] Đã xóa %d mapping theo %d đơn hàng hết hạn", deleted, orders.length);
}

async function getMappingsForAccount(adobeAccountId) {
  const rows = await db(TABLE)
    .where(COLS.ADOBE_ACCOUNT_ID, adobeAccountId)
    .select(COLS.USER_EMAIL, COLS.ORDER_ID);
  return rows.map((r) => ({ user_email: r[COLS.USER_EMAIL], id_order: r[COLS.ORDER_ID] }));
}

async function getAccountForUser(userEmail) {
  const email = (userEmail || "").toString().trim().toLowerCase();
  if (!email) return null;
  const row = await db(TABLE)
    .where(COLS.USER_EMAIL, email)
    .orderBy(COLS.UPDATED_AT, "desc")
    .first();
  return row ? row[COLS.ADOBE_ACCOUNT_ID] : null;
}

async function markUsersProductFalseByAccount(userEmails, adobeAccountId) {
  const emails = (Array.isArray(userEmails) ? userEmails : [userEmails])
    .map((e) => (e || "").toString().trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0 || !adobeAccountId) return 0;

  const updated = await db(TABLE)
    .whereIn(db.raw(`LOWER(${COLS.USER_EMAIL})`), emails)
    .andWhere(COLS.ADOBE_ACCOUNT_ID, adobeAccountId)
    .update({
      [COLS.PRODUCT]: false,
      [COLS.UPDATED_AT]: new Date(),
    });

  logger.info(
    "[Mapping] Đánh dấu product=false cho %d email | adobeAccount=%s | updated=%d",
    emails.length,
    adobeAccountId,
    updated
  );
  return updated;
}

async function getAssignedAdobeAccountIdForUserEmail(userEmail) {
  const email = (userEmail || "").toString().trim().toLowerCase();
  if (!email) return null;

  const row = await db(TABLE)
    .whereRaw(`LOWER(TRIM(COALESCE(??, ''))) = ?`, [COLS.USER_EMAIL, email])
    .whereNotNull(COLS.ADOBE_ACCOUNT_ID)
    .orderBy(COLS.UPDATED_AT, "desc")
    .first();

  if (!row) return null;
  const aid = Number(row[COLS.ADOBE_ACCOUNT_ID]);
  return Number.isFinite(aid) && aid > 0 ? aid : null;
}

async function getEmailSetAlreadyAssignedToAdobe(emailsRaw) {
  const emails = [
    ...new Set(
      (Array.isArray(emailsRaw) ? emailsRaw : [])
        .map((e) => (e || "").toString().trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
  if (emails.length === 0) return new Set();

  const placeholders = emails.map(() => "?").join(",");
  const rows = await db(TABLE)
    .whereNotNull(COLS.ADOBE_ACCOUNT_ID)
    .whereRaw(
      `LOWER(TRIM(COALESCE(??, ''))) IN (${placeholders})`,
      [COLS.USER_EMAIL, ...emails]
    )
    .select(db.raw(`LOWER(TRIM(COALESCE(??, ''))) as em`, [COLS.USER_EMAIL]));

  return new Set(rows.map((r) => String(r.em || "").toLowerCase()).filter(Boolean));
}

async function getMappingCountsByAdobeAccountIds(accountIds) {
  const ids = [
    ...new Set(
      (Array.isArray(accountIds) ? accountIds : [])
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  if (ids.length === 0) return new Map();
  const rows = await db(TABLE)
    .whereIn(COLS.ADOBE_ACCOUNT_ID, ids)
    .groupBy(COLS.ADOBE_ACCOUNT_ID)
    .select(COLS.ADOBE_ACCOUNT_ID)
    .count(`${COLS.ID} as c`);
  return new Map(
    rows.map((r) => [Number(r[COLS.ADOBE_ACCOUNT_ID]), Number(r.c) || 0])
  );
}

module.exports = {
  recordUsersAssigned,
  removeMappingsForAccount,
  removeMappingsByOrders,
  getMappingsForAccount,
  getAccountForUser,
  markUsersProductFalseByAccount,
  getAssignedAdobeAccountIdForUserEmail,
  getEmailSetAlreadyAssignedToAdobe,
  getMappingCountsByAdobeAccountIds,
};
