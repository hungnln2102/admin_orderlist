/**
 * Legacy shim — không còn sinh mã transaction cho QR/Telegram.
 * Match thanh toán qua payment slot (suffix + số tiền).
 */

const { ensureOrderTransaction } = require("../domains/orders/use-cases/ensureOrderTransaction");

/**
 * @param {object} order
 * @returns {Promise<string>} luôn rỗng (không dùng nội dung CK)
 */
async function ensureOrderTransactionForPayment(order) {
  await ensureOrderTransaction({ order });
  return "";
}

module.exports = {
  ensureOrderTransaction,
  ensureOrderTransactionForPayment,
};
