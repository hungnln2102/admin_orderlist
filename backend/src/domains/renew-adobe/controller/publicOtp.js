const { db } = require("@/db");
const logger = require("@/utils/logger");
const { normalizeEmail } = require("@/domains/renew-adobe/helpers/email");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("@/config/dbSchema");
const { fetchOtpBySource } = require("@/services/otpProviderService");

const TRACK_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.TABLE,
  SCHEMA_RENEW_ADOBE
);
const TRACK_COLS = RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.COLS;

const ACCOUNT_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.ACCOUNT.TABLE,
  SCHEMA_RENEW_ADOBE
);
const ACCOUNT_COLS = RENEW_ADOBE_SCHEMA.ACCOUNT.COLS;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const publicGetOtp = async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: "Email không hợp lệ." });
  }

  try {
    // 1. Tìm tracking row để xác định otp_source hoặc system_note
    const trackRow = await db(TRACK_TABLE)
      .select(TRACK_COLS.OTP_SOURCE, TRACK_COLS.SYSTEM_NOTE)
      .whereRaw(`LOWER(TRIM(COALESCE(??, ''))) = ?`, [TRACK_COLS.ACCOUNT, email])
      .orderBy(TRACK_COLS.UPDATED_AT, "desc")
      .first();

    if (!trackRow) {
      return res.status(404).json({
        ok: false,
        error: "Email không có trong hệ thống. Vui lòng kiểm tra lại.",
      });
    }

    // 2. Tìm mailBackupId từ accounts_admin (nếu dùng imap)
    const accountRow = await db(ACCOUNT_TABLE)
      .select(ACCOUNT_COLS.MAIL_BACKUP_ID)
      .whereRaw(`LOWER(TRIM(COALESCE(??, ''))) = ?`, [ACCOUNT_COLS.EMAIL, email])
      .first();

    let otpSource = String(trackRow[TRACK_COLS.OTP_SOURCE] || "").trim().toLowerCase();
    const systemNote = String(trackRow[TRACK_COLS.SYSTEM_NOTE] || "").trim().toLowerCase();

    // Fallback logic
    if (!otpSource) {
      if (systemNote === "fix_ades") {
        otpSource = "ades";
      } else {
        otpSource = "hdsd";
      }
    }

    const mailBackupId = accountRow?.[ACCOUNT_COLS.MAIL_BACKUP_ID] || null;

    // 3. Gọi service lấy OTP
    const code = await fetchOtpBySource({
      otpSource,
      accountEmail: email,
      mailBackupId,
    });

    if (!code) {
      return res.status(404).json({
        ok: false,
        error: "Chưa lấy được OTP. Vui lòng thử lại sau vài giây.",
      });
    }

    return res.json({
      ok: true,
      data: {
        otp: {
          code,
          service: otpSource,
        },
      },
    });
  } catch (error) {
    logger.error("[renew-adobe/public] get-otp failed", {
      email,
      error: error?.message,
    });
    return res.status(500).json({
      ok: false,
      error: "Không gọi được API lấy OTP lúc này.",
    });
  }
};

module.exports = {
  publicGetOtp,
};
