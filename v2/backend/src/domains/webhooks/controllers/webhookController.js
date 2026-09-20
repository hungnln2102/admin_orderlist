const { handleIncomingWebhook } = require("../services/webhookService");

/**
 * Controller tiếp nhận webhook từ SePay hoặc các ngân hàng
 */
async function handleSePayWebhook(req, res) {
  try {
    const payload = req.body || {};
    const result = await handleIncomingWebhook(payload);

    return res.status(200).json({
      success: true,
      message: `Webhook received successfully as ${result.eventType}`,
      eventType: result.eventType,
      amount: result.data.amount,
    });
  } catch (err) {
    console.error("❌ [WebhookController] Lỗi xử lý webhook:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: err.message,
    });
  }
}

module.exports = {
  handleSePayWebhook,
};
