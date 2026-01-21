const { db } = require("../db");
const { TABLES, COLS, STATUS } = require("../controllers/Order/constants");
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

        // First, find the product name(s) that match this variant ID
        // Orders store the product name in id_product field, not the variant ID
        const variantQuery = `
            SELECT 
                v."display_name" AS display_name,
                v."variant_name" AS variant_name,
                p."package_name" AS package_name
            FROM ${TABLES.variant} v
            LEFT JOIN ${TABLES.product} p ON p."id" = v."product_id"
            WHERE v.id = ?
            LIMIT 1;
        `;
        
        console.log('Step 1: Looking up variant/product names...');
        const variantResult = await db.raw(variantQuery, [productId]);
        if (!variantResult.rows || !variantResult.rows.length) {
            console.log(`❌ No variant found for productId: ${productId}`);
            console.log('==============================================\n');
            return { updatedCount: 0, orders: [] };
        }

        const variant = variantResult.rows[0];
        const productNames = [
            variant.display_name,
            variant.variant_name,
            variant.package_name
        ].filter(Boolean);

        console.log('✓ Found product names:', productNames);

        if (productNames.length === 0) {
            console.log(`❌ No product names found for variant ID: ${productId}`);
            console.log('==============================================\n');
            return { updatedCount: 0, orders: [] };
        }

        // Get supplier name
        const supplierQuery = `
            SELECT "supplier_name" AS supplier_name
            FROM ${TABLES.supplier}
            WHERE "id" = ?
            LIMIT 1;
        `;
        
        console.log('Step 2: Looking up supplier name...');
        const supplierResult = await db.raw(supplierQuery, [supplierId]);
        if (!supplierResult.rows || !supplierResult.rows.length) {
            console.log(`❌ No supplier found for supplierId: ${supplierId}`);
            console.log('==============================================\n');
            return { updatedCount: 0, orders: [] };
        }

        const supplierName = supplierResult.rows[0].supplier_name;
        console.log('✓ Found supplier name:', supplierName);

        // Build the update query
        // Update orders where:
        // - id_product matches any of the product names
        // - supply matches the supplier name
        // - status is "Đang Xử Lý" (PROCESSING) OR "Chưa Thanh Toán" (UNPAID)
        const productNamePlaceholders = productNames.map(() => '?').join(', ');
        
        console.log('\nStep 3: Searching for matching orders...');
        console.log('Search criteria:');
        console.log('  - Product names:', productNames);
        console.log('  - Supplier:', supplierName);
        console.log('  - Status: "Đang Xử Lý" OR "Chưa Thanh Toán"');
        console.log('  - New cost:', newPrice);

        const updateQuery = `
            UPDATE ${TABLES.orderList}
            SET "cost" = ?
            WHERE "id_product" IN (${productNamePlaceholders})
              AND "supply" = ?
              AND "status" IN (?, ?)
            RETURNING "id", 
                      "id_order",
                      "id_product",
                      "supply",
                      "status",
                      "cost";
        `;

        console.log('\nExecuting UPDATE query...');
        const updateResult = await db.raw(updateQuery, [
            newPrice,
            ...productNames,
            supplierName,
            STATUS.PROCESSING,
            STATUS.UNPAID
        ]);

        const updatedOrders = updateResult.rows || [];
        const updatedCount = updatedOrders.length;

        console.log(`\nStep 4: Update completed!`);
        if (updatedCount > 0) {
            console.log(`✓ Successfully updated ${updatedCount} order(s):`);
            updatedOrders.forEach((order, index) => {
                console.log(`  ${index + 1}. Order ID: ${order.id_order || order.id}`);
                console.log(`     - Product: ${order.id_product}`);
                console.log(`     - Supplier: ${order.supply}`);
                console.log(`     - Status: ${order.status}`);
                console.log(`     - New Cost: ${order.cost}`);
            });
        } else {
            console.log('⚠ No orders were updated');
            console.log('Possible reasons:');
            console.log('  - No orders match the product name(s)');
            console.log('  - No orders match the supplier name');
            console.log('  - No orders have status "Đang Xử Lý" or "Chưa Thanh Toán"');
            console.log('\nTrying to find existing orders for debugging...');
            
            // Debug query to see what orders exist
            const debugQuery = `
                SELECT "id",
                       "id_order",
                       "id_product",
                       "supply",
                       "status",
                       "cost"
                FROM ${TABLES.orderList}
                WHERE "id_product" IN (${productNamePlaceholders})
                  AND "supply" = ?
                LIMIT 5;
            `;
            
            const debugResult = await db.raw(debugQuery, [...productNames, supplierName]);
            if (debugResult.rows && debugResult.rows.length > 0) {
                console.log(`\nFound ${debugResult.rows.length} order(s) with matching product and supplier:`);
                debugResult.rows.forEach((order, index) => {
                    console.log(`  ${index + 1}. Order: ${order.id_order || order.id}`);
                    console.log(`     - Product: ${order.id_product}`);
                    console.log(`     - Supplier: ${order.supply}`);
                    console.log(`     - Status: "${order.status}" (not PROCESSING or UNPAID)`);
                    console.log(`     - Current Cost: ${order.cost}`);
                });
            } else {
                console.log('  No orders found with matching product and supplier');
            }
        }
        
        console.log('==============================================\n');

        return {
            updatedCount,
            orders: updatedOrders.map(o => ({
                id: o.id,
                orderId: o.id_order,
                productName: o.id_product,
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
