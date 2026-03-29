const { db } = require("../../../db");
const { TABLES, STATUS } = require("../constants");
const { normalizeOrderRow } = require("../helpers");
const { adjustSupplierDebtIfNeeded, calcRemainingRefund } = require("../orderFinanceHelpers");
const { todayYMDInVietnam } = require("../../../utils/normalizers");
const { ORDERS_SCHEMA } = require("../../../config/dbSchema");
const { nextId } = require("../../../services/idService");
const { deleteOrderWithArchive } = require("../orderDeletionService");
const logger = require("../../../utils/logger");

const attachDeleteOrderRoute = (router) => {
    router.delete("/:id", async (req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "ID không hợp lệ." });

        const trx = await db.transaction();
        try {
            const order = await trx(TABLES.orderList).where({ id }).first();
            if (!order) {
                await trx.rollback();
                return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
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
                    nextId,
                    adjustSupplierDebtIfNeeded,
                    calcRemainingRefund,
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
