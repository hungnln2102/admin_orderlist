/* Sepay webhook server (Node/Express) */
require("dotenv").config();

const express = require("express");

const {
  SEPAY_WEBHOOK_PATH,
  HOST,
  PORT,
  ORDER_COLS,
} = require("./sepay/config");
const {
  safeStringify,
  normalizeAmount,
} = require("./sepay/utils");
const {
  normalizeTransactionPayload,
  deriveOrderCode,
} = require("./sepay/transactions");
const {
  resolveSepaySignature,
  verifySepaySignature,
  isValidApiKey,
} = require("./sepay/auth");
const {
  insertPaymentReceipt,
  ensureSupplyAndPriceFromOrder,
  updatePaymentSupplyBalance,
} = require("./sepay/payments");
const {
  sendPaymentNotification,
} = require("./sepay/notifications");
const {
  queueRenewalTask,
  processRenewalTask,
  fetchOrderState,
  shouldResetStatusToUnpaid,
  isEligibleForRenewal,
  isNullishFlag,
  markCheckFlagFalse,
  runRenewalBatch,
  runRenewal,
  setStatusUnpaid,
} = require("./sepay/renewal");

const app = express();

// Capture raw body for HMAC verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

// Health check for webhook endpoint
app.get(SEPAY_WEBHOOK_PATH, (_req, res) => {
  res.json({ message: "Sepay webhook endpoint. Use POST with signature." });
});

// Manual retry renewals (requires Sepay API key header)
app.post("/api/renewals/retry", async (req, res) => {
  if (!isValidApiKey(req)) {
    return res.status(403).json({ message: "Invalid API key" });
  }

  try {
    const { orders, force } = req.body || {};
    const summary = await runRenewalBatch({
      orderCodes: Array.isArray(orders) ? orders : undefined,
      forceRenewal: Boolean(force),
    });
    res.json({ message: "OK", ...summary });
  } catch (err) {
    console.error("Renewal retry failed:", err);
    res.status(500).json({ message: "Internal Error" });
  }
});

app.post(SEPAY_WEBHOOK_PATH, async (req, res) => {
  console.log("Incoming Sepay webhook headers:", {
    authorization: req.get("Authorization"),
    xApiKey: req.get("X-API-KEY"),
    xSepaySignature: req.get("X-SEPAY-SIGNATURE"),
    signature: req.get("Signature"),
    querySignature: req.query?.signature,
  });
  console.log("Incoming Sepay webhook raw body:", safeStringify(req.body));

  const signature = resolveSepaySignature(req);
  const hasValidSignature = verifySepaySignature(req.rawBody, signature);
  const hasValidApiKey = isValidApiKey(req);
  if (!(hasValidSignature || hasValidApiKey)) {
    console.error("Webhook auth failed", {
      hasValidSignature,
      hasValidApiKey,
      receivedAuth: req.get("Authorization"),
    });
    return res.status(403).json({ message: "Invalid Signature" });
  }

  const transaction = normalizeTransactionPayload(req.body);
  console.log("Parsed transaction object:", safeStringify(transaction));
  if (!transaction) {
    return res.status(400).json({ message: "Missing transaction" });
  }

  const orderCode = deriveOrderCode(transaction);
  console.log("Derived order code:", orderCode);
  const transferAmountNormalized = normalizeAmount(
    transaction.transfer_amount || transaction.amount_in
  );

  try {
    await insertPaymentReceipt(transaction);
    try {
      await sendPaymentNotification(orderCode, transaction);
    } catch (notifyErr) {
      console.error("Payment notification failed:", notifyErr);
    }
    const ensured = await ensureSupplyAndPriceFromOrder(orderCode, {
      referenceImport: transferAmountNormalized,
    });
    console.log("Ensure supply/price result:", safeStringify(ensured));
    if (ensured?.sourceId && Number.isFinite(ensured.price)) {
      await updatePaymentSupplyBalance(ensured.sourceId, ensured.price, new Date());
    }

    // Renewal retry flow: only queue and retry needed actions
    try {
      if (orderCode) {
        const state = await fetchOrderState(orderCode);
        if (state) {
          const resetToUnpaid = shouldResetStatusToUnpaid(
            state[ORDER_COLS.status]
          );
          const eligibility = isEligibleForRenewal(
            state[ORDER_COLS.status],
            state[ORDER_COLS.checkFlag],
            state[ORDER_COLS.orderExpired]
          );
          if (eligibility.eligible) {
            queueRenewalTask(orderCode, {
              forceRenewal: eligibility.forceRenewal,
              needsStatusReset: eligibility.needsStatusReset,
            });
            await processRenewalTask(orderCode);
          } else if (
            eligibility.statusNorm === "Chưa Thanh Toán" &&
            isNullishFlag(state[ORDER_COLS.checkFlag])
          ) {
            await markCheckFlagFalse(orderCode);
          }

          if (resetToUnpaid) {
            await setStatusUnpaid(orderCode);
          }
        }
      }
    } catch (renewErr) {
      console.error("Renewal flow failed:", renewErr);
    }

    return res.json({ message: "OK" });
  } catch (err) {
    console.error("Error saving payment:", err);
    if (err?.stack) console.error(err.stack);
    return res.status(500).json({ message: "Internal Error" });
  }
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Listening on http://${HOST}:${PORT}${SEPAY_WEBHOOK_PATH}`);
  });
}

module.exports = app;
module.exports.runRenewal = runRenewal;
module.exports.queueRenewalTask = queueRenewalTask;
module.exports.processRenewalTask = processRenewalTask;
module.exports.fetchOrderState = fetchOrderState;
