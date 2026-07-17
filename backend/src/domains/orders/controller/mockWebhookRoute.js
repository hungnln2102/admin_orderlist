const { ORDER_COLS, ORDER_TABLE, pool } = require("../../../../webhook/sepay/config");
const { parseWebhookTransaction } = require("../../../../webhook/sepay/routes/webhook/parsePhase");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const logger = require("@/utils/logger");

const attachMockWebhookRoute = (router) => {
  router.post("/:id/mock-sepay-webhook", async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      if (!orderId || isNaN(orderId)) {
        return res.status(400).json({ error: "ID không hợp lệ" });
      }

      const { rows } = await pool.query(
        `SELECT ${ORDER_COLS.idOrder}, ${ORDER_COLS.price} FROM ${ORDER_TABLE} WHERE ${ORDER_COLS.id} = $1`,
        [orderId]
      );
      if (!rows.length) return res.status(404).json({ error: "Không tìm thấy đơn hàng" });

      const orderCode = String(rows[0][ORDER_COLS.idOrder]).trim();
      const price = Number(rows[0][ORDER_COLS.price]) || 0;

      const mockPayload = {
        gateway: "Mock_Sepay",
        transactionDate: new Date().toISOString(),
        accountNumber: "MOCK123456",
        subAccount: null,
        transferType: "in",
        transferAmount: price,
        accumulated: price * 10,
        code: "MOCK" + Date.now(),
        transactionContent: orderCode, // This matches the order code
        referenceNumber: "REF" + Date.now(),
        body: "Mock from Admin UI",
      };

      const parsed = parseWebhookTransaction(mockPayload);
      if (!parsed?.transaction) {
        return res.status(400).json({ error: "Payload giả lập webhook không hợp lệ" });
      }

      eventBus.emit(EVENTS.SEPAY_WEBHOOK_RECEIVED, {
        reqBody: mockPayload,
        parsed,
      });

      logger.info(`[MockWebhook] Queued mock webhook for ${orderCode}`, {
        orderCode,
        transferAmount: price,
      });

      return res.status(200).json({
        success: true,
        message: "Đã đưa webhook giả lập vào hàng đợi xử lý",
        webhookResponse: { message: "Webhook accepted and queued for processing" },
      });
    } catch (error) {
      logger.error("[MockWebhook] Error simulating webhook", { error: error.message });
      return res.status(500).json({ error: "Lỗi giả lập webhook: " + (error.response?.data?.error || error.message) });
    }
  });
};

module.exports = { attachMockWebhookRoute };
