const { db } = require("../../db");
const {
  SCHEMA_RENEW_ADOBE,
  SCHEMA_PRODUCT,
  RENEW_ADOBE_SCHEMA,
  PRODUCT_SCHEMA,
  SCHEMA_ORDERS,
  ORDERS_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const logger = require("../../utils/logger");
const adobeHttp = require("../../services/adobe-http");
const { lookupAndRecordIfNeeded } = require("../../services/userAccountMappingService");

const TABLE_DEF = RENEW_ADOBE_SCHEMA.ACCOUNT;
const TABLE = tableName(TABLE_DEF.TABLE, SCHEMA_RENEW_ADOBE);
const COLS = TABLE_DEF.COLS;

const PS_TABLE = tableName(RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.TABLE, SCHEMA_RENEW_ADOBE);
const PS_COLS = RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.COLS;

const VARIANT_TABLE = tableName(PRODUCT_SCHEMA.VARIANT.TABLE, SCHEMA_PRODUCT);
const VARIANT_COLS = PRODUCT_SCHEMA.VARIANT.COLS;

const TBL_ORDER = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const ORD_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;

const RENEW_ADOBE_SYSTEM_CODE = "renew_adobe";

/** Trạng thái đơn được hiển thị trong Danh sách user & đơn hàng */
const ALLOWED_ORDER_STATUSES = ["Đã Thanh Toán", "Cần Gia Hạn", "Đang Xử Lý"];

/** Lấy danh sách variant_id thuộc hệ thống renew_adobe (từ product_system) */
async function getRenewAdobeVariantIds() {
  const rows = await db(PS_TABLE)
    .where(PS_COLS.SYSTEM_CODE, RENEW_ADOBE_SYSTEM_CODE)
    .select(PS_COLS.VARIANT_ID);
  return rows.map((r) => r[PS_COLS.VARIANT_ID]).filter((id) => id != null);
}

const MAX_USERS_PER_ACCOUNT = 10;

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

  const existingUrlAccess = (COLS.URL_ACCESS && account[COLS.URL_ACCESS] && String(account[COLS.URL_ACCESS]).trim()) || null;
  const rawOrgName = (COLS.ORG_NAME && account[COLS.ORG_NAME]) ? String(account[COLS.ORG_NAME]).trim() : "";
  const existingOrgName = rawOrgName && rawOrgName !== "-" ? rawOrgName : undefined;

  const result = await adobeHttp.checkAccount(email, password, {
    savedCookiesFromDb: COLS.ALERT_CONFIG ? account[COLS.ALERT_CONFIG] : null,
    mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
    existingUrlAccess,
    existingOrgName,
  });

  if (!result.success) {
    throw new Error(result.error || "Check thất bại.");
  }

  const sd = result.scrapedData;
  const updatePayload = {
    [COLS.ORG_NAME]: sd.orgName ?? null,
    [COLS.USER_COUNT]: Number.isFinite(sd.userCount) ? sd.userCount : 0,
    [COLS.LICENSE_STATUS]: sd.licenseStatus ?? "unknown",
    [COLS.LAST_CHECKED]: new Date(),
  };
  if (sd.manageTeamMembers && Array.isArray(sd.manageTeamMembers)) {
    updatePayload[COLS.USERS_SNAPSHOT] = JSON.stringify(sd.manageTeamMembers);
  }
  if (sd.urlAccess && COLS.URL_ACCESS) {
    updatePayload[COLS.URL_ACCESS] = sd.urlAccess;
  }
  if (COLS.ALERT_CONFIG && result.savedCookies) {
    updatePayload[COLS.ALERT_CONFIG] = result.savedCookies;
  }
  await db(TABLE).where(COLS.ID, id).update(updatePayload);
  logger.info("[renew-adobe] Check xong — đã cập nhật DB", { id, license_status: sd.licenseStatus });

  // Auto-delete tất cả user nếu tài khoản hết hạn
  if (sd.licenseStatus && sd.licenseStatus.toLowerCase() === "expired") {
    const userEmails = (sd.manageTeamMembers || [])
      .map((u) => u.email)
      .filter(Boolean);

    if (userEmails.length > 0) {
      logger.info("[renew-adobe] Account %s expired → auto-delete %s users", id, userEmails.length);
      try {
        const mailBackupId = account[COLS.MAIL_BACKUP_ID] != null ? Number(account[COLS.MAIL_BACKUP_ID]) : null;
        await adobeHttp.autoDeleteUsers(email, password, userEmails, {
          savedCookiesFromDb: result.savedCookies || null,
          mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
        });
        await db(TABLE).where(COLS.ID, id).update({
          [COLS.USERS_SNAPSHOT]: JSON.stringify([]),
          [COLS.USER_COUNT]: 0,
        });
        logger.info("[renew-adobe] Auto-delete xong cho account %s", id);
      } catch (delErr) {
        logger.error("[renew-adobe] Auto-delete failed cho account %s: %s", id, delErr.message);
      }
    }
  }
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

    // Khi add user: tra order_list theo email, nếu có đơn và chưa note thì ghi vào mapping
    const addedEmails = result.added?.length > 0 ? result.added : userEmails;
    const mappingResult = await lookupAndRecordIfNeeded(addedEmails, id).catch((e) => {
      logger.warn("[renew-adobe] lookupAndRecordIfNeeded failed", { error: e.message });
      return null;
    });
    if (mappingResult) {
      logger.info("[renew-adobe] Mapping result", mappingResult);
    }

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
      .select(COLS.ID, COLS.EMAIL, COLS.PASSWORD_ENC, COLS.USER_COUNT, COLS.ALERT_CONFIG, COLS.MAIL_BACKUP_ID);
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

    if (result.savedCookies && COLS.ALERT_CONFIG) {
      await db(TABLE).where(COLS.ID, id).update({ [COLS.ALERT_CONFIG]: result.savedCookies });
    }
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

const MAX_CHECK_ALL_CONCURRENT = 3;

/** GET /api/renew-adobe/accounts/check-all (SSE) */
const checkAllAccounts = async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let aborted = false;
  req.on("close", () => { aborted = true; });

  const sendEvent = (data) => {
    if (aborted) return;
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const rows = await db(TABLE)
      .select(COLS.ID, COLS.EMAIL)
      .where(COLS.IS_ACTIVE, true)
      .orderBy(COLS.ID, "asc");

    const total = rows.length;
    if (total === 0) {
      sendEvent({ type: "complete", total: 0, completed: 0, failed: 0 });
      return res.end();
    }

    sendEvent({ type: "start", total });

    let completed = 0;
    let failed = 0;
    let idx = 0;
    const queue = [...rows];

    await new Promise((resolve) => {
      const running = new Set();

      function next() {
        if (aborted) { resolve(); return; }

        while (running.size < MAX_CHECK_ALL_CONCURRENT && idx < queue.length) {
          const account = queue[idx++];
          const id = account[COLS.ID];
          const email = account[COLS.EMAIL];

          sendEvent({ type: "checking", id, email, completed, failed, total });

          const task = (async () => {
            try {
              await runCheckForAccountId(id);
              completed++;
              const updated = await db(TABLE).where(COLS.ID, id).first();
              sendEvent({
                type: "done", id, email, completed, failed, total,
                org_name: updated?.[COLS.ORG_NAME] ?? null,
                user_count: updated?.[COLS.USER_COUNT] ?? 0,
                license_status: updated?.[COLS.LICENSE_STATUS] ?? "unknown",
              });
            } catch (err) {
              completed++;
              failed++;
              sendEvent({ type: "error", id, email, error: err.message, completed, failed, total });
            }
          })().then(() => {
            running.delete(task);
            if (running.size === 0 && idx >= queue.length) resolve();
            else next();
          });

          running.add(task);
        }

        if (running.size === 0 && idx >= queue.length) resolve();
      }

      next();
    });

    sendEvent({ type: "complete", total, completed, failed });

    // Sau khi check xong tất cả → chạy auto-assign
    if (!aborted) {
      sendEvent({ type: "auto_assign_start" });
      try {
        const assignResult = await autoAssignUsers((msg) => {
          sendEvent({ type: "auto_assign_progress", ...msg });
        });
        sendEvent({ type: "auto_assign_done", ...assignResult });
      } catch (assignErr) {
        sendEvent({ type: "auto_assign_error", error: assignErr.message });
      }
    }
  } catch (err) {
    logger.error("[renew-adobe] Check all failed", { error: err.message });
    sendEvent({ type: "fatal", error: err.message });
  }

  res.end();
};

/**
 * GET /api/renew-adobe/user-orders
 * Lấy đơn hàng từ order_list có id_product thuộc hệ thống renew_adobe (product_system).
 */
const listUserOrders = async (_req, res) => {
  try {
    const variantIds = await getRenewAdobeVariantIds();
    if (variantIds.length === 0) {
      logger.info("[renew-adobe] user-orders: 0 rows (chưa có variant nào thuộc renew_adobe)");
      return res.json([]);
    }

    const rows = await db(TBL_ORDER)
      .select(
        `${TBL_ORDER}.${ORD_COLS.ID_ORDER} as order_code`,
        `${TBL_ORDER}.${ORD_COLS.INFORMATION_ORDER} as information_order`,
        `${TBL_ORDER}.${ORD_COLS.CUSTOMER} as customer`,
        `${TBL_ORDER}.${ORD_COLS.CONTACT} as contact`,
        db.raw(`TO_CHAR((${TBL_ORDER}.${ORD_COLS.EXPIRY_DATE})::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as expiry_date`),
        `${TBL_ORDER}.${ORD_COLS.STATUS} as status`
      )
      .whereIn(ORD_COLS.ID_PRODUCT, variantIds)
      .whereIn(ORD_COLS.STATUS, ALLOWED_ORDER_STATUSES)
      .whereNotNull(ORD_COLS.INFORMATION_ORDER)
      .orderBy(ORD_COLS.ID_ORDER, "asc");

    logger.info("[renew-adobe] user-orders: %d rows (variant_ids: %s)", rows.length, variantIds.join(", "));
    res.json(rows);
  } catch (error) {
    logger.error("[renew-adobe] user-orders failed", { error: error.message });
    res.status(500).json({ error: "Không thể tải danh sách user-orders." });
  }
};

/**
 * Auto-assign: tìm email đơn hàng chưa hết hạn mà chưa nằm trong bất kỳ
 * users_snapshot nào → add vào tài khoản còn gói & còn slot (ưu tiên ít slot trống nhất).
 *
 * @param {((msg: object) => void)|null} onProgress – callback SSE (optional)
 * @returns {{ assigned: number, skipped: number, errors: string[] }}
 */
async function autoAssignUsers(onProgress = null) {
  const log = (data) => {
    if (onProgress) onProgress(data);
    logger.info("[renew-adobe] autoAssign: %s", JSON.stringify(data));
  };

  // 1. Lấy email từ đơn hàng còn hiệu lực (order_list, variant thuộc renew_adobe, status: Đã Thanh Toán / Cần Gia Hạn / Đang Xử Lý)
  const variantIds = await getRenewAdobeVariantIds();
  let activeOrders = [];
  if (variantIds.length > 0) {
    activeOrders = await db(TBL_ORDER)
      .select(
        `${TBL_ORDER}.${ORD_COLS.INFORMATION_ORDER} as email`,
        `${TBL_ORDER}.${ORD_COLS.STATUS} as status`,
        `${TBL_ORDER}.${ORD_COLS.EXPIRY_DATE} as expiry_date`
      )
      .whereIn(ORD_COLS.ID_PRODUCT, variantIds)
      .whereIn(ORD_COLS.STATUS, ALLOWED_ORDER_STATUSES)
      .whereNotNull(ORD_COLS.INFORMATION_ORDER);
  }

  const now = new Date();
  const activeEmails = new Set();
  for (const o of activeOrders) {
    if (o.expiry_date && new Date(o.expiry_date) < now) continue;
    const em = (o.email || "").trim().toLowerCase();
    if (em) activeEmails.add(em);
  }

  log({ step: "active_orders", count: activeEmails.size });

  // 2. Lấy tất cả accounts → build set email đã có trong snapshot
  const accounts = await db(TABLE)
    .select(
      COLS.ID, COLS.EMAIL, COLS.PASSWORD_ENC, COLS.ORG_NAME,
      COLS.LICENSE_STATUS, COLS.USER_COUNT, COLS.USERS_SNAPSHOT,
      COLS.ALERT_CONFIG, COLS.MAIL_BACKUP_ID
    )
    .where(COLS.IS_ACTIVE, true)
    .orderBy(COLS.ID, "asc");

  const existingEmails = new Set();
  for (const acc of accounts) {
    try {
      const snap = JSON.parse(acc[COLS.USERS_SNAPSHOT] || "[]");
      for (const u of snap) {
        if (u.email) existingEmails.add(u.email.toLowerCase().trim());
      }
    } catch (_) {}
  }

  // 3. Email cần add = active orders mà chưa có trong bất kỳ snapshot nào
  const emailsToAdd = [...activeEmails].filter((e) => !existingEmails.has(e));
  log({ step: "emails_to_add", count: emailsToAdd.length });

  if (emailsToAdd.length === 0) {
    return { assigned: 0, skipped: 0, errors: [] };
  }

  // 4. Tài khoản còn gói & còn slot, ưu tiên ít slot trống nhất (fill fullest first)
  const available = accounts
    .filter((a) => {
      const ls = (a[COLS.LICENSE_STATUS] || "").toLowerCase();
      return ls !== "expired" && ls !== "unknown";
    })
    .map((a) => ({
      ...a,
      currentCount: Math.max(0, parseInt(a[COLS.USER_COUNT], 10) || 0),
    }))
    .filter((a) => a.currentCount < MAX_USERS_PER_ACCOUNT)
    .sort((a, b) => {
      const slotsA = MAX_USERS_PER_ACCOUNT - a.currentCount;
      const slotsB = MAX_USERS_PER_ACCOUNT - b.currentCount;
      return slotsA - slotsB; // ít slot trống nhất trước
    });

  log({ step: "available_accounts", count: available.length, slots: available.map((a) => ({ id: a[COLS.ID], slots: MAX_USERS_PER_ACCOUNT - a.currentCount })) });

  if (available.length === 0) {
    log({ step: "no_slots", message: "Không có tài khoản nào còn slot" });
    return { assigned: 0, skipped: emailsToAdd.length, errors: [] };
  }

  // 5. Phân bổ email vào từng tài khoản
  let remaining = [...emailsToAdd];
  const distribution = [];

  for (const acc of available) {
    if (remaining.length === 0) break;
    const slotsLeft = MAX_USERS_PER_ACCOUNT - acc.currentCount;
    const take = Math.min(slotsLeft, remaining.length);
    const chunk = remaining.splice(0, take);
    if (chunk.length > 0) {
      distribution.push({ account: acc, emails: chunk });
    }
  }

  // 6. Thực thi add + assign product cho từng batch
  let totalAssigned = 0;
  const errors = [];

  for (const { account, emails } of distribution) {
    const accId = account[COLS.ID];
    const accEmail = account[COLS.EMAIL];
    const accPwd = account[COLS.PASSWORD_ENC] || "";

    log({ step: "adding", accountId: accId, accountEmail: accEmail, userCount: emails.length });

    try {
      const mailBackupId = account[COLS.MAIL_BACKUP_ID] != null ? Number(account[COLS.MAIL_BACKUP_ID]) : null;
      const result = await adobeHttp.addUsersWithProduct(accEmail, accPwd, emails, {
        savedCookiesFromDb: account[COLS.ALERT_CONFIG] || null,
        mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
        _orgName: account[COLS.ORG_NAME],
      });

      // Cập nhật DB với snapshot mới
      const updatePayload = {
        [COLS.USER_COUNT]: result.userCount ?? 0,
        [COLS.USERS_SNAPSHOT]: JSON.stringify(result.manageTeamMembers || []),
        [COLS.LICENSE_STATUS]: result.licenseStatus ?? account[COLS.LICENSE_STATUS],
      };
      if (result.savedCookies) {
        updatePayload[COLS.ALERT_CONFIG] = result.savedCookies;
      }
      await db(TABLE).where(COLS.ID, accId).update(updatePayload);

      const addedCount = result.addResult?.added?.length ?? emails.length;
      totalAssigned += addedCount;

      log({ step: "done", accountId: accId, added: addedCount, assignProduct: result.assignResult?.success ?? false });
    } catch (err) {
      logger.error("[renew-adobe] autoAssign add failed: account=%s, error=%s", accId, err.message);
      errors.push(`Account ${accId}: ${err.message}`);
    }
  }

  const skipped = remaining.length;
  log({ step: "complete", assigned: totalAssigned, skipped, errors: errors.length });
  return { assigned: totalAssigned, skipped, errors };
}

/** POST /api/renew-adobe/auto-assign — trigger thủ công */
const runAutoAssign = async (_req, res) => {
  try {
    const result = await autoAssignUsers();
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error("[renew-adobe] runAutoAssign failed", { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/renew-adobe/fix-user
 * Fix thủ công 1 email: add vào tài khoản còn gói & còn slot + gắn product.
 */
const fixSingleUser = async (req, res) => {
  const userEmail = (req.body?.email || "").toString().trim().toLowerCase();
  if (!userEmail) return res.status(400).json({ error: "Thiếu email." });

  try {
    // Tìm tài khoản còn gói & còn slot (ít slot trống nhất trước)
    const accounts = await db(TABLE)
      .select(
        COLS.ID, COLS.EMAIL, COLS.PASSWORD_ENC, COLS.ORG_NAME,
        COLS.LICENSE_STATUS, COLS.USER_COUNT,
        COLS.ALERT_CONFIG, COLS.MAIL_BACKUP_ID
      )
      .where(COLS.IS_ACTIVE, true)
      .orderBy(COLS.ID, "asc");

    const available = accounts
      .filter((a) => {
        const ls = (a[COLS.LICENSE_STATUS] || "").toLowerCase();
        return ls !== "expired" && ls !== "unknown";
      })
      .map((a) => ({
        ...a,
        currentCount: Math.max(0, parseInt(a[COLS.USER_COUNT], 10) || 0),
      }))
      .filter((a) => a.currentCount < MAX_USERS_PER_ACCOUNT)
      .sort((a, b) => {
        const slotsA = MAX_USERS_PER_ACCOUNT - a.currentCount;
        const slotsB = MAX_USERS_PER_ACCOUNT - b.currentCount;
        return slotsA - slotsB;
      });

    if (available.length === 0) {
      return res.status(400).json({ success: false, error: "Không có tài khoản nào còn slot." });
    }

    const target = available[0];
    const accId = target[COLS.ID];
    const accEmail = target[COLS.EMAIL];
    const accPwd = target[COLS.PASSWORD_ENC] || "";
    const mailBackupId = target[COLS.MAIL_BACKUP_ID] != null ? Number(target[COLS.MAIL_BACKUP_ID]) : null;

    logger.info("[renew-adobe] fixSingleUser: email=%s → account=%s", userEmail, accId);

    const result = await adobeHttp.addUsersWithProduct(accEmail, accPwd, [userEmail], {
      savedCookiesFromDb: target[COLS.ALERT_CONFIG] || null,
      mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
      _orgName: target[COLS.ORG_NAME],
    });

    const updatePayload = {
      [COLS.USER_COUNT]: Number.isFinite(result.userCount) ? result.userCount : 0,
      [COLS.USERS_SNAPSHOT]: JSON.stringify(result.manageTeamMembers || []),
      [COLS.LICENSE_STATUS]: result.licenseStatus ?? target[COLS.LICENSE_STATUS],
    };
    if (result.savedCookies) {
      updatePayload[COLS.ALERT_CONFIG] = result.savedCookies;
    }
    await db(TABLE).where(COLS.ID, accId).update(updatePayload);

    return res.json({
      success: true,
      message: `Đã gán ${userEmail} vào ${accEmail}.`,
      accountId: accId,
      accountEmail: accEmail,
      profile: target[COLS.ORG_NAME] ?? "—",
    });
  } catch (err) {
    logger.error("[renew-adobe] fixSingleUser failed", { email: userEmail, error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
};

/** PATCH /api/renew-adobe/accounts/:id/url-access */
const updateUrlAccess = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID không hợp lệ." });

  const urlAccess = (req.body?.url_access ?? "").toString().trim();

  try {
    await db(TABLE).where(COLS.ID, id).update({ [COLS.URL_ACCESS]: urlAccess || null });
    return res.json({ success: true, url_access: urlAccess || null });
  } catch (err) {
    logger.error("[renew-adobe] updateUrlAccess failed", { id, error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
};

/** GET /api/renew-adobe/variants — id + display_name từ product.variant (cho dropdown) */
const listVariants = async (_req, res) => {
  try {
    const rows = await db(VARIANT_TABLE)
      .select(VARIANT_COLS.ID, VARIANT_COLS.DISPLAY_NAME)
      .where(VARIANT_COLS.IS_ACTIVE, true)
      .orderBy(VARIANT_COLS.DISPLAY_NAME, "asc");
    return res.json(rows.map((r) => ({ id: r[VARIANT_COLS.ID], display_name: r[VARIANT_COLS.DISPLAY_NAME] ?? "" })));
  } catch (err) {
    logger.error("[renew-adobe] listVariants failed", { error: err.message });
    return res.status(500).json({ error: err.message });
  }
};

/** GET /api/renew-adobe/product-system — danh sách bảng product_system */
const listProductSystem = async (_req, res) => {
  try {
    const rows = await db(PS_TABLE)
      .select(PS_COLS.ID, PS_COLS.VARIANT_ID, PS_COLS.SYSTEM_CODE, PS_COLS.CREATED_AT)
      .orderBy(PS_COLS.ID, "asc");
    return res.json(rows);
  } catch (err) {
    logger.error("[renew-adobe] listProductSystem failed", { error: err.message });
    return res.status(500).json({ error: err.message });
  }
};

/** POST /api/renew-adobe/product-system — thêm 1 dòng (variant_id, system_code) */
const createProductSystem = async (req, res) => {
  const variantId = req.body?.variant_id != null ? Number(req.body.variant_id) : null;
  const systemCode = (req.body?.system_code && String(req.body.system_code).trim()) || null;
  if (variantId == null || variantId <= 0 || !systemCode) {
    return res.status(400).json({ error: "Cần variant_id (số nguyên > 0) và system_code (chuỗi không rỗng)" });
  }
  try {
    const [row] = await db(PS_TABLE)
      .insert({
        [PS_COLS.VARIANT_ID]: variantId,
        [PS_COLS.SYSTEM_CODE]: systemCode,
      })
      .returning([PS_COLS.ID, PS_COLS.VARIANT_ID, PS_COLS.SYSTEM_CODE, PS_COLS.CREATED_AT]);
    return res.status(201).json(row || { id: null, variant_id: variantId, system_code: systemCode, created_at: new Date().toISOString() });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Cặp variant_id + system_code đã tồn tại" });
    }
    logger.error("[renew-adobe] createProductSystem failed", { error: err.message });
    return res.status(500).json({ error: err.message });
  }
};

/** DELETE /api/renew-adobe/product-system/:id */
const deleteProductSystem = async (req, res) => {
  const id = Number(req.params.id);
  if (!id || id <= 0) {
    return res.status(400).json({ error: "id không hợp lệ" });
  }
  try {
    const deleted = await db(PS_TABLE).where(PS_COLS.ID, id).del();
    if (deleted === 0) {
      return res.status(404).json({ error: "Không tìm thấy bản ghi" });
    }
    return res.json({ success: true });
  } catch (err) {
    logger.error("[renew-adobe] deleteProductSystem failed", { error: err.message });
    return res.status(500).json({ error: err.message });
  }
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
  checkAllAccounts,
  listUserOrders,
  autoAssignUsers,
  runAutoAssign,
  fixSingleUser,
  updateUrlAccess,
  listVariants,
  listProductSystem,
  createProductSystem,
  deleteProductSystem,
};
