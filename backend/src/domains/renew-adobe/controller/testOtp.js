const logger = require("@/utils/logger");
const { fetchOtpBySource } = require("@/services/otpProviderService");

/**
 * Controller cho phép admin chủ động gọi thử nghiệm lấy OTP từ các nguồn khác nhau.
 * Phục vụ cho tab Quản lý hệ thống của trang quản trị Adobe.
 */
const testOtpBySource = async (req, res) => {
  const otpSource = String(req.body?.otpSource || "").trim().toLowerCase();
  const accountEmail = String(req.body?.accountEmail || "").trim().toLowerCase();
  const mailBackupId = req.body?.mailBackupId ? Number(req.body.mailBackupId) : null;
  let yunaOrderCode = String(req.body?.yunaOrderCode || "").trim();

  if (!otpSource) {
    return res.status(400).json({
      success: false,
      error: "Vui lòng chọn nguồn OTP (otpSource).",
    });
  }

  try {
    if (!yunaOrderCode && otpSource === "yuna") {
      const { db } = require("@/db");
      const { RENEW_ADOBE_SCHEMA, SCHEMA_RENEW_ADOBE, tableName } = require("@/config/dbSchema");
      
      const OTP_CFG_TABLE = tableName(
        RENEW_ADOBE_SCHEMA.OTP_CONFIGS.TABLE,
        SCHEMA_RENEW_ADOBE
      );
      const OTP_CFG_COLS = RENEW_ADOBE_SCHEMA.OTP_CONFIGS.COLS;

      const trackTable = tableName(RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.TABLE, SCHEMA_RENEW_ADOBE);
      const trackRow = await db(trackTable)
        .leftJoin({ cfg: OTP_CFG_TABLE }, `cfg.${OTP_CFG_COLS.ID}`, `${trackTable}.${RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.COLS.OTP_CONFIG_ID}`)
        .select(`cfg.${OTP_CFG_COLS.YUNA_ORDER_CODE} as yuna_order_code`)
        .whereRaw(`LOWER(TRIM(COALESCE(??, ''))) = ?`, [`${trackTable}.${RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.COLS.ACCOUNT}`, accountEmail])
        .orderBy(`${trackTable}.${RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.COLS.UPDATED_AT}`, "desc")
        .first()
        .catch(() => null);

      const accTable = tableName(RENEW_ADOBE_SCHEMA.ACCOUNT.TABLE, SCHEMA_RENEW_ADOBE);
      const accountRow = await db(accTable)
        .leftJoin({ cfg: OTP_CFG_TABLE }, `cfg.${OTP_CFG_COLS.ID}`, `${accTable}.${RENEW_ADOBE_SCHEMA.ACCOUNT.COLS.OTP_CONFIG_ID}`)
        .select(`cfg.${OTP_CFG_COLS.YUNA_ORDER_CODE} as yuna_order_code`)
        .whereRaw(`LOWER(TRIM(COALESCE(??, ''))) = ?`, [`${accTable}.${RENEW_ADOBE_SCHEMA.ACCOUNT.COLS.EMAIL}`, accountEmail])
        .first()
        .catch(() => null);

      yunaOrderCode = (trackRow?.yuna_order_code || 
                       accountRow?.yuna_order_code || 
                       "").trim();
    }

    logger.info("[renew-adobe/admin] Gọi thử nghiệm lấy OTP", {
      otpSource,
      accountEmail,
      mailBackupId,
      yunaOrderCode,
    });

    const code = await fetchOtpBySource({
      otpSource,
      accountEmail,
      mailBackupId,
      yunaOrderCode,
    });

    if (!code) {
      return res.status(404).json({
        success: false,
        error: "Chưa nhận được OTP hoặc nguồn này chưa trả về OTP mới. Vui lòng thử lại sau.",
      });
    }

    return res.json({
      success: true,
      otp: code,
    });
  } catch (error) {
    logger.error("[renew-adobe/admin] Lỗi lấy OTP thử nghiệm", {
      otpSource,
      accountEmail,
      error: error?.message,
    });
    return res.status(500).json({
      success: false,
      error: error?.message || "Lỗi hệ thống khi lấy OTP.",
    });
  }
};

module.exports = {
  testOtpBySource,
};
