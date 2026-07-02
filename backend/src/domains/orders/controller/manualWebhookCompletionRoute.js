const { completeProcessingOrderWithManualWebhook } = require("./manualWebhookCompletion");

const attachManualWebhookCompletionRoute = (router) => {
  router.post("/:id/complete-manual-webhook", async (req, res) => {
    const result = await completeProcessingOrderWithManualWebhook(req.params.id, req.body || {});
    if (result.status >= 200 && result.status < 300) {
      const { writeUserEventLog } = require("../../renew-adobe/services/systemEventLogService");
      writeUserEventLog(req, {
        action: "Hoàn thành webhook thủ công",
        entity: "Đơn hàng",
        entityId: req.params.id,
        message: `Hoàn thành webhook thủ công cho đơn ${req.params.id}`,
        source: "orders.order_list",
        metadata: {
          orderId: Number(req.params.id),
          body: result.body || null,
        },
      });
    }
    return res.status(result.status).json(result.body);
  });
};

module.exports = { attachManualWebhookCompletionRoute };

