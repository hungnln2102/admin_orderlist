const { db } = require("@/db");
const { TABLES } = require("@/domains/orders/controller/constants");
const { nextId } = require("@/services/idService");

/**
 * Creates a new order list entry.
 */
const insertOrder = async (payload, trx = db) => {
    const [newOrder] = await trx(TABLES.orderList).insert(payload).returning("*");
    return newOrder;
};

/**
 * Fetch reserved order code.
 */
const findOrderByIdOrder = async (idOrderCol, reservedOrderCodeRaw, trx = db) => {
    return await trx(TABLES.orderList)
        .where(idOrderCol, reservedOrderCodeRaw)
        .first();
};

/**
 * Generate Next ID for an order.
 */
const generateNextOrderId = async (idCol, trx = db) => {
    return await nextId(TABLES.orderList, idCol, trx);
};

module.exports = {
    insertOrder,
    findOrderByIdOrder,
    generateNextOrderId,
};
