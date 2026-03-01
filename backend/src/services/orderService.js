/**
 * Order Service
 * Handles business logic for order operations
 */

const { db } = require("../db");
const { TABLES, STATUS, COLS } = require("../controllers/Order/constants");
const { ORDERS_SCHEMA } = require("../config/dbSchema");
const {
  normalizeOrderRow,
  sanitizeOrderWritePayload,
  ensureSupplyRecord,
  normalizeTextInput,
} = require("../controllers/Order/helpers");
const { nextId } = require("./idService");
const { todayYMDInVietnam } = require("../utils/normalizers");

/**
 * Create a new order
 * @param {Object} orderData - Order data
 * @param {Object} trx - Knex transaction (optional)
 * @returns {Promise<Object>} Created order
 */
const createOrder = async (orderData, trx = null) => {
  const transaction = trx || (await db.transaction());
  const shouldCommit = !trx; // Only commit if we created the transaction

  try {
    const raw = { ...orderData };
    if (raw.supply != null && raw.supply !== "" && typeof raw.supply === "string") {
      const name = normalizeTextInput(String(raw.supply));
      if (name) {
        raw[ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY] = await ensureSupplyRecord(name);
      }
      delete raw.supply;
    }
    const payload = sanitizeOrderWritePayload(raw);
    delete payload.id;

    if (Object.keys(payload).length === 0) {
      throw new Error("Empty payload");
    }

    // Set default status
    payload.status = STATUS.UNPAID;

    // Ensure we have a numeric PK
    payload.id = await nextId(TABLES.orderList, COLS.ORDER.ID, transaction);

    // Insert order
    const [newOrder] = await transaction(TABLES.orderList).insert(payload).returning("*");

    if (shouldCommit) {
      await transaction.commit();
    }

    // Normalize and return
    return normalizeOrderRow(newOrder, todayYMDInVietnam());
  } catch (error) {
    if (shouldCommit) {
      await transaction.rollback();
    }
    throw error;
  }
};

/**
 * Get order by ID
 * @param {number} id - Order ID
 * @returns {Promise<Object|null>} Order or null
 */
const getOrderById = async (id) => {
  const order = await db(TABLES.orderList).where({ id }).first();
  if (!order) return null;
  return normalizeOrderRow(order, todayYMDInVietnam());
};

/**
 * Get orders list with pagination and filters
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Orders list with pagination
 */
const getOrdersList = async (options = {}) => {
  const { page = 1, limit = 50, status, search } = options;
  const offset = (page - 1) * limit;

  let query = db(TABLES.orderList);

  // Apply filters
  if (status) {
    query = query.where({ status });
  }

  if (search) {
    query = query.where((builder) => {
      builder
        .where(COLS.ORDER.ID_ORDER, "like", `%${search}%`)
        .orWhere(COLS.ORDER.CUSTOMER, "like", `%${search}%`);
    });
  }

  // Get total count
  const [{ count }] = await query.clone().count("* as count");
  const total = parseInt(count, 10);

  // Get paginated results
  const orders = await query.limit(limit).offset(offset).orderBy("id", "desc");

  const today = todayYMDInVietnam();
  const normalizedOrders = orders.map((order) => normalizeOrderRow(order, today));

  return {
    data: normalizedOrders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update order
 * @param {number} id - Order ID
 * @param {Object} updateData - Update data
 * @param {Object} trx - Knex transaction (optional)
 * @returns {Promise<Object>} Updated order
 */
const updateOrder = async (id, updateData, trx = null) => {
  const transaction = trx || (await db.transaction());
  const shouldCommit = !trx;

  try {
    const raw = { ...updateData };
    if (raw.supply != null && raw.supply !== "" && typeof raw.supply === "string") {
      const name = normalizeTextInput(String(raw.supply));
      if (name) {
        raw[ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY] = await ensureSupplyRecord(name);
      }
      delete raw.supply;
    }
    const payload = sanitizeOrderWritePayload(raw);

    if (Object.keys(payload).length === 0) {
      throw new Error("Empty payload");
    }

    const [updated] = await transaction(TABLES.orderList)
      .where({ id })
      .update(payload)
      .returning("*");

    if (!updated) {
      throw new Error("Order not found");
    }

    if (shouldCommit) {
      await transaction.commit();
    }

    return normalizeOrderRow(updated, todayYMDInVietnam());
  } catch (error) {
    if (shouldCommit) {
      await transaction.rollback();
    }
    throw error;
  }
};

/**
 * Delete order
 * @param {number} id - Order ID
 * @param {Object} trx - Knex transaction (optional)
 * @returns {Promise<boolean>} Success
 */
const deleteOrder = async (id, trx = null) => {
  const transaction = trx || (await db.transaction());
  const shouldCommit = !trx;

  try {
    const deleted = await transaction(TABLES.orderList).where({ id }).del();

    if (shouldCommit) {
      await transaction.commit();
    }

    return deleted > 0;
  } catch (error) {
    if (shouldCommit) {
      await transaction.rollback();
    }
    throw error;
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getOrdersList,
  updateOrder,
  deleteOrder,
};
