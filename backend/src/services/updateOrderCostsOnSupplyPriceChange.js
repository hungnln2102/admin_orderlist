const { db } = require("../db");
const { TABLES, STATUS } = require("../controllers/Order/constants");
const { toNullableNumber } = require("../utils/normalizers");
const logger = require("../utils/logger");

/**
 * Khi đổi giá nhập NCC: cập nhật cost trên đơn UNPAID / Đang Xử Lý.
 * Đơn Đang Xử Lý: partner.supplier_order_cost_log đồng bộ qua trigger orders.order_list (cost).
 */
const updateOrderCostsOnSupplyPriceChange = async (variantId, supplierId, newPrice) => {
    const newCost = toNullableNumber(newPrice);
    if (!Number.isFinite(variantId) || !Number.isFinite(supplierId) || newCost == null) {
        return { updatedCount: 0, orders: [] };
    }

    const trx = await db.transaction();
    try {
        const unpaidResult = await trx.raw(
            `UPDATE ${TABLES.orderList}
             SET "cost" = ?
             WHERE "id_product" = ?
               AND "supply_id" = ?
               AND "status" = ?
             RETURNING "id", "id_order", "status", "cost"`,
            [newCost, variantId, supplierId, STATUS.UNPAID]
        );
        const unpaidOrders = unpaidResult.rows || [];

        const processingSnapshot = await trx.raw(
            `SELECT "id", "id_order", "cost"
             FROM ${TABLES.orderList}
             WHERE "id_product" = ?
               AND "supply_id" = ?
               AND "status" = ?`,
            [variantId, supplierId, STATUS.PROCESSING]
        );
        const processingRows = processingSnapshot.rows || [];

        if (processingRows.length > 0) {
            await trx.raw(
                `UPDATE ${TABLES.orderList}
                 SET "cost" = ?
                 WHERE "id_product" = ?
                   AND "supply_id" = ?
                   AND "status" = ?`,
                [newCost, variantId, supplierId, STATUS.PROCESSING]
            );
        }

        await trx.commit();

        const allUpdated = [
            ...unpaidOrders.map(o => ({ ...o, type: "UNPAID" })),
            ...processingRows.map(o => ({ ...o, cost: newCost, type: "PROCESSING" })),
        ];

        logger.info("[SupplyPriceChange] Orders updated", {
            variantId,
            supplierId,
            newCost,
            unpaid: unpaidOrders.length,
            processing: processingRows.length,
        });

        return {
            updatedCount: allUpdated.length,
            orders: allUpdated.map(o => ({
                id: o.id,
                orderId: o.id_order,
                variantId,
                newCost,
                type: o.type,
            })),
            debtAdjustment: 0,
        };
    } catch (error) {
        await trx.rollback();
        logger.error("[SupplyPriceChange] Failed", {
            variantId,
            supplierId,
            newCost,
            error: error?.message,
            stack: error?.stack,
        });
        throw error;
    }
};

module.exports = {
    updateOrderCostsOnSupplyPriceChange,
};
