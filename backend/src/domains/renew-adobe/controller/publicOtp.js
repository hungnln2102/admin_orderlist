const { db } = require("@/db");
const logger = require("@/utils/logger");
const { normalizeEmail } = require("@/domains/renew-adobe/helpers/email");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("@/config/dbSchema");
const { fetchOtpBySource } = require("@/services/otp/otpProviderService");

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

const OTP_CFG_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.OTP_CONFIGS.TABLE,
  SCHEMA_RENEW_ADOBE
);
const OTP_CFG_COLS = RENEW_ADOBE_SCHEMA.OTP_CONFIGS.COLS;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const publicGetOtp = async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: "Email không hợp lệ." });
  }

  try {
    // 1. Tìm tracking row để xác định otp_source hoặc system_note
    const trackRow = await db(TRACK_TABLE)
      .leftJoin({ cfg: OTP_CFG_TABLE }, `cfg.${OTP_CFG_COLS.ID}`, `${TRACK_TABLE}.${TRACK_COLS.OTP_CONFIG_ID}`)
      .select(
        `${TRACK_TABLE}.${TRACK_COLS.SYSTEM_NOTE}`,
        `cfg.${OTP_CFG_COLS.OTP_SOURCE} as otp_source`,
        `cfg.${OTP_CFG_COLS.YUNA_ORDER_CODE} as yuna_order_code`
      )
      .whereRaw(`LOWER(TRIM(COALESCE(??, ''))) = ?`, [`${TRACK_TABLE}.${TRACK_COLS.ACCOUNT}`, email])
      .orderBy(`${TRACK_TABLE}.${TRACK_COLS.UPDATED_AT}`, "desc")
      .first();

    if (!trackRow) {
      return res.status(404).json({
        ok: false,
        error: "Email không có trong hệ thống. Vui lòng kiểm tra lại.",
      });
    }

    // 2. Tìm mailBackupId từ accounts_admin (nếu dùng imap)
    const accountRow = await db(ACCOUNT_TABLE)
      .leftJoin({ cfg: OTP_CFG_TABLE }, `cfg.${OTP_CFG_COLS.ID}`, `${ACCOUNT_TABLE}.${ACCOUNT_COLS.OTP_CONFIG_ID}`)
      .select(
        `cfg.${OTP_CFG_COLS.MAIL_BACKUP_ID} as mail_backup_id`,
        `cfg.${OTP_CFG_COLS.YUNA_ORDER_CODE} as yuna_order_code`
      )
      .whereRaw(`LOWER(TRIM(COALESCE(??, ''))) = ?`, [`${ACCOUNT_TABLE}.${ACCOUNT_COLS.EMAIL}`, email])
      .first();

    let otpSource = String(trackRow.otp_source || "").trim().toLowerCase();
    const systemNote = String(trackRow[TRACK_COLS.SYSTEM_NOTE] || "").trim().toLowerCase();

    // Fallback logic
    if (!otpSource) {
      if (systemNote === "fix_ades") {
        otpSource = "ades";
      } else {
        otpSource = "hdsd";
      }
    }

    const mailBackupId = accountRow?.mail_backup_id || null;
    const yunaOrderCode = trackRow?.yuna_order_code || accountRow?.yuna_order_code || null;

    // 3. Gọi service lấy OTP
    const code = await fetchOtpBySource({
      otpSource,
      accountEmail: email,
      mailBackupId,
      yunaOrderCode,
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
