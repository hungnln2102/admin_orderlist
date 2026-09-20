const { processPaymentWebhook } = require("../services/webhookPaymentService");

/**
 * Controller xử lý Webhook SePay / Ngân hàng
 */
async function handlePaymentWebhook(req, res) {
  try {
    const payload = req.body || {};
    console.log("📥 [Webhook Router] Nhận payload Webhook thanh toán:", JSON.stringify(payload));

    const result = await processPaymentWebhook(payload);
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ [Webhook Router] Lỗi xử lý Webhook:", error.message);
    return res.status(500).json({
      success: false,
      error: "System Error processing webhook",
      message: error.message,
    });
  }
}

module.exports = {
  handlePaymentWebhook,
};
