const { db } = require("@/db");
const logger = require("@/utils/logger");

const subscribeToEvents = (eventBus, EVENTS) => {
    // IMPORT_ORDER_CREATED is emitted in createOrder.js
    eventBus.on(EVENTS.IMPORT_ORDER_CREATED, async (order) => {
        try {
            await insertInitialLedger(order);
        } catch (error) {
            logger.error("[FinancialAllocationLedger] Error on IMPORT_ORDER_CREATED", { error: error.message });
        }
    });

    eventBus.on(EVENTS.ORDER_CREATED, async (order) => {
        try {
            await insertInitialLedger(order);
        } catch (error) {
            logger.error("[FinancialAllocationLedger] Error on ORDER_CREATED", { error: error.message });
        }
    });

    eventBus.on(EVENTS.ORDER_RENEWED, async (payload) => {
        try {
            const { id_order, registration_date, days, cost, price } = payload;
            
            // If the payload does not have all info, we might need to fetch from order_list
            // But we will update the emit payload in renewal.js to include these
            if (id_order && registration_date != null) {
                const orderRow = await db("orders.order_list").where("id_order", id_order).first();
                if (orderRow) {
                    await db("admin_finance.financial_allocation_ledger").insert({
                        order_list_id: orderRow.id,
                        id_order: id_order,
                        period_type: "RENEWAL",
                        registration_date: registration_date,
                        days: days || 0,
                        cost: cost || 0,
                        price: price || 0,
                    });
                }
            } else {
                logger.warn("[FinancialAllocationLedger] Incomplete RENEWAL payload", payload);
            }
        } catch (error) {
            logger.error("[FinancialAllocationLedger] Error on ORDER_RENEWED", { error: error.message });
        }
    });
};

async function insertInitialLedger(order) {
    if (!order || !order.id) return;
    
    // Some events might just send partial objects, but createOrder sends the full DB row
    const id_order = order.id_order || "UNKNOWN";
    const order_date = order.order_date; // DATE
    if (!order_date) return; // Only track orders with start dates
    
    const daysStr = order.days || "0";
    const days = parseInt(daysStr.replace(/\D/g, ""), 10) || 0;
    
    const cost = order.cost || 0;
    const price = order.price || 0;
    
    await db("admin_finance.financial_allocation_ledger").insert({
        order_list_id: order.id,
        id_order: id_order,
        period_type: "INITIAL",
        registration_date: order_date,
        days: days,
        cost: cost,
        price: price,
    });
}

module.exports = {
    subscribeToEvents,
};
