const express = require("express");
const { ORDER_COLS, ORDER_TABLE, pool } = require("../config");
const { safeStringify, normalizeAmount, extractOrderCodes } = require("../utils");
const {
  normalizeTransactionPayload,
  deriveOrderCode,
} = require("../transactions");
const {
  resolveSepaySignature,
  verifySepaySignature,
  isValidApiKey,
} = require("../auth");
const {
  insertPaymentReceipt,
  ensureSupplyAndPriceFromOrder,
  updatePaymentSupplyBalance,
} = require("../payments");
const {
  queueRenewalTask,
  processRenewalTask,
  fetchOrderState,
  shouldResetStatusToUnpaid,
  isEligibleForRenewal,
  isNullishFlag,
  markCheckFlagFalse,
  setStatusUnpaid,
} = require("../renewal");
const { STATUS: ORDER_STATUS } = require("../../../src/utils/statuses");

const router = express.Router();

// Health check for webhook endpoint
router.get("/", (_req, res) => {
  res.json({ message: "Sepay webhook endpoint. Use POST with signature." });
});

router.post("/", async (req, res) => {
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
  const extractedOrderCodes = extractOrderCodes(transaction);
  const orderCodes = Array.from(
    new Set(
      (
        extractedOrderCodes.length
          ? extractedOrderCodes
          : orderCode
          ? [orderCode]
          : []
      )
        .map((code) => String(code || "").trim().toUpperCase())
        .filter(Boolean)
    )
  );
  if (orderCodes.length > 1) {
    console.log("Extracted order codes:", safeStringify(orderCodes));
  }
  const transferAmountNormalized = normalizeAmount(
    transaction.transfer_amount || transaction.amount_in
  );

  try {
    let receiptResult = null;
    const eligibilityByOrderCode = new Map();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const code of orderCodes.length ? orderCodes : orderCode ? [orderCode] : []) {
        const stateRes = await client.query(
          `SELECT
            ${ORDER_COLS.status},
            ${ORDER_COLS.checkFlag},
            ${ORDER_COLS.orderExpired}
          FROM ${ORDER_TABLE}
          WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
          LIMIT 1`,
          [code]
        );
        const state = stateRes.rows[0] || null;
        eligibilityByOrderCode.set(
          code,
          state
            ? isEligibleForRenewal(
                state[ORDER_COLS.status],
                state[ORDER_COLS.checkFlag],
                state[ORDER_COLS.orderExpired]
              )
            : null
        );
      }

      receiptResult = await insertPaymentReceipt(transaction, { client, orderCode });

      if (receiptResult?.inserted) {
        const referenceImport =
          orderCodes.length > 1 ? null : transferAmountNormalized;

        for (const code of orderCodes.length ? orderCodes : orderCode ? [orderCode] : []) {
          const eligibility = eligibilityByOrderCode.get(code);

          // Avoid double supplier import updates for renewal flows:
          // - Renewal path already calls updatePaymentSupplyBalance() inside runRenewal().
          // - Non-renewal path should add import once per unique receipt.
          if (eligibility?.eligible) continue;

          const ensured = await ensureSupplyAndPriceFromOrder(code, {
            referenceImport,
            client,
          });
          console.log(
            "Ensure supply/price result:",
            safeStringify({ orderCode: code, ensured })
          );
          if (ensured?.supplierId && Number.isFinite(ensured.price)) {
            await updatePaymentSupplyBalance(
              ensured.supplierId,
              ensured.price,
              new Date(),
              { client }
            );
          }
        }
      }

      await client.query("COMMIT");
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }

    // Renewal retry flow: only queue and retry needed actions
    try {
      for (const code of orderCodes.length ? orderCodes : orderCode ? [orderCode] : []) {
        const state = await fetchOrderState(code);
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
            queueRenewalTask(code, {
              forceRenewal: eligibility.forceRenewal,
              needsStatusReset: eligibility.needsStatusReset,
            });
            await processRenewalTask(code);
          } else if (
            eligibility.statusNorm === ORDER_STATUS.UNPAID &&
            isNullishFlag(state[ORDER_COLS.checkFlag])
          ) {
            await markCheckFlagFalse(code);
          }

          if (resetToUnpaid) {
            await setStatusUnpaid(code);
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

module.exports = router;
