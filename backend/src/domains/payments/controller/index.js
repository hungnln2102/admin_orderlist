/**
 * Entry mỏng cho PaymentsController.
 * Mỗi handler nằm trong `handlers/<name>.js`, share utils trong `shared/`.
 * KHÔNG thêm business logic vào file này.
 */
const { listPaymentReceipts } = require("./handlers/listPaymentReceipts");
const {
  createPaymentReceiptBatch,
} = require("./handlers/createPaymentReceiptBatch");
const {
  listPaymentReceiptBatches,
} = require("./handlers/listPaymentReceiptBatches");
const {
  getPaymentReceiptBatchDetail,
} = require("./handlers/getPaymentReceiptBatchDetail");
const { listMatchableOrders } = require("./handlers/listMatchableOrders");
const {
  reconcilePaymentReceipt,
} = require("./handlers/reconcilePaymentReceipt");
const { confirmPaymentSupply } = require("./handlers/confirmPaymentSupply");

module.exports = {
  listPaymentReceipts,
  createPaymentReceiptBatch,
  listPaymentReceiptBatches,
  getPaymentReceiptBatchDetail,
  listMatchableOrders,
  confirmPaymentSupply,
  reconcilePaymentReceipt,
};
