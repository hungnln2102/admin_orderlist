const { db } = require("../../db");
const { TABLES, STATUS, COLS } = require("./constants");
const { orderIdParam } = require("../../validators/orderValidator");
const logger = require("../../utils/logger");
const {
    createOrGetRefundCreditNoteForOrder,
    getLatestRefundCreditNoteBySourceOrder,
    normalizeMoney,
    CREDIT_STATUS,
    REFUND_CREDIT_NOTES_TABLE,
    REFUND_CREDIT_NOTE_COLS: RCN,
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
    /**
     * GET /api/orders/refund-credits/available
     * Phiếu credit **khả dụng** cho form tạo đơn: còn số dư, trạng thái OPEN/PARTIALLY_APPLIED,
     * không bị tuyến thay thế (succeeded_by), và nếu gắn đơn nguồn thì đơn nguồn vẫn ở trạng thái hoàn.
     */
    router.get("/refund-credits/available", async (req, res) => {
        try {
            const orderIdCol = COLS.ORDER.ID;
            const orderStatusCol = COLS.ORDER.STATUS;
            const orderTable = TABLES.orderList;
            const rcn = REFUND_CREDIT_NOTES_TABLE;

            const rows = await db(`${rcn} as rcn_row`)
                .leftJoin(
                    `${orderTable} as src_order`,
                    `src_order.${orderIdCol}`,
                    `rcn_row.${RCN.SOURCE_ORDER_LIST_ID}`
                )
                .where(`rcn_row.${RCN.AVAILABLE_AMOUNT}`, ">", 0)
                .whereIn(`rcn_row.${RCN.STATUS}`, [
                    CREDIT_STATUS.OPEN,
                    CREDIT_STATUS.PARTIALLY_APPLIED,
                ])
                .whereNull(`rcn_row.${RCN.SUCCEEDED_BY_NOTE_ID}`)
                .where((qb) => {
                    qb.whereNull(`rcn_row.${RCN.SOURCE_ORDER_LIST_ID}`).orWhereIn(
                        `src_order.${orderStatusCol}`,
                        [STATUS.PENDING_REFUND, STATUS.REFUNDED]
                    );
                })
                .orderBy(`rcn_row.${RCN.ID}`, "desc")
                .select(
                    `rcn_row.${RCN.ID} as ${RCN.ID}`,
                    `rcn_row.${RCN.CREDIT_CODE} as ${RCN.CREDIT_CODE}`,
                    `rcn_row.${RCN.CUSTOMER_NAME} as ${RCN.CUSTOMER_NAME}`,
                    `rcn_row.${RCN.CUSTOMER_CONTACT} as ${RCN.CUSTOMER_CONTACT}`,
                    `rcn_row.${RCN.AVAILABLE_AMOUNT} as ${RCN.AVAILABLE_AMOUNT}`,
                    `rcn_row.${RCN.REFUND_AMOUNT} as ${RCN.REFUND_AMOUNT}`,
                    `rcn_row.${RCN.SOURCE_ORDER_CODE} as ${RCN.SOURCE_ORDER_CODE}`,
                    `rcn_row.${RCN.SOURCE_ORDER_LIST_ID} as ${RCN.SOURCE_ORDER_LIST_ID}`,
                    `rcn_row.${RCN.STATUS} as ${RCN.STATUS}`
                );
            return res.json({ data: rows });
        } catch (error) {
            logger.error("List available refund credit notes failed", { error: error.message });
            return res.status(500).json({ error: "Không tải được danh sách credit." });
        }
    });

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

