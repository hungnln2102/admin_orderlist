const { db } = require("../../db");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const logger = require("../../utils/logger");
const { getAdobeUserToken } = require("../../services/adobeCheckService");

const TABLE_DEF = RENEW_ADOBE_SCHEMA.ACCOUNT;
const TABLE = tableName(TABLE_DEF.TABLE, SCHEMA_RENEW_ADOBE);
const COLS = TABLE_DEF.COLS;

/** Các cột cần kiểm tra trống (theo docs/Adobe_Auto_Login (2).md), trừ id */
const CHECK_EMPTY_COLS = [
  COLS.EMAIL,
  COLS.PASSWORD_ENC,
  COLS.ACCESS_TOKEN,
  COLS.TOKEN_EXPIRES,
  COLS.ADOBE_ORG_ID,
  COLS.ORG_NAME,
  COLS.ORG_TYPE,
  COLS.LICENSE_STATUS,
  COLS.LICENSE_DETAIL,
  COLS.USER_COUNT,
  COLS.USERS_SNAPSHOT,
  COLS.ALERT_TARGET,
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
 * Danh sách account từ system_renew_adobe.accounts, kèm kiểm tra cột trống (theo docs/Adobe_Auto_Login (2).md).
 * Mỗi item có thêm empty_fields: string[] (các cột đang trống).
 */
const listAccounts = async (_req, res) => {
  try {
    const rows = await db(TABLE)
      .select(
        `${TABLE}.${COLS.ID}`,
        `${TABLE}.${COLS.EMAIL}`,
        `${TABLE}.${COLS.PASSWORD_ENC}`,
        `${TABLE}.${COLS.ACCESS_TOKEN}`,
        `${TABLE}.${COLS.TOKEN_EXPIRES}`,
        `${TABLE}.${COLS.ADOBE_ORG_ID}`,
        `${TABLE}.${COLS.ORG_NAME}`,
        `${TABLE}.${COLS.ORG_TYPE}`,
        `${TABLE}.${COLS.LICENSE_STATUS}`,
        `${TABLE}.${COLS.LICENSE_DETAIL}`,
        `${TABLE}.${COLS.USER_COUNT}`,
        `${TABLE}.${COLS.USERS_SNAPSHOT}`,
        `${TABLE}.${COLS.ALERT_TARGET}`,
        `${TABLE}.${COLS.LAST_CHECKED}`,
        `${TABLE}.${COLS.IS_ACTIVE}`,
        `${TABLE}.${COLS.CREATED_AT}`
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
 * POST /api/renew-adobe/accounts/:id/check
 * Login Admin Console → chờ trang overview → success (scrape + cập nhật DB) hoặc fail.
 */
const runCheck = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID không hợp lệ." });
  }

  try {
    const account = await db(TABLE).where(COLS.ID, id).first();
    if (!account) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    }

    const email = account[COLS.EMAIL];
    const password = account[COLS.PASSWORD_ENC] || "";
    if (!email || !password) {
      return res.status(400).json({ error: "Thiếu email hoặc password_enc." });
    }

    logger.info("[renew-adobe] Check bắt đầu", { id, email });

    try {
      await getAdobeUserToken(email, password);
    } catch (loginErr) {
      if (loginErr.scrapedData) {
        const sd = loginErr.scrapedData;
        const isSignInPage = /^(Sign\s*in|Log\s*in|Sign\s*out|Đăng\s*nhập)$/i.test(String(sd.orgName || "").trim());
        const orgName = isSignInPage ? null : (sd.orgName ?? null);
        const adobeOrgId = sd.adobe_org_id ?? null;
        const updatePayload = {
          [COLS.ADOBE_ORG_ID]: adobeOrgId,
          [COLS.ORG_NAME]: orgName,
          [COLS.USER_COUNT]: sd.userCount ?? 0,
          [COLS.LICENSE_STATUS]: sd.licenseStatus ?? "unknown",
          [COLS.LAST_CHECKED]: new Date(),
        };
        if (sd.usersSnapshot != null) updatePayload[COLS.USERS_SNAPSHOT] = sd.usersSnapshot;
        await db(TABLE).where(COLS.ID, id).update(updatePayload);
        logger.info("[renew-adobe] Success — đã vào overview, đã cập nhật DB", { id });
        return res.json({
          success: true,
          message: "Đăng nhập thành công, đã vào trang overview.",
          adobe_org_id: adobeOrgId,
          org_name: orgName,
          user_count: sd.userCount ?? 0,
          license_status: sd.licenseStatus ?? "unknown",
        });
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

module.exports = {
  listAccounts,
  runCheck,
};
