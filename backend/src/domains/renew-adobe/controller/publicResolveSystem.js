/**
 * Public endpoint cho Website storefront — lookup `order_user_tracking.system_note`
 * theo email, để frontend biết cần gọi API hệ thống nào (renew_adobe / fix_adobe_edu / fix_ades).
 *
 * Email không có trong tracking → 404 (đúng yêu cầu: chỉ phục vụ user đã mua gói).
 */

const { db } = require("../../../db");
const logger = require("../../../utils/logger");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("../../../config/dbSchema");
const {
  DEFAULT_ADOBE_SYSTEM_CODE,
  ALLOWED_ADOBE_SYSTEM_CODES,
} = require("../../../services/renew-adobe/adobeSystemConstants");

const TRACK_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.TABLE,
  SCHEMA_RENEW_ADOBE
);
const TRACK_COLS = RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.COLS;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

const resolveSystemByEmail = async (req, res) => {
  const email = normalizeEmail(req.query?.email);
  if (!email || !EMAIL_RE.test(email)) {
    return res
      .status(400)
      .json({ ok: false, error: "Email không hợp lệ." });
  }

  try {
    const row = await db(TRACK_TABLE)
      .select(
        TRACK_COLS.SYSTEM_NOTE,
        TRACK_COLS.ORDER_ID,
        TRACK_COLS.UPDATED_AT
      )
      .whereRaw(`LOWER(TRIM(COALESCE(??, ''))) = ?`, [
        TRACK_COLS.ACCOUNT,
        email,
      ])
      .orderBy(TRACK_COLS.UPDATED_AT, "desc")
      .first();

    if (!row) {
      return res.status(404).json({
        ok: false,
        error: "Email không có trong hệ thống. Vui lòng kiểm tra lại hoặc đặt gói trước.",
      });
    }

    const code = String(row[TRACK_COLS.SYSTEM_NOTE] || "").toLowerCase();
    const systemNote = ALLOWED_ADOBE_SYSTEM_CODES.has(code)
      ? code
      : DEFAULT_ADOBE_SYSTEM_CODE;

    return res.json({
      ok: true,
      email,
      system_note: systemNote,
      order_id: row[TRACK_COLS.ORDER_ID] || null,
    });
  } catch (error) {
    logger.error("[renew-adobe/public] resolve-system failed", {
      email,
      error: error?.message,
    });
    return res.status(500).json({
      ok: false,
      error: "Không kiểm tra được hệ thống cho email này lúc này.",
    });
  }
};

module.exports = {
  resolveSystemByEmail,
};
