const { db } = require("../../../db");
const { TABLES, STATUS } = require("../constants");
const { normalizeOrderRow } = require("../helpers");
const { ORDERS_SCHEMA } = require("../../../config/dbSchema");
const { deleteOrderWithArchive } = require("../orderDeletionService");
const { todayYMDInVietnam } = require("../../../utils/normalizers");
const logger = require("../../../utils/logger");

const { orderIdParam } = require("../../../validators/orderValidator");

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
                currentStatus === STATUS.EXPIRED
            ) {
                await trx.rollback();
                return res.status(400).json({
                    error:
                        "Đơn Hết Hạn/Chờ Hoàn/Đã Hoàn không dùng lại thao tác xóa này.",
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

            res.json(result);
        } catch (error) {
            await trx.rollback();
            logger.error("Lỗi xóa đơn hàng", { id, error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể xóa đơn hàng." });
        }
    });
};

module.exports = { attachDeleteOrderRoute };
