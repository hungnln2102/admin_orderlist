const { completeProcessingOrderWithManualWebhook } = require("./manualWebhookCompletion");

const attachManualWebhookCompletionRoute = (router) => {
  router.post("/:id/complete-manual-webhook", async (req, res) => {
    const result = await completeProcessingOrderWithManualWebhook(req.params.id, req.body || {});
    if (result.status >= 200 && result.status < 300) {
      const { writeUserEventLog } = require("../../renew-adobe/services/systemEventLogService");
      writeUserEventLog(req, {
        action: "HoÃ n thÃ nh webhook thá»§ cÃ´ng",
        entity: "ÄÆ¡n hÃ ng",
        entityId: req.params.id,
        message: `HoÃ n thÃ nh webhook thá»§ cÃ´ng cho Ä‘Æ¡n ${req.params.id}`,
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

