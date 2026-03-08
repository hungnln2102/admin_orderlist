const path = require("path");
const { db } = require("../../db");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const logger = require("../../utils/logger");
const { getAdobeUserToken } = require("../../services/adobeCheckService");

/** Đường dẫn file cookie theo account (lưu sau login lần đầu, dùng lại lần sau). Có thể tắt bằng env ADOBE_SAVE_COOKIES=false. */
function getCookiesPathForAccount(accountId) {
  if (process.env.ADOBE_SAVE_COOKIES === "false" || process.env.ADOBE_SAVE_COOKIES === "0") return null;
  return path.join(process.cwd(), "cookies", `adobe_account_${accountId}.json`);
}

const TABLE_DEF = RENEW_ADOBE_SCHEMA.ACCOUNT;
const TABLE = tableName(TABLE_DEF.TABLE, SCHEMA_RENEW_ADOBE);
const COLS = TABLE_DEF.COLS;

/** Các cột cần kiểm tra trống (khớp bảng accounts hiện tại), trừ id */
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

/**
 * Kiểm tra giá trị có được coi là trống không (theo doc).
 * - text: null, undefined, hoặc chuỗi rỗng/whitespace
 * - number: null, undefined (0 coi là có giá trị)
 * - boolean: null, undefined (false coi là có giá trị)
 * - date: null, undefined
 */
function isValueEmpty(value, colName) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return String(value).trim() === "";
  if (typeof value === "number") return false; // 0 vẫn coi là có giá trị
  if (typeof value === "boolean") return false; // false vẫn coi là có giá trị
  if (value instanceof Date) return false;
  return true;
}

/** Trả về mảng tên cột đang trống của một row */
function getEmptyFields(row) {
  const empty = [];
  for (const col of CHECK_EMPTY_COLS) {
    const val = row[col];
    if (isValueEmpty(val, col)) empty.push(col);
  }
  return empty;
}

/**
 * GET /api/renew-adobe/accounts
 * Danh sách account từ system_renew_adobe.accounts, kèm kiểm tra cột trống (theo docs/Renew_Adobe_Overview.md).
 * Mỗi item có thêm empty_fields: string[] (các cột đang trống).
 */
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
        `${TABLE}.${COLS.MAIL_BACKUP_ID}`
      )
      .orderBy(COLS.ID, "asc");

    const withEmptyCheck = rows.map((row) => {
      const empty_fields = getEmptyFields(row);
      return { ...row, empty_fields };
    });

    console.log("[renew-adobe] listAccounts – số bản ghi:", rows.length);
    console.log("[renew-adobe] listAccounts – dữ liệu trả về (có empty_fields):", JSON.stringify(withEmptyCheck, null, 2));
    logger.info("[renew-adobe] List accounts + check empty", {
      total: withEmptyCheck.length,
      sample: withEmptyCheck.slice(0, 2).map((r) => ({ id: r.id, email: r.email, empty_fields: r.empty_fields })),
    });

    res.json(withEmptyCheck);
  } catch (error) {
    logger.error("[renew-adobe] List accounts failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Không thể tải danh sách tài khoản Renew Adobe.",
    });
  }
};

/**
 * GET /api/renew-adobe/accounts/lookup?email=...
 * Tra cứu 1 tài khoản theo email:
 * 1) Tìm theo email đăng nhập (cột email);
 * 2) Nếu không có, tìm tài khoản có email này trong users_snapshot (thành viên).
 */
const lookupAccountByEmail = async (req, res) => {
  const email = (req.query.email || "").toString().trim();
  if (!email) {
    return res.status(400).json({ error: "Thiếu tham số email." });
  }
  const emailLower = email.toLowerCase();
  try {
    let row = await db(TABLE)
      .select(
        `${TABLE}.${COLS.ID}`,
        `${TABLE}.${COLS.EMAIL}`,
        `${TABLE}.${COLS.ORG_NAME}`,
        `${TABLE}.${COLS.LICENSE_STATUS}`,
        `${TABLE}.${COLS.LICENSE_DETAIL}`,
        `${TABLE}.${COLS.USER_COUNT}`,
        `${TABLE}.${COLS.USERS_SNAPSHOT}`,
        `${TABLE}.${COLS.LAST_CHECKED}`,
        `${TABLE}.${COLS.IS_ACTIVE}`,
        `${TABLE}.${COLS.CREATED_AT}`
      )
      .where(COLS.EMAIL, email)
      .first();

    if (!row) {
      const rows = await db(TABLE)
        .select(
          `${TABLE}.${COLS.ID}`,
          `${TABLE}.${COLS.EMAIL}`,
          `${TABLE}.${COLS.ORG_NAME}`,
          `${TABLE}.${COLS.LICENSE_STATUS}`,
          `${TABLE}.${COLS.LICENSE_DETAIL}`,
          `${TABLE}.${COLS.USER_COUNT}`,
          `${TABLE}.${COLS.USERS_SNAPSHOT}`,
          `${TABLE}.${COLS.LAST_CHECKED}`,
          `${TABLE}.${COLS.IS_ACTIVE}`,
          `${TABLE}.${COLS.CREATED_AT}`
        )
        .whereNotNull(COLS.USERS_SNAPSHOT)
        .where(COLS.USERS_SNAPSHOT, "!=", "");
      for (const r of rows) {
        try {
          const arr = JSON.parse(r[COLS.USERS_SNAPSHOT] || "[]");
          if (Array.isArray(arr) && arr.some((u) => String(u && u.email || "").toLowerCase() === emailLower)) {
            row = r;
            break;
          }
        } catch (_) {}
      }
    }

    if (!row) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản với email tương ứng.", account: null });
    }

    res.json({ account: row });
  } catch (error) {
    logger.error("[renew-adobe] Lookup account failed", { email, error: error.message });
    res.status(500).json({
      error: "Lỗi tra cứu tài khoản.",
      account: null,
    });
  }
};

/**
 * POST /api/renew-adobe/check-with-cookies
 * Đăng nhập bằng file cookies (bỏ qua tk/mk). Body: { cookiesFile: "path/to/file.json" }
 */
const runCheckWithCookies = async (req, res) => {
  const cookiesFile = req.body?.cookiesFile?.trim();
  if (!cookiesFile) {
    return res.status(400).json({ error: "Thiếu cookiesFile trong body." });
  }

  logger.info("[renew-adobe] Check với cookies file: %s", cookiesFile);

  try {
    await getAdobeUserToken("", "", { cookiesFile });
  } catch (loginErr) {
    if (loginErr.scrapedData) {
      const sd = loginErr.scrapedData;
      return res.json({
        success: true,
        message: "Đăng nhập bằng cookies thành công.",
        adobe_org_id: sd.adobe_org_id ?? null,
        org_name: sd.orgName ?? null,
        user_count: sd.userCount ?? 0,
        license_status: sd.licenseStatus ?? "unknown",
        users_snapshot: sd.usersSnapshot ?? null,
      });
    }
    logger.warn("[renew-adobe] Check với cookies fail — %s", loginErr.message);
    return res.status(400).json({
      success: false,
      message: loginErr.message || "Cookies không hợp lệ hoặc đã hết hạn.",
    });
  }
};

/**
 * POST /api/renew-adobe/accounts/:id/check
 * Login Admin Console → chờ trang overview → success (scrape + cập nhật DB) hoặc fail.
 * Body tùy chọn: { cookiesFile: "path" } — dùng cookies thay vì tk/mk trong DB.
 */
const runCheck = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID không hợp lệ." });
  }

  const cookiesFile = req.body?.cookiesFile?.trim();
  const useCookies = !!cookiesFile;

  try {
    const account = await db(TABLE).where(COLS.ID, id).first();
    if (!account) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    }

    const email = account[COLS.EMAIL];
    const password = account[COLS.PASSWORD_ENC] || "";
    if (!useCookies && (!email || !password)) {
      return res.status(400).json({ error: "Thiếu email hoặc password_enc." });
    }

    const mailBackupId = account[COLS.MAIL_BACKUP_ID] != null ? Number(account[COLS.MAIL_BACKUP_ID]) : null;
    logger.info("[renew-adobe] Check bắt đầu", { id, email: useCookies ? "(cookies)" : email, mailBackupId });

    try {
      const opts = { mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null };
      if (useCookies) opts.cookiesFile = cookiesFile;
      if (COLS.ALERT_CONFIG) opts.savedCookiesFromDb = account[COLS.ALERT_CONFIG] ?? null;
      const cookiesPath = getCookiesPathForAccount(id);
      if (cookiesPath) opts.saveCookiesTo = cookiesPath;
      await getAdobeUserToken(email, password, opts);
    } catch (loginErr) {
      if (loginErr.scrapedData) {
        const sd = loginErr.scrapedData;
        const isSignInPage = /^(Sign\s*in|Log\s*in|Sign\s*out|Đăng\s*nhập)$/i.test(String(sd.orgName || "").trim());
        const orgName = isSignInPage ? null : (sd.orgName ?? null);
        const updatePayload = {
          [COLS.ORG_NAME]: orgName,
          [COLS.USER_COUNT]: sd.userCount ?? 0,
          [COLS.LICENSE_STATUS]: sd.licenseStatus ?? "unknown",
          [COLS.LAST_CHECKED]: new Date(),
        };
        if (sd.usersSnapshot != null) updatePayload[COLS.USERS_SNAPSHOT] = sd.usersSnapshot;
        if (sd.manageTeamMembers && Array.isArray(sd.manageTeamMembers)) {
          updatePayload[COLS.USERS_SNAPSHOT] = JSON.stringify(sd.manageTeamMembers);
        }
        if (COLS.ALERT_CONFIG && loginErr.savedCookies) updatePayload[COLS.ALERT_CONFIG] = loginErr.savedCookies;
        await db(TABLE).where(COLS.ID, id).update(updatePayload);
        logger.info("[renew-adobe] Success — đã vào overview, đã cập nhật DB", { id });
        const response = {
          success: true,
          message: "Đăng nhập thành công, đã vào trang overview.",
          org_name: orgName,
          user_count: sd.userCount ?? 0,
          license_status: sd.licenseStatus ?? "unknown",
        };
        if (sd.profileName) response.profile_name = sd.profileName;
        if (sd.manageTeamMembers && Array.isArray(sd.manageTeamMembers)) response.manage_team_members = sd.manageTeamMembers;
        if (sd.adminConsoleUsers && Array.isArray(sd.adminConsoleUsers)) response.admin_console_users = sd.adminConsoleUsers;
        return res.json(response);
      }
      logger.warn("[renew-adobe] Fail — %s", loginErr.message);
      return res.status(400).json({
        success: false,
        message: loginErr.message || "Login thất bại.",
      });
    }
  } catch (err) {
    console.error("[renew-adobe] runCheck lỗi:", err);
    logger.error("[renew-adobe] Run check failed", { id, error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      error: err.message || "Lỗi khi chạy check (Puppeteer/Adobe API).",
    });
  }
};

/**
 * POST /api/renew-adobe/accounts/:id/delete-user
 * Body: { userEmail: "email@example.com" } (bắt buộc). Tùy chọn: { cookiesFile: "path" }.
 * Đăng nhập → Admin Console Users → chọn user theo email → Xóa người dùng → xác nhận.
 */
const runDeleteUser = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID không hợp lệ." });
  }
  const userEmail = (req.body?.userEmail || "").toString().trim();
  if (!userEmail) {
    return res.status(400).json({ error: "Thiếu userEmail trong body (email user cần xóa)." });
  }

  const cookiesFile = req.body?.cookiesFile?.trim();
  const useCookies = !!cookiesFile;

  try {
    const account = await db(TABLE).where(COLS.ID, id).first();
    if (!account) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    }

    const email = account[COLS.EMAIL];
    const password = account[COLS.PASSWORD_ENC] || "";
    if (!useCookies && (!email || !password)) {
      return res.status(400).json({ error: "Thiếu email hoặc password_enc." });
    }

    const mailBackupId = account[COLS.MAIL_BACKUP_ID] != null ? Number(account[COLS.MAIL_BACKUP_ID]) : null;
    logger.info("[renew-adobe] Delete user bắt đầu", { id, userEmail, email: useCookies ? "(cookies)" : email });

    const opts = {
      mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
      deleteUserEmail: userEmail,
      needAccountProfile: false,
    };
    if (useCookies) opts.cookiesFile = cookiesFile;
    if (COLS.ALERT_CONFIG) opts.savedCookiesFromDb = account[COLS.ALERT_CONFIG] ?? null;
    const cookiesPath = getCookiesPathForAccount(id);
    if (cookiesPath) opts.saveCookiesTo = cookiesPath;

    try {
      await getAdobeUserToken(email, password, opts);
    } catch (loginErr) {
      if (loginErr.scrapedData) {
        const sd = loginErr.scrapedData;
        const updatePayload = {
          [COLS.USER_COUNT]: sd.userCount ?? 0,
          [COLS.LAST_CHECKED]: new Date(),
        };
        if (sd.manageTeamMembers && Array.isArray(sd.manageTeamMembers)) {
          updatePayload[COLS.USERS_SNAPSHOT] = JSON.stringify(sd.manageTeamMembers);
        }
        if (COLS.ALERT_CONFIG && loginErr.savedCookies) updatePayload[COLS.ALERT_CONFIG] = loginErr.savedCookies;
        await db(TABLE).where(COLS.ID, id).update(updatePayload);
        logger.info("[renew-adobe] Delete user xong — đã cập nhật DB", { id });
        return res.json({
          success: true,
          message: "Đã xóa user và cập nhật danh sách.",
          user_count: sd.userCount ?? 0,
          manage_team_members: sd.manageTeamMembers || [],
        });
      }
      logger.warn("[renew-adobe] Delete user fail — %s", loginErr.message);
      return res.status(400).json({
        success: false,
        message: loginErr.message || "Đăng nhập hoặc xóa user thất bại.",
      });
    }
  } catch (err) {
    console.error("[renew-adobe] runDeleteUser lỗi:", err);
    logger.error("[renew-adobe] Run delete user failed", { id, error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || "Lỗi khi chạy xóa user.",
    });
  }
};

module.exports = {
  listAccounts,
  lookupAccountByEmail,
  runCheck,
  runCheckWithCookies,
  runDeleteUser,
};
