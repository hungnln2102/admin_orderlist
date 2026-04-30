const sepayWebhookApp = require("../../../webhook/sepay_webhook");
const { db } = require("../../db");
const { TABLES, STATUS } = require("./constants");
const logger = require("../../utils/logger");
const { orderCodeParam, orderIdParam } = require("../../validators/orderValidator");
const { voidOpenRefundCreditNotesForSourceOrder } = require("./finance/refundCredits");

const attachRenewRoutes = (router) => {
    router.post("/:orderCode/renew", ...orderCodeParam, async(req, res) => {
        const { orderCode } = req.params;
        const forceRenewal = req.body?.forceRenewal ?? req.body?.force ?? true;

        try {
            const result = await sepayWebhookApp.runRenewal(orderCode, {
                forceRenewal,
                source: "manual",
            });
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

    router.patch("/canceled/:id/refund", ...orderIdParam, async(req, res) => {
        const id = Number(req.params.id);

        const { ORDERS_SCHEMA } = require("../../config/dbSchema");
        const statusCol = ORDERS_SCHEMA.ORDER_LIST.COLS.STATUS;
        const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;
        const informationOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.INFORMATION_ORDER;
        const buildRefundReferenceCode = (orderCodeRaw) => {
            const normalizedCode = String(orderCodeRaw || "").trim();
            return normalizedCode ? `RF ${normalizedCode}` : "RF";
        };

        try {
            const currentOrder = await db(TABLES.orderList)
                .select("id", idOrderCol, informationOrderCol, statusCol)
                .where({ id })
                .first();
            if (!currentOrder) {
                return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
            }

            const refundReferenceCode = buildRefundReferenceCode(
                currentOrder?.[idOrderCol] ?? currentOrder?.id_order
            );

            const trx = await db.transaction();
            try {
                const [updated] = await trx(TABLES.orderList)
                    .where({ id })
                    .whereIn(statusCol, [STATUS.PENDING_REFUND])
                    .update({
                        [statusCol]: STATUS.REFUNDED,
                    })
                    .returning(["id", idOrderCol, informationOrderCol, statusCol]);

                if (!updated) {
                    await trx.rollback();
                    return res.status(404).json({ error: "Không tìm thấy đơn hàng hoặc đã hoàn tiền" });
                }

                const { voided } = await voidOpenRefundCreditNotesForSourceOrder(
                    trx,
                    id,
                    `Xác nhận hoàn CK (${refundReferenceCode}) — hủy credit còn lại.`
                );

                await trx.commit();
                return res.json({ success: true, refundReferenceCode, voided_credit_notes: voided, ...updated });
            } catch (inner) {
                await trx.rollback();
                throw inner;
            }
        } catch (error) {
            logger.error("Lỗi hoàn tiền", { id, error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể đánh dấu hoàn tiền." });
        }
    });
};

module.exports = { attachRenewRoutes };
