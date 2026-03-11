const { db } = require("../../db");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const logger = require("../../utils/logger");
const adobeHttp = require("../../services/adobe-http");

const TABLE_DEF = RENEW_ADOBE_SCHEMA.ACCOUNT;
const TABLE = tableName(TABLE_DEF.TABLE, SCHEMA_RENEW_ADOBE);
const COLS = TABLE_DEF.COLS;

const MAX_USERS_PER_ACCOUNT = 11;

const CHECK_EMPTY_COLS = [
  COLS.EMAIL,
  COLS.PASSWORD_ENC,
  COLS.ORG_NAME,
  COLS.LICENSE_STATUS,
  COLS.LICENSE_DETAIL,
  COLS.USER_COUNT,
  COLS.USERS_SNAPSHOT,
  COLS.LAST_CHECKED,
  COLS.IS_ACTIVE,
  COLS.CREATED_AT,
];

function isValueEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return String(value).trim() === "";
  if (typeof value === "number") return false;
  if (typeof value === "boolean") return false;
  if (value instanceof Date) return false;
  return true;
}

function getEmptyFields(row) {
  const empty = [];
  for (const col of CHECK_EMPTY_COLS) {
    if (isValueEmpty(row[col])) empty.push(col);
  }
  return empty;
}

/** GET /api/renew-adobe/accounts */
const listAccounts = async (_req, res) => {
  try {
    const rows = await db(TABLE)
      .select(
        `${TABLE}.${COLS.ID}`,
        `${TABLE}.${COLS.EMAIL}`,
        `${TABLE}.${COLS.PASSWORD_ENC}`,
        `${TABLE}.${COLS.ORG_NAME}`,
        `${TABLE}.${COLS.LICENSE_STATUS}`,
        `${TABLE}.${COLS.LICENSE_DETAIL}`,
        `${TABLE}.${COLS.USER_COUNT}`,
        `${TABLE}.${COLS.USERS_SNAPSHOT}`,
        `${TABLE}.${COLS.LAST_CHECKED}`,
        `${TABLE}.${COLS.IS_ACTIVE}`,
        `${TABLE}.${COLS.CREATED_AT}`,
        `${TABLE}.${COLS.MAIL_BACKUP_ID}`,
        ...(COLS.URL_ACCESS ? [`${TABLE}.${COLS.URL_ACCESS}`] : [])
      )
      .orderBy(COLS.ID, "asc");

    const withEmptyCheck = rows.map((row) => ({
      ...row,
      empty_fields: getEmptyFields(row),
    }));

    logger.info("[renew-adobe] List accounts", { total: withEmptyCheck.length });
    res.json(withEmptyCheck);
  } catch (error) {
    logger.error("[renew-adobe] List accounts failed", { error: error.message });
    res.status(500).json({ error: "Không thể tải danh sách tài khoản Renew Adobe." });
  }
};

/** GET /api/renew-adobe/accounts/lookup?email= */
const lookupAccountByEmail = async (req, res) => {
  const email = (req.query.email || "").toString().trim();
  if (!email) return res.status(400).json({ error: "Thiếu tham số email." });

  const emailLower = email.toLowerCase();
  try {
    let row = await db(TABLE)
      .select(
        `${TABLE}.${COLS.ID}`, `${TABLE}.${COLS.EMAIL}`, `${TABLE}.${COLS.ORG_NAME}`,
        `${TABLE}.${COLS.LICENSE_STATUS}`, `${TABLE}.${COLS.LICENSE_DETAIL}`,
        `${TABLE}.${COLS.USER_COUNT}`, `${TABLE}.${COLS.USERS_SNAPSHOT}`,
        `${TABLE}.${COLS.LAST_CHECKED}`, `${TABLE}.${COLS.IS_ACTIVE}`, `${TABLE}.${COLS.CREATED_AT}`
      )
      .where(COLS.EMAIL, email)
      .first();

    if (!row) {
      const rows = await db(TABLE)
        .select(
          `${TABLE}.${COLS.ID}`, `${TABLE}.${COLS.EMAIL}`, `${TABLE}.${COLS.ORG_NAME}`,
          `${TABLE}.${COLS.LICENSE_STATUS}`, `${TABLE}.${COLS.LICENSE_DETAIL}`,
          `${TABLE}.${COLS.USER_COUNT}`, `${TABLE}.${COLS.USERS_SNAPSHOT}`,
          `${TABLE}.${COLS.LAST_CHECKED}`, `${TABLE}.${COLS.IS_ACTIVE}`, `${TABLE}.${COLS.CREATED_AT}`
        )
        .whereNotNull(COLS.USERS_SNAPSHOT)
        .where(COLS.USERS_SNAPSHOT, "!=", "");
      for (const r of rows) {
        try {
          const arr = JSON.parse(r[COLS.USERS_SNAPSHOT] || "[]");
          if (Array.isArray(arr) && arr.some((u) => String(u?.email || "").toLowerCase() === emailLower)) {
            row = r;
            break;
          }
        } catch (_) {}
      }
    }

    if (!row) return res.status(404).json({ error: "Không tìm thấy tài khoản với email tương ứng.", account: null });
    res.json({ account: row });
  } catch (error) {
    logger.error("[renew-adobe] Lookup account failed", { email, error: error.message });
    res.status(500).json({ error: "Lỗi tra cứu tài khoản.", account: null });
  }
};

/**
 * Check một account qua HTTP và cập nhật DB.
 * @param {number} id
 */
async function runCheckForAccountId(id) {
  const account = await db(TABLE).where(COLS.ID, id).first();
  if (!account) throw new Error("Không tìm thấy tài khoản.");

  const email = account[COLS.EMAIL];
  const password = account[COLS.PASSWORD_ENC] || "";
  if (!email || !password) throw new Error("Thiếu email hoặc password_enc.");

  const mailBackupId = account[COLS.MAIL_BACKUP_ID] != null ? Number(account[COLS.MAIL_BACKUP_ID]) : null;
  logger.info("[renew-adobe] Check account", { id, email });

  const result = await adobeHttp.checkAccount(email, password, {
    savedCookiesFromDb: COLS.ALERT_CONFIG ? account[COLS.ALERT_CONFIG] : null,
    mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
  });

  if (!result.success) {
    throw new Error(result.error || "Check thất bại.");
  }

  const sd = result.scrapedData;
  const updatePayload = {
    [COLS.ORG_NAME]: sd.orgName ?? null,
    [COLS.USER_COUNT]: sd.userCount ?? 0,
    [COLS.LICENSE_STATUS]: sd.licenseStatus ?? "unknown",
    [COLS.LAST_CHECKED]: new Date(),
  };
  if (sd.manageTeamMembers && Array.isArray(sd.manageTeamMembers)) {
    updatePayload[COLS.USERS_SNAPSHOT] = JSON.stringify(sd.manageTeamMembers);
  }
  if (COLS.ALERT_CONFIG && result.savedCookies) {
    updatePayload[COLS.ALERT_CONFIG] = result.savedCookies;
  }
  await db(TABLE).where(COLS.ID, id).update(updatePayload);
  logger.info("[renew-adobe] Check xong — đã cập nhật DB", { id, license_status: sd.licenseStatus });
}

/** POST /api/renew-adobe/accounts/:id/check */
const runCheck = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID không hợp lệ." });

  try {
    await runCheckForAccountId(id);
    const account = await db(TABLE).where(COLS.ID, id).first();
    return res.json({
      success: true,
      message: "Check thành công.",
      org_name: account?.[COLS.ORG_NAME] ?? null,
      user_count: account?.[COLS.USER_COUNT] ?? 0,
      license_status: account?.[COLS.LICENSE_STATUS] ?? "unknown",
    });
  } catch (err) {
    if (err.message === "Không tìm thấy tài khoản.") return res.status(404).json({ error: err.message });
    if (err.message === "Thiếu email hoặc password_enc.") return res.status(400).json({ error: err.message });
    logger.error("[renew-adobe] Run check failed", { id, error: err.message });
    return res.status(400).json({ success: false, message: err.message || "Check thất bại." });
  }
};

/** POST /api/renew-adobe/check-with-cookies — không dùng nữa (HTTP không cần cookies file) */
const runCheckWithCookies = async (_req, res) => {
  return res.status(400).json({
    error: "Endpoint check-with-cookies không còn hỗ trợ (đã chuyển sang HTTP). Dùng POST /accounts/:id/check.",
  });
};

/** POST /api/renew-adobe/accounts/:id/delete-user */
const runDeleteUser = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID không hợp lệ." });

  const userEmail = (req.body?.userEmail || "").toString().trim();
  if (!userEmail) return res.status(400).json({ error: "Thiếu userEmail trong body." });

  try {
    const account = await db(TABLE).where(COLS.ID, id).first();
    if (!account) return res.status(404).json({ error: "Không tìm thấy tài khoản." });

    const email = account[COLS.EMAIL];
    const password = account[COLS.PASSWORD_ENC] || "";
    if (!email || !password) return res.status(400).json({ error: "Thiếu email hoặc password_enc." });

    const mailBackupId = account[COLS.MAIL_BACKUP_ID] != null ? Number(account[COLS.MAIL_BACKUP_ID]) : null;
    logger.info("[renew-adobe] Delete user bắt đầu", { id, userEmail });
    const result = await adobeHttp.removeUserFromAccount(email, password, userEmail, {
      savedCookiesFromDb: COLS.ALERT_CONFIG ? account[COLS.ALERT_CONFIG] : null,
      mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
    });

    if (result.success) {
      // Sau khi xóa, check lại để lấy danh sách user mới
      try {
        await runCheckForAccountId(id);
      } catch (_) {}

      const updated = await db(TABLE).where(COLS.ID, id).first();
      return res.json({
        success: true,
        message: "Đã xóa user.",
        user_count: updated?.[COLS.USER_COUNT] ?? 0,
      });
    }

    return res.status(400).json({ success: false, message: result.error || "Xóa user thất bại." });
  } catch (err) {
    logger.error("[renew-adobe] Run delete user failed", { id, error: err.message });
    res.status(500).json({ success: false, error: err.message || "Lỗi khi xóa user." });
  }
};

/** POST /api/renew-adobe/accounts/:id/add-user */
const runAddUser = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID không hợp lệ." });

  const userEmailsRaw = req.body?.userEmails;
  const userEmailSingle = (req.body?.userEmail || "").toString().trim();
  const userEmails = Array.isArray(userEmailsRaw)
    ? userEmailsRaw.map((e) => String(e).trim()).filter(Boolean)
    : userEmailSingle ? [userEmailSingle] : [];
  if (userEmails.length === 0) return res.status(400).json({ error: "Thiếu userEmail hoặc userEmails." });

  try {
    const account = await db(TABLE).where(COLS.ID, id).first();
    if (!account) return res.status(404).json({ error: "Không tìm thấy tài khoản." });

    const email = account[COLS.EMAIL];
    const password = account[COLS.PASSWORD_ENC] || "";
    if (!email || !password) return res.status(400).json({ error: "Tài khoản thiếu email hoặc password." });

    const mailBackupId = account[COLS.MAIL_BACKUP_ID] != null ? Number(account[COLS.MAIL_BACKUP_ID]) : null;
    logger.info("[renew-adobe] Add users bắt đầu", { id, count: userEmails.length });
    const result = await adobeHttp.addUserToAccount(email, password, userEmails, {
      savedCookiesFromDb: COLS.ALERT_CONFIG ? account[COLS.ALERT_CONFIG] : null,
      mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
    });

    // Sau khi add, check lại để lấy danh sách user mới nhất
    try {
      await runCheckForAccountId(id);
    } catch (_) {}

    const updated = await db(TABLE).where(COLS.ID, id).first();
    const newCount = updated?.[COLS.USER_COUNT] ?? 0;
    let usersSnapshot = [];
    try { usersSnapshot = JSON.parse(updated?.[COLS.USERS_SNAPSHOT] || "[]"); } catch (_) {}

    return res.json({
      success: true,
      message: userEmails.length > 1
        ? `Đã thêm ${userEmails.length} người dùng.`
        : "Đã thêm người dùng.",
      user_emails: userEmails,
      user_count: newCount,
      users_snapshot: usersSnapshot,
      add_result: result,
    });
  } catch (err) {
    logger.error("[renew-adobe] Run add user failed", { id, error: err.message });
    return res.status(500).json({ success: false, error: err.message || "Lỗi khi thêm người dùng." });
  }
};

/** POST /api/renew-adobe/accounts/add-users-batch */
const runAddUsersBatch = async (req, res) => {
  const accountIdsRaw = req.body?.accountIds;
  const userEmailsRaw = req.body?.userEmails;
  const accountIds = Array.isArray(accountIdsRaw)
    ? accountIdsRaw.map((id) => parseInt(id, 10)).filter(Number.isFinite)
    : [];
  const userEmails = Array.isArray(userEmailsRaw)
    ? userEmailsRaw.map((e) => String(e).trim()).filter(Boolean)
    : [];

  if (accountIds.length === 0) return res.status(400).json({ error: "Thiếu accountIds." });
  if (userEmails.length === 0) return res.status(400).json({ error: "Thiếu userEmails." });

  try {
    const accounts = await db(TABLE)
      .whereIn(COLS.ID, accountIds)
      .select(COLS.ID, COLS.EMAIL, COLS.PASSWORD_ENC, COLS.USER_COUNT, COLS.ALERT_CONFIG);
    const idToOrder = new Map(accountIds.map((id, idx) => [id, idx]));
    const ordered = [...accounts].sort((a, b) => (idToOrder.get(a[COLS.ID]) ?? 0) - (idToOrder.get(b[COLS.ID]) ?? 0));

    const distribution = [];
    let remaining = [...userEmails];

    for (const account of ordered) {
      const currentCount = Math.max(0, parseInt(account[COLS.USER_COUNT], 10) || 0);
      const slotLeft = Math.max(0, MAX_USERS_PER_ACCOUNT - currentCount);
      const take = Math.min(slotLeft, remaining.length);
      const chunk = take > 0 ? remaining.splice(0, take) : [];
      distribution.push({
        accountId: account[COLS.ID],
        accountEmail: account[COLS.EMAIL],
        slotLeft,
        added: chunk,
        user_count_before: currentCount,
      });
    }

    const exceededEmails = remaining.length > 0 ? remaining : undefined;
    const totalToAdd = userEmails.length - (exceededEmails?.length ?? 0);
    if (totalToAdd === 0) {
      return res.status(400).json({
        success: false,
        error: "Không đủ slot: tất cả tài khoản đã đạt giới hạn 11 user.",
        distribution: distribution.map((d) => ({ accountId: d.accountId, accountEmail: d.accountEmail, added: d.added })),
        exceeded_emails: exceededEmails,
      });
    }

    const results = [];
    for (const item of distribution) {
      if (item.added.length === 0) continue;
      const acId = item.accountId;
      const account = ordered.find((a) => a[COLS.ID] === acId);
      if (!account || !account[COLS.EMAIL] || !account[COLS.PASSWORD_ENC]) {
        results.push({ accountId: acId, accountEmail: item.accountEmail, added: item.added, error: "Thiếu email/password." });
        continue;
      }

      try {
        const batchMailBackupId = account[COLS.MAIL_BACKUP_ID] != null ? Number(account[COLS.MAIL_BACKUP_ID]) : null;
        await adobeHttp.addUserToAccount(
          account[COLS.EMAIL], account[COLS.PASSWORD_ENC], item.added,
          { savedCookiesFromDb: account[COLS.ALERT_CONFIG] ?? null, mailBackupId: Number.isFinite(batchMailBackupId) ? batchMailBackupId : null }
        );
        // Check lại sau khi add
        try { await runCheckForAccountId(acId); } catch (_) {}
        const updated = await db(TABLE).where(COLS.ID, acId).first();
        results.push({
          accountId: acId,
          accountEmail: item.accountEmail,
          added: item.added,
          user_count_after: updated?.[COLS.USER_COUNT] ?? 0,
        });
        logger.info("[renew-adobe] Batch: đã thêm %s user vào account %s", item.added.length, acId);
      } catch (err) {
        logger.error("[renew-adobe] Batch add user failed", { id: acId, error: err.message });
        results.push({ accountId: acId, accountEmail: item.accountEmail, added: item.added, error: err.message });
      }
    }

    const totalAdded = results.reduce((sum, r) => sum + (r.error ? 0 : r.added?.length ?? 0), 0);
    return res.json({
      success: true,
      message: exceededEmails?.length
        ? `Đã thêm ${totalAdded} user vào ${results.length} tài khoản. Còn ${exceededEmails.length} email chưa thêm (hết slot).`
        : `Đã thêm ${totalAdded} user vào ${results.length} tài khoản.`,
      total_added: totalAdded,
      distribution: results,
      exceeded_emails: exceededEmails,
    });
  } catch (err) {
    logger.error("[renew-adobe] Add users batch failed", { error: err.message });
    return res.status(500).json({ success: false, error: err.message || "Lỗi batch." });
  }
};

/** POST /api/renew-adobe/accounts/:id/auto-delete-users */
const runAutoDeleteUsers = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID không hợp lệ." });

  const userEmails = req.body?.userEmails;
  const list = Array.isArray(userEmails) ? userEmails : userEmails ? [userEmails] : [];
  const normalized = list.map((e) => String(e).trim()).filter(Boolean);
  if (normalized.length === 0) return res.status(400).json({ error: "Thiếu userEmails." });

  try {
    const account = await db(TABLE).where(COLS.ID, id).first();
    if (!account) return res.status(404).json({ error: "Không tìm thấy tài khoản." });

    const email = account[COLS.EMAIL];
    const password = account[COLS.PASSWORD_ENC] || "";

    const mailBackupId = account[COLS.MAIL_BACKUP_ID] != null ? Number(account[COLS.MAIL_BACKUP_ID]) : null;
    logger.info("[renew-adobe] Auto-delete users bắt đầu", { id, count: normalized.length });
    const result = await adobeHttp.autoDeleteUsers(email, password, normalized, {
      savedCookiesFromDb: COLS.ALERT_CONFIG ? account[COLS.ALERT_CONFIG] : null,
      mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
    });

    // Check lại sau khi xóa
    try { await runCheckForAccountId(id); } catch (_) {}

    return res.json({
      success: true,
      message: `Đã xử lý: ${result.deleted.length} xóa thành công, ${result.failed.length} lỗi.`,
      deleted: result.deleted,
      failed: result.failed,
    });
  } catch (err) {
    logger.error("[renew-adobe] Auto-delete users failed", { id, error: err.message });
    return res.status(500).json({ success: false, error: err.message || "Lỗi khi xóa user." });
  }
};

/** GET /api/renew-adobe/queue-status — giữ lại cho FE nhưng trả static (không còn queue) */
const adobeQueueStatus = (_req, res) => {
  res.json({ running: 0, queued: 0, maxConcurrent: 10, maxQueueSize: 100 });
};

module.exports = {
  listAccounts,
  lookupAccountByEmail,
  runCheck,
  runCheckForAccountId,
  runCheckWithCookies,
  runDeleteUser,
  runAddUser,
  runAddUsersBatch,
  runAutoDeleteUsers,
  adobeQueueStatus,
};
