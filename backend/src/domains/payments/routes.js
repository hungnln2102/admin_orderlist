const express = require("express");
const {
  listPaymentReceipts,
  createPaymentReceiptBatch,
  listPaymentReceiptBatches,
  getPaymentReceiptBatchDetail,
  listMatchableOrders,
  confirmPaymentSupply,
  reconcilePaymentReceipt,
} = require("../../controllers/PaymentsController");

const router = express.Router();

router.get("/payment-receipts", listPaymentReceipts);
router.post("/payment-receipts/batches", createPaymentReceiptBatch);
router.get("/payment-receipts/batches", listPaymentReceiptBatches);
router.get("/payment-receipts/batches/:batchCode", getPaymentReceiptBatchDetail);
router.get("/payment-receipts/matchable-orders", listMatchableOrders);
router.post("/payment-receipts/:receiptId/reconcile", reconcilePaymentReceipt);
router.post("/payment-supply/:paymentId/confirm", confirmPaymentSupply);

module.exports = router;
