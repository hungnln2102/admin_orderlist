/**
 * Re-export mỏng cho Telegram / scheduler — tránh require sâu vào domains từ services.
 */

const {
  ensureOrderTransaction,
} = require("../domains/orders/use-cases/ensureOrderTransaction");

/**
 * Trước khi build QR: đảm bảo có transaction; gắn lại lên object order trong bộ nhớ.
 * @param {object} order
 * @returns {Promise<string>} mã transaction
 */
async function ensureOrderTransactionForPayment(order) {
  const result = await ensureOrderTransaction({ order });
  if (order && typeof order === "object") {
    order.transaction = result.transaction;
    order[require("../config/dbSchema").ORDERS_SCHEMA.ORDER_LIST.COLS.TRANSACTION] =
      result.transaction;
  }
  return result.transaction;
}

module.exports = {
  ensureOrderTransaction,
  ensureOrderTransactionForPayment,
};
