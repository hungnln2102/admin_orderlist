/**
 * Mã hiển thị trong nội dung CK / VietQR (ưu tiên transaction, fallback id_order).
 */

const { ORDERS_SCHEMA } = require("../config/dbSchema");

const TRANSACTION_COL = ORDERS_SCHEMA.ORDER_LIST.COLS.TRANSACTION;

function pickPaymentTransferCode(order) {
  return String(order?.transaction ?? order?.[TRANSACTION_COL] ?? "")
    .trim()
    .toUpperCase();
}

module.exports = { pickPaymentTransferCode };
