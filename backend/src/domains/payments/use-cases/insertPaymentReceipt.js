const { insertPaymentReceipt: insertPaymentReceiptOriginal } = require("../../../../webhook/sepay/payments");

/**
 * Ghi nhận biên lai vào DB.
 * Use-case wrap lại logic của webhook/sepay/payments.js
 */
const insertPaymentReceipt = async (transaction, options = {}) => {
  return await insertPaymentReceiptOriginal(transaction, options);
};

module.exports = {
  insertPaymentReceipt,
};
