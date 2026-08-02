const logger = require("@/utils/logger");
const yunaOtpService = require("@/services/otp/yunaOtpService");

/**
 * Endpoint tra cứu mã đơn hàng YunaGRP.
 * GET /api/renew-adobe/yuna/order/:orderCode
 */
const getYunaOrderData = async (req, res) => {
  const { orderCode } = req.params;
  if (!orderCode || !String(orderCode).trim()) {
    return res.status(400).json({
      success: false,
      error: "Vui lòng cung cấp mã đơn hàng.",
    });
  }

  try {
    const result = await yunaOtpService.fetchYunaOrder(orderCode);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || "Không lấy được thông tin đơn hàng.",
      });
    }

    const items = (result.items || []).map(item => {
      if (item.report_status === "pending") {
        let emailPart = "";
        if (item.name) {
          const parts = String(item.name).split(/[#|]/);
          emailPart = parts[0].trim();
        }
        return {
          ...item,
          name: emailPart ? `${emailPart}|********` : "********",
          code: null,
          account_user: emailPart,
          account_pass: "********",
        };
      }
      return item;
    });

    return res.json({
      success: true,
      items,
      time_left: result.time_left,
    });
  } catch (error) {
    logger.error("[renew-adobe/yuna] Lỗi tra cứu mã đơn: %s", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Lỗi hệ thống khi tra cứu mã đơn hàng.",
    });
  }
};

/**
 * Endpoint lấy OTP cho một tài khoản cụ thể trong đơn hàng.
 * POST /api/renew-adobe/yuna/order/get-otp
 */
const getSingleAccountOtp = async (req, res) => {
  const { orderCode, email } = req.body;
  if (!orderCode || !email) {
    return res.status(400).json({
      success: false,
      error: "Thiếu thông tin tra cứu (orderCode, email).",
    });
  }

  try {
    const result = await yunaOtpService.fetchYunaOrder(orderCode);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || "Không lấy được thông tin đơn hàng.",
      });
    }

    const items = result.items || [];
    const matchedItem = items.find(item => {
      const [emailPart] = String(item.name || "").trim().split(/[#|]/);
      return emailPart.trim().toLowerCase() === email.trim().toLowerCase();
    });

    if (!matchedItem) {
      return res.status(400).json({
        success: false,
        error: "Tài khoản không thuộc đơn hàng này.",
      });
    }

    if (matchedItem.report_status === "pending") {
      return res.status(400).json({
        success: false,
        error: "Tài khoản này đã được báo lỗi, vui lòng chờ xử lý.",
      });
    }

    const { isSupportedYunaDomain, scrapeYunaOtp } = require("@/services/otp/yunaOtpMailScraper");
    const isSupported = await isSupportedYunaDomain(email);
    if (!isSupported) {
      return res.json({
        success: true,
        code: null,
        message: "Tên miền email không được hỗ trợ cào tự động.",
      });
    }

    const scraped = await scrapeYunaOtp(email);
    return res.json({
      success: true,
      code: scraped || null,
    });
  } catch (error) {
    logger.error("[renew-adobe/yuna] Lỗi lấy OTP đơn lẻ: %s", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Lỗi hệ thống khi lấy OTP tài khoản.",
    });
  }
};

/**
 * Endpoint báo lỗi tài khoản lên YunaGRP.
 * POST /api/renew-adobe/yuna/report-error
 */
const postYunaReportError = async (req, res) => {
  const { orderCode, group, name } = req.body;

  if (!orderCode || !group || !name) {
    return res.status(400).json({
      success: false,
      error: "Thiếu thông tin báo lỗi (orderCode, group, name).",
    });
  }

  try {
    const result = await yunaOtpService.reportYunaError(orderCode, group, name);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || "Không thể gửi báo cáo lỗi lên YunaGRP.",
      });
    }

    return res.json({
      success: true,
      message: result.message || "Gửi báo cáo lỗi thành công.",
    });
  } catch (error) {
    logger.error("[renew-adobe/yuna] Lỗi báo cáo lỗi: %s", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Lỗi hệ thống khi báo lỗi tài khoản.",
    });
  }
};

module.exports = {
  getYunaOrderData,
  getSingleAccountOtp,
  postYunaReportError,
};
