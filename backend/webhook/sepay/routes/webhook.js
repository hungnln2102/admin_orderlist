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
  isEligibleForRenewal,
} = require("../renewal");
const { STATUS: ORDER_STATUS } = require("../../../src/utils/statuses");
const logger = require("../../../src/utils/logger");

const router = express.Router();

// Health check for webhook endpoint
router.get("/", (_req, res) => {
  res.json({ message: "Sepay webhook endpoint. Use POST with signature." });
});

router.post("/", async (req, res) => {
  logger.debug("Incoming Sepay webhook", {
    headers: {
      authorization: req.get("Authorization") ? "***" : null,
      xApiKey: req.get("X-API-KEY") ? "***" : null,
      xSepaySignature: req.get("X-SEPAY-SIGNATURE") ? "***" : null,
      signature: req.get("Signature") ? "***" : null,
      querySignature: req.query?.signature ? "***" : null,
    },
    bodySize: JSON.stringify(req.body).length,
  });

  const signature = resolveSepaySignature(req);
  const hasValidSignature = verifySepaySignature(req.rawBody, signature);
  const hasValidApiKey = isValidApiKey(req);
  if (!(hasValidSignature || hasValidApiKey)) {
    logger.warn("Webhook auth failed", {
      hasValidSignature,
      hasValidApiKey,
      hasAuth: !!req.get("Authorization"),
    });
    return res.status(403).json({ message: "Invalid Signature" });
  }

  const transaction = normalizeTransactionPayload(req.body);
  logger.debug("Parsed transaction", { transaction: safeStringify(transaction) });
  if (!transaction) {
    return res.status(400).json({ message: "Missing transaction" });
  }

  const orderCode = deriveOrderCode(transaction);
  logger.debug("Derived order code", { orderCode });
  const extractedOrderCodes = extractOrderCodes(transaction);
  const normalizedPrimary = String(orderCode || "").trim().toUpperCase();
  const normalizedExtracted = extractedOrderCodes
    .map((code) => String(code || "").trim().toUpperCase())
    .filter(Boolean);
  const orderCodes = Array.from(
    new Set(
      normalizedPrimary
        ? [normalizedPrimary]
        : normalizedExtracted
    )
  );
  if (normalizedExtracted.length > 1 && normalizedPrimary) {
    logger.warn(
      "Multiple order codes detected; using primary only",
      { primary: normalizedPrimary, extracted: normalizedExtracted }
    );
  } else if (orderCodes.length > 1) {
    logger.debug("Extracted order codes", { orderCodes });
  }
  const transferAmountNormalized = normalizeAmount(
    transaction.transfer_amount || transaction.amount_in
  );

  try {
    let receiptResult = null;
    const eligibilityByOrderCode = new Map();
    const stateByOrderCode = new Map();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const code of orderCodes.length ? orderCodes : orderCode ? [orderCode] : []) {
        const stateRes = await client.query(
          `SELECT
            ${ORDER_COLS.status},
            ${ORDER_COLS.orderExpired}
          FROM ${ORDER_TABLE}
          WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
          LIMIT 1`,
          [code]
        );
        const state = stateRes.rows[0] || null;
        stateByOrderCode.set(code, state);
        eligibilityByOrderCode.set(
          code,
          state
            ? isEligibleForRenewal(
                state[ORDER_COLS.status],
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
          logger.debug("Ensure supply/price result", { orderCode: code, ensured });
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

      if (receiptResult?.inserted || receiptResult?.duplicate) {
        for (const code of orderCodes.length ? orderCodes : orderCode ? [orderCode] : []) {
          const state = stateByOrderCode.get(code);
          const eligibility = eligibilityByOrderCode.get(code);
          if (!state || eligibility?.eligible) continue;

          const statusValue = state[ORDER_COLS.status];
          if (statusValue === ORDER_STATUS.UNPAID) {
            await client.query(
              `UPDATE ${ORDER_TABLE}
               SET ${ORDER_COLS.status} = $2
               WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
                 AND ${ORDER_COLS.status} = $3`,
              [code, ORDER_STATUS.PROCESSING, ORDER_STATUS.UNPAID]
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

    // Rule renewal: sau khi đổi trạng thái (và insert receipt), chạy gia hạn cho đơn eligible.
    // Eligible = RENEWAL / EXPIRED (khi daysLeft <= 4).
    // Sau khi renewal, đơn sẽ chuyển về PROCESSING (Đang Xử Lý).
    try {
      for (const code of orderCodes.length ? orderCodes : orderCode ? [orderCode] : []) {
        const state = await fetchOrderState(code);
        if (state) {
          const eligibility = isEligibleForRenewal(
            state[ORDER_COLS.status],
            state[ORDER_COLS.orderExpired]
          );
          if (eligibility.eligible) {
            queueRenewalTask(code, {
              forceRenewal: eligibility.forceRenewal,
            });
            await processRenewalTask(code);
          }
        }
      }
    } catch (renewErr) {
      logger.error("Renewal flow failed", { error: renewErr.message, stack: renewErr.stack });
    }

    return res.json({ message: "OK" });
  } catch (err) {
    logger.error("Error saving payment", { error: err.message, stack: err.stack });
    return res.status(500).json({ message: "Internal Error" });
  }
});

module.exports = router;
