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

  if (!otpSource) {
    return res.status(400).json({
      success: false,
      error: "Vui lòng chọn nguồn OTP (otpSource).",
    });
  }

  try {
    logger.info("[renew-adobe/admin] Gọi thử nghiệm lấy OTP", {
      otpSource,
      accountEmail,
      mailBackupId,
    });

    const code = await fetchOtpBySource({
      otpSource,
      accountEmail,
      mailBackupId,
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
