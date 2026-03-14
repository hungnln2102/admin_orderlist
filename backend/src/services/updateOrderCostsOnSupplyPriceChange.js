const { db } = require("../db");
const { TABLES, STATUS } = require("../controllers/Order/constants");
const {
    PARTNER_SCHEMA,
    SCHEMA_PARTNER,
    tableName,
} = require("../config/dbSchema");
const { toNullableNumber } = require("../utils/normalizers");
const logger = require("../utils/logger");

const paymentSupplyCols = PARTNER_SCHEMA.PAYMENT_SUPPLY.COLS;
const PAYMENT_SUPPLY_TABLE = tableName(
    PARTNER_SCHEMA.PAYMENT_SUPPLY.TABLE,
    SCHEMA_PARTNER
);

/**
 * When a supplier cost changes in supplier_cost, propagate to affected orders:
 *
 * - UNPAID orders: simply overwrite cost with the new price.
 * - PROCESSING orders: cost was already added to supplier debt (total_amount).
 *   Overwrite cost AND adjust total_amount by the difference (newPrice − oldCost).
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

        let totalDelta = 0;
        if (processingRows.length > 0) {
            for (const row of processingRows) {
                const oldCost = toNullableNumber(row.cost) || 0;
                totalDelta += (newCost - oldCost);
            }

            await trx.raw(
                `UPDATE ${TABLES.orderList}
                 SET "cost" = ?
                 WHERE "id_product" = ?
                   AND "supply_id" = ?
                   AND "status" = ?`,
                [newCost, variantId, supplierId, STATUS.PROCESSING]
            );

            if (totalDelta !== 0) {
                const colId = paymentSupplyCols.ID;
                const colImport = paymentSupplyCols.IMPORT_VALUE;
                const colStatus = paymentSupplyCols.STATUS;
                const colSourceId = paymentSupplyCols.SOURCE_ID;

                const latestCycle = await trx(PAYMENT_SUPPLY_TABLE)
                    .where(colSourceId, supplierId)
                    .andWhere(colStatus, STATUS.UNPAID)
                    .orderBy(colId, "desc")
                    .first();

                if (latestCycle) {
                    const currentImport = toNullableNumber(latestCycle[colImport]) || 0;
                    await trx(PAYMENT_SUPPLY_TABLE)
                        .where(colId, latestCycle[colId])
                        .update({ [colImport]: currentImport + totalDelta });
                }
            }
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
            totalDelta,
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
            debtAdjustment: totalDelta,
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
