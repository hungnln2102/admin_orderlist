const express = require("express");
const {
  listPaymentReceipts,
  createPaymentReceiptBatch,
  listPaymentReceiptBatches,
  getPaymentReceiptBatchDetail,
  completePaymentReceiptBatchManual,
  listMatchableOrders,
  confirmPaymentSupply,
  reconcilePaymentReceipt,
  allocateOutboundPaymentReceipt,
  classifyReceipt,
  listReceiptFlowTypes,
  createReceiptFlowType,
  updateReceiptFlowType,
  deleteReceiptFlowType,
  listUnlinkedExpenses,
} = require("@/domains/payments/controller");

const router = express.Router();

router.get("/payment-receipts", listPaymentReceipts);
router.post("/payment-receipts/batches", createPaymentReceiptBatch);
router.get("/payment-receipts/batches", listPaymentReceiptBatches);
router.get("/payment-receipts/batches/:batchCode", getPaymentReceiptBatchDetail);
router.post("/payment-receipts/batches/:batchCode/complete-manual", completePaymentReceiptBatchManual);
router.get("/payment-receipts/matchable-orders", listMatchableOrders);
router.get("/payment-receipts/unlinked-expenses", listUnlinkedExpenses);
router.post("/payment-receipts/:receiptId/reconcile", reconcilePaymentReceipt);
router.post("/payment-receipts/:receiptId/allocate-outbound", allocateOutboundPaymentReceipt);
router.post("/payment-receipts/:receiptId/classify", classifyReceipt);
router.post("/payment-supply/:paymentId/confirm", confirmPaymentSupply);

// CRUD receipt flow types
router.get("/receipt-flow-types", listReceiptFlowTypes);
router.post("/receipt-flow-types", createReceiptFlowType);
router.put("/receipt-flow-types/:id", updateReceiptFlowType);
router.delete("/receipt-flow-types/:id", deleteReceiptFlowType);

module.exports = router;
