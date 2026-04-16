const express = require("express");
const {
  listPaymentReceipts,
  listMatchableOrders,
  confirmPaymentSupply,
  reconcilePaymentReceipt,
} = require("../controllers/PaymentsController");

const router = express.Router();

router.get("/payment-receipts", listPaymentReceipts);
router.get("/payment-receipts/matchable-orders", listMatchableOrders);
router.post("/payment-receipts/:receiptId/reconcile", reconcilePaymentReceipt);
router.post("/payment-supply/:paymentId/confirm", confirmPaymentSupply);

module.exports = router;
