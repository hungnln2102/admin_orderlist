const express = require("express");
const {
  listPaymentReceipts,
  confirmPaymentSupply,
} = require("../controllers/PaymentsController");

const router = express.Router();

router.get("/payment-receipts", listPaymentReceipts);
router.post("/payment-supply/:paymentId/confirm", confirmPaymentSupply);

module.exports = router;
