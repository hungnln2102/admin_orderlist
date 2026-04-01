const { db } = require("../../db");
const logger = require("../../utils/logger");
const { TABLE, COLS } = require("./accountTable");
const { findAccountMatchByEmail, normalizeEmail } = require("./accountLookup");

const CHECK_EMPTY_COLS = [
  COLS.EMAIL,
  COLS.PASSWORD_ENC,
  COLS.ORG_NAME,
  COLS.LICENSE_STATUS,
  COLS.USER_COUNT,
  COLS.USERS_SNAPSHOT,
  COLS.LAST_CHECKED,
  COLS.IS_ACTIVE,
  COLS.CREATED_AT,
];

function isValueEmpty(value) {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return String(value).trim() === "";
  }
  if (typeof value === "number") {
    return false;
  }
  if (typeof value === "boolean") {
    return false;
  }
  if (value instanceof Date) {
    return false;
  }
  return true;
}

function getEmptyFields(row) {
  const empty = [];
  for (const col of CHECK_EMPTY_COLS) {
    if (isValueEmpty(row[col])) {
      empty.push(col);
    }
  }
  return empty;
}

const listAccounts = async (_req, res) => {
  try {
    const rows = await db(TABLE)
      .select(
        `${TABLE}.${COLS.ID}`,
        `${TABLE}.${COLS.EMAIL}`,
        `${TABLE}.${COLS.PASSWORD_ENC}`,
        `${TABLE}.${COLS.ORG_NAME}`,
        `${TABLE}.${COLS.LICENSE_STATUS}`,
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
    return res.json(withEmptyCheck);
  } catch (error) {
    logger.error("[renew-adobe] List accounts failed", {
      error: error.message,
    });
    return res
      .status(500)
      .json({ error: "Không thể tải danh sách tài khoản Renew Adobe." });
  }
};

const lookupAccountByEmail = async (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!email) {
    return res.status(400).json({ error: "Thiếu tham số email." });
  }

  try {
    const { account: row } = await findAccountMatchByEmail(email);

    if (!row) {
      return res.status(404).json({
        error: "Không tìm thấy tài khoản với email tương ứng.",
        account: null,
      });
    }

    return res.json({ account: row });
  } catch (error) {
    logger.error("[renew-adobe] Lookup account failed", {
      email,
      error: error.message,
    });
    return res.status(500).json({
      error: "Lỗi tra cứu tài khoản.",
      account: null,
    });
  }
};

const updateUrlAccess = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID không hợp lệ." });
  }

  const urlAccess = (req.body?.url_access ?? "").toString().trim();

  try {
    await db(TABLE)
      .where(COLS.ID, id)
      .update({ [COLS.URL_ACCESS]: urlAccess || null });

    return res.json({ success: true, url_access: urlAccess || null });
  } catch (err) {
    logger.error("[renew-adobe] updateUrlAccess failed", {
      id,
      error: err.message,
    });
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  listAccounts,
  lookupAccountByEmail,
  updateUrlAccess,
};
