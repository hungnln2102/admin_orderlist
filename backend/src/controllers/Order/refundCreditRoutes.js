const { db } = require("../../db");
const { TABLES, STATUS } = require("./constants");
const { orderIdParam } = require("../../validators/orderValidator");
const logger = require("../../utils/logger");
const {
    createOrGetRefundCreditNoteForOrder,
    getLatestRefundCreditNoteBySourceOrder,
    normalizeMoney,
} = require("./finance/refundCredits");
const { generateUniqueOrderCode, VALID_PREFIXES } = require("../../services/orderCodeService");
const { ORDER_PREFIXES } = require("../../utils/orderHelpers");

const detectPreviewPrefix = (orderCodeRaw) => {
    const normalized = String(orderCodeRaw || "").trim().toUpperCase();
    if (!normalized) return ORDER_PREFIXES.customer || "MAVL";
    return VALID_PREFIXES.find((prefix) => normalized.startsWith(prefix))
        || ORDER_PREFIXES.customer
        || "MAVL";
};

const attachRefundCreditRoutes = (router) => {
    router.post("/canceled/:id/refund-credit/ensure", ...orderIdParam, async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ error: "ID đơn không hợp lệ." });
        }

        const trx = await db.transaction();
        try {
            const order = await trx(TABLES.orderList)
                .where({ id })
                .first();

            if (!order) {
                await trx.rollback();
                return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
            }

            const orderStatus = String(order.status || "").trim();
            const allowedStatuses = [STATUS.PENDING_REFUND, STATUS.REFUNDED];
            if (!allowedStatuses.includes(orderStatus)) {
                await trx.rollback();
                return res.status(400).json({
                    error: "Chỉ đơn Chưa Hoàn/Đã Hoàn mới có thể tạo credit bù đơn.",
                });
            }

            const refundAmount = normalizeMoney(order.refund);
            if (refundAmount <= 0) {
                await trx.rollback();
                return res.status(400).json({
                    error: "Đơn không có số tiền hoàn hợp lệ để tạo credit.",
                });
            }

            let creditNote = await getLatestRefundCreditNoteBySourceOrder(trx, id);
            if (!creditNote) {
                creditNote = await createOrGetRefundCreditNoteForOrder(trx, {
                    sourceOrderListId: id,
                    sourceOrderCode: order.id_order,
                    customerName: order.customer,
                    customerContact: order.contact,
                    refundAmount,
                    note: `Tạo từ thao tác bù đơn cho đơn ${order.id_order || id}`,
                });
            }

            const previewPrefix = detectPreviewPrefix(order.id_order);
            const previewOrderCode = await generateUniqueOrderCode(previewPrefix, trx);

            await trx.commit();
            return res.json({
                success: true,
                credit_note: creditNote,
                preview_order_code: previewOrderCode,
            });
        } catch (error) {
            await trx.rollback();
            logger.error("Lỗi ensure refund credit note", {
                id,
                error: error.message,
                stack: error.stack,
            });
            return res.status(500).json({ error: "Không thể khởi tạo credit bù đơn." });
        }
    });
};

module.exports = { attachRefundCreditRoutes };

