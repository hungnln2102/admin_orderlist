/**
 * Entry mỏng cho PaymentsController.
 * Mỗi handler nằm trong `handlers/<name>.js`, share utils trong `shared/`.
 * KHÔNG thêm business logic vào file này.
 */
const { listPaymentReceipts } = require("@/domains/payments/controller/handlers/listPaymentReceipts");
const {
  createPaymentReceiptBatch,
} = require("@/domains/payments/controller/handlers/createPaymentReceiptBatch");
const {
  listPaymentReceiptBatches,
} = require("@/domains/payments/controller/handlers/listPaymentReceiptBatches");
const {
  getPaymentReceiptBatchDetail,
} = require("@/domains/payments/controller/handlers/getPaymentReceiptBatchDetail");
const { listMatchableOrders } = require("@/domains/payments/controller/handlers/listMatchableOrders");
const {
  reconcilePaymentReceipt,
} = require("@/domains/payments/controller/handlers/reconcilePaymentReceipt");
const { confirmPaymentSupply } = require("@/domains/payments/controller/handlers/confirmPaymentSupply");

module.exports = {
  listPaymentReceipts,
  createPaymentReceiptBatch,
  listPaymentReceiptBatches,
  getPaymentReceiptBatchDetail,
  listMatchableOrders,
  confirmPaymentSupply,
  reconcilePaymentReceipt,
};
