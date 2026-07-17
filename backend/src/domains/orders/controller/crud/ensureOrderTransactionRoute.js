const logger = require("@/utils/logger");
const { ensureOrderTransaction } = require("@/domains/orders/use-cases/ensureOrderTransaction");
const { orderIdParam } = require("@/domains/orders/validators/orderValidator");

const attachEnsureOrderTransactionRoute = (router) => {
  router.post("/:id/ensure-transaction", orderIdParam, async (req, res) => {
    try {
      const result = await ensureOrderTransaction({
        orderListId: Number(req.params.id),
      });
      return res.json(result);
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 500;
      if (status >= 500) {
        logger.error("[orders] ensure-transaction failed", {
          orderListId: req.params.id,
          error: error.message,
          stack: error.stack,
        });
      }
      return res.status(status).json({
        error: error?.message || "Không thể tạo mã transaction cho đơn.",
      });
    }
  });
};

module.exports = { attachEnsureOrderTransactionRoute };
