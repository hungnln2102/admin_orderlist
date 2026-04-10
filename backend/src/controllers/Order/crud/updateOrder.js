const { db } = require("../../../db");
const { TABLES, STATUS } = require("../constants");
const {
    normalizeOrderRow,
    sanitizeOrderWritePayload,
    ensureSupplyRecord,
    resolveProductToVariantId,
    normalizeTextInput,
} = require("../helpers");
const { todayYMDInVietnam } = require("../../../utils/normalizers");
const { updateOrderWithFinance } = require("../orderUpdateService");
const logger = require("../../../utils/logger");
const { orderIdParam } = require("../../../validators/orderValidator");

const attachUpdateOrderRoute = (router) => {
    router.put("/:id", ...orderIdParam, async (req, res) => {
        const id = Number(req.params.id);

        const trx = await db.transaction();
        try {
            const { updated, error, notFound } = await updateOrderWithFinance({
                trx,
                id,
                payload: req.body,
                helpers: {
                    TABLES,
                    STATUS,
                    sanitizeOrderWritePayload,
                    normalizeOrderRow,
                    todayYMDInVietnam,
                    ensureSupplyRecord,
                    normalizeTextInput,
                    resolveProductToVariantId,
                },
            });

            if (error) {
                await trx.rollback();
                return res.status(400).json({ error });
            }
            if (notFound) {
                await trx.rollback();
                return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
            }

            await trx.commit();
            res.json(updated);
        } catch (error) {
            await trx.rollback();
            logger.error("Lỗi cập nhật đơn hàng", { id, error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể cập nhật đơn hàng." });
        }
    });
};

module.exports = { attachUpdateOrderRoute };
