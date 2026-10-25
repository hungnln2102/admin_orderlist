const { handleIncomingWebhook } = require("../services/webhookService");
const { getClientErrorMessage } = require("@/utils/clientError");

/**
 * Controller tiếp nhận webhook từ SePay hoặc các ngân hàng
 */
async function handleSePayWebhook(req, res) {
  try {
    const payload = req.body || {};
    const result = await handleIncomingWebhook(payload);

    if (!result.payment.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid webhook payload",
        message: result.payment.reason || "Webhook payment could not be processed.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Webhook received successfully as ${result.eventType}`,
      eventType: result.eventType,
      amount: result.data.amount,
      duplicate: Boolean(result.payment?.duplicate),
    });
  } catch (err) {
    console.error("❌ [WebhookController] Lỗi xử lý webhook:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: getClientErrorMessage(err, "Không thể xử lý webhook, vui lòng thử lại sau."),
    });
  }
}

module.exports = {
  handleSePayWebhook,
};
