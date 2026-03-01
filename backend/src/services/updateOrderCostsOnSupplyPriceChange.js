const { db } = require("../db");
const { TABLES, COLS, STATUS } = require("../controllers/Order/constants");
const { ORDERS_SCHEMA } = require("../config/dbSchema");
const { quoteIdent } = require("../utils/sql");

/**
 * Updates order costs for all PROCESSING and UNPAID orders when a supply price changes.
 * 
 * @param {number} productId - The variant/product ID
 * @param {number} supplierId - The supplier ID
 * @param {number} newPrice - The new price to set
 * @returns {Promise<{updatedCount: number, orders: Array}>} - Result with count and affected order IDs
 */
const updateOrderCostsOnSupplyPriceChange = async (productId, supplierId, newPrice) => {
    try {
        console.log('\n========== AUTO-UPDATE ORDER COSTS ==========');
        console.log('Input parameters:', { productId, supplierId, newPrice });

        // order_list.id_product = variant id (int), order_list.supply_id = supplier id (int)
        const updateQuery = `
            UPDATE ${TABLES.orderList}
            SET "cost" = ?
            WHERE "id_product" = ?
              AND "supply_id" = ?
              AND "status" IN (?, ?)
            RETURNING "id", "id_order", "id_product", "supply_id", "status", "cost";
        `;

        const updateResult = await db.raw(updateQuery, [
            newPrice,
            productId,
            supplierId,
            STATUS.PROCESSING,
            STATUS.UNPAID
        ]);

        const updatedOrders = updateResult.rows || [];
        const updatedCount = updatedOrders.length;

        if (updatedCount > 0) {
            console.log(`✓ Updated ${updatedCount} order(s) (variant ${productId}, supplier ${supplierId})`);
            updatedOrders.forEach((order, i) => {
                console.log(`  ${i + 1}. ${order.id_order} - cost: ${order.cost}`);
            });
        } else {
            console.log('⚠ No orders updated (no matching variant/supplier/status)');
        }
        console.log('==============================================\n');

        return {
            updatedCount,
            orders: updatedOrders.map(o => ({
                id: o.id,
                orderId: o.id_order,
                variantId: o.id_product,
                newCost: o.cost
            }))
        };

    } catch (error) {
        console.error('❌ ERROR in updateOrderCostsOnSupplyPriceChange:', error);
        console.error('Stack trace:', error.stack);
        console.log('==============================================\n');
        throw error;
    }
};

module.exports = {
    updateOrderCostsOnSupplyPriceChange
};
