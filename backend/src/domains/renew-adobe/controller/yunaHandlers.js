const logger = require("@/utils/logger");
const yunaOtpService = require("@/services/yunaOtpService");

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

    const { isSlueOrKaine, isRilzz, isHotmailOrOutlook, scrapeYunaOtp } = require("@/services/yunaOtpMailScraper");

    const enrichedItems = await Promise.all(
      (result.items || []).map(async (item) => {
        const [emailPart] = String(item.name || "").trim().split(/[#|]/);
        const email = emailPart.trim();

        const hasCode = item.code && /\b\d{6}\b/.test(String(item.code));
        if (!hasCode && (isSlueOrKaine(email) || isRilzz(email) || isHotmailOrOutlook(email))) {
          try {
            const scraped = await scrapeYunaOtp(email);
            if (scraped) {
              return {
                ...item,
                code: scraped,
              };
            }
          } catch (err) {
            logger.warn(`[yuna-handler] Lỗi khi cào OTP tự động cho ${email}: ${err.message}`);
          }
        }
        return item;
      })
    );

    return res.json({
      success: true,
      items: enrichedItems,
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
  postYunaReportError,
};
