const sepayWebhookApp = require("../../../webhook/sepay_webhook");
const { db } = require("../../db");
const { TABLES, STATUS } = require("./constants");

const attachRenewRoutes = (router) => {
    // POST /renew
    router.post("/:orderCode/renew", async(req, res) => {
        const { orderCode } = req.params;
        const forceRenewal = req.body?.forceRenewal ?? req.body?.force ?? true;

        if (!orderCode) return res.status(400).json({ error: "Missing order code." });

        try {
            const result = await sepayWebhookApp.runRenewal(orderCode, { forceRenewal });
            if (result?.success) {
                if (typeof sepayWebhookApp.sendRenewalNotification === "function") {
                    sepayWebhookApp.sendRenewalNotification(orderCode, result).catch(console.error);
                }
                return res.json(result);
            }
            const status = result?.processType === "skipped" ? 409 : 400;
            return res.status(status).json({ error: result?.details || "Renewal failed", result });
        } catch (error) {
            console.error(`Renewal error (${orderCode}):`, error);
            return res.status(500).json({ error: "Unable to renew order." });
        }
    });

    // PATCH /refund
    router.patch("/canceled/:id/refund", async(req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "Invalid ID" });

        try {
            const [updated] = await db(TABLES.orderCanceled)
                .where({ id })
                .update({ status: STATUS.REFUNDED, check_flag: false })
                .returning(["id", "id_order", "status", "check_flag"]);

            if (!updated) return res.status(404).json({ error: "Order not found" });
            res.json({ success: true, ...updated });
        } catch (error) {
            console.error("Refund error:", error);
            res.status(500).json({ error: "Unable to mark refunded." });
        }
    });
};

module.exports = { attachRenewRoutes };
