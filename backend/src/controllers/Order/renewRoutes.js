const sepayWebhookApp = require("../../../webhook/sepay_webhook");
const { db } = require("../../db");
const { TABLES, STATUS } = require("./constants");
const logger = require("../../utils/logger");

const attachRenewRoutes = (router) => {
    // POST /renew
    router.post("/:orderCode/renew", async(req, res) => {
        const { orderCode } = req.params;
        const forceRenewal = req.body?.forceRenewal ?? req.body?.force ?? true;

        if (!orderCode) return res.status(400).json({ error: "Thiếu mã đơn hàng." });

        try {
            const result = await sepayWebhookApp.runRenewal(orderCode, { forceRenewal });
            if (result?.success) {
                if (typeof sepayWebhookApp.sendRenewalNotification === "function") {
                    sepayWebhookApp.sendRenewalNotification(orderCode, result).catch((err) => logger.error("sendRenewalNotification failed", { orderCode, error: err?.message }));
                }
                return res.json(result);
            }
            const status = result?.processType === "skipped" ? 409 : 400;
            return res.status(status).json({ error: result?.details || "Gia hạn thất bại", result });
        } catch (error) {
            logger.error("Lỗi gia hạn đơn hàng", { orderCode, error: error.message, stack: error.stack });
            return res.status(500).json({ error: "Không thể gia hạn đơn hàng." });
        }
    });

    // PATCH /refund
    router.patch("/canceled/:id/refund", async(req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "ID không hợp lệ" });

        try {
            const [updated] = await db(TABLES.orderCanceled)
                .where({ id })
                .update({ status: STATUS.REFUNDED })
                .returning(["id", "id_order", "status"]);

            if (!updated) return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
            res.json({ success: true, ...updated });
        } catch (error) {
            logger.error("Lỗi hoàn tiền", { id, error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể đánh dấu hoàn tiền." });
        }
    });
};

module.exports = { attachRenewRoutes };
