const { db } = require("../../../../db");
const { TABLES, STATUS } = require("../constants");
const { normalizeOrderRow } = require("../helpers");
const { ORDERS_SCHEMA } = require("../../../../config/dbSchema");
const { deleteOrderWithArchive } = require("../orderDeletionService");
const { todayYMDInVietnam } = require("../../../../utils/normalizers");
const logger = require("../../../../utils/logger");
const { writeUserEventLog } = require("../../../renew-adobe/services/systemEventLogService");

const { orderIdParam } = require("../../validators/orderValidator");

const attachDeleteOrderRoute = (router) => {
    router.delete("/:id", ...orderIdParam, async (req, res) => {
        const id = Number(req.params.id);

        const trx = await db.transaction();
        try {
            const order = await trx(TABLES.orderList).where({ id }).first();
            if (!order) {
                await trx.rollback();
                return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
            }

            const statusCol = ORDERS_SCHEMA.ORDER_LIST.COLS.STATUS;
            const currentStatus = String(order[statusCol] ?? order.status ?? "").trim();
            if (
                currentStatus === STATUS.PENDING_REFUND ||
                currentStatus === STATUS.REFUNDED ||
                currentStatus === STATUS.CREDIT_CONVERTED ||
                currentStatus === STATUS.EXPIRED
            ) {
                await trx.rollback();
                return res.status(400).json({
                    error:
                        "Đơn Hết Hạn/Chờ Hoàn/Đã Hoàn/Chuyển đổi credit không dùng lại thao tác xóa này.",
                });
            }

            const normalized = normalizeOrderRow(order, todayYMDInVietnam());

            const result = await deleteOrderWithArchive({
                trx,
                order,
                normalized,
                reqBody: req.body,
                helpers: {
                    TABLES,
                    ORDERS_SCHEMA,
                    STATUS,
                },
            });

            writeUserEventLog(req, {
                action: "Xóa đơn hàng",
                entity: "Đơn hàng",
                entityId: normalized?.id_order || id,
                message: `Xóa đơn hàng ${normalized?.id_order || id}`,
                source: "orders.order_list",
                metadata: {
                    orderId: id,
                    orderCode: normalized?.id_order || null,
                    status: currentStatus || null,
                },
            });

            res.json(result);
        } catch (error) {
            await trx.rollback();
            logger.error("Lỗi xóa đơn hàng", { id, error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể xóa đơn hàng." });
        }
    });
};

module.exports = { attachDeleteOrderRoute };
