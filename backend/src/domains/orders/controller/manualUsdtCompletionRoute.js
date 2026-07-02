const { completeProcessingOrderWithManualUsdt } = require("./manualUsdtCompletion");

const attachManualUsdtCompletionRoute = (router) => {
  router.post("/:id/complete-manual-usdt", async (req, res) => {
    const result = await completeProcessingOrderWithManualUsdt(req.params.id, req.body || {});
    if (result.status >= 200 && result.status < 300) {
      const { writeUserEventLog } = require("../../renew-adobe/services/systemEventLogService");
      writeUserEventLog(req, {
        action: "Xac nhan thanh toan USDT thu cong",
        entity: "Don hang",
        entityId: req.params.id,
        message: `Xac nhan thanh toan USDT thu cong cho đơn ${req.params.id}`,
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

module.exports = { attachManualUsdtCompletionRoute };

