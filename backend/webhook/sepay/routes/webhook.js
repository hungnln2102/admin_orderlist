const express = require("express");
const { ORDER_COLS, ORDER_TABLE, pool } = require("../config");
const { safeStringify, normalizeAmount, extractOrderCodes, resolveOrderByPayment } = require("../utils");
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
  const extractedOrderCodes = extractOrderCodes(transaction);
  const normalizedPrimary = String(orderCode || "").trim().toUpperCase();
  const normalizedExtracted = extractedOrderCodes
    .map((code) => String(code || "").trim().toUpperCase())
    .filter(Boolean);
  // Nhiều mã đơn phân cách bằng "-": dùng đủ danh sách đã tách, không chỉ primary
  const orderCodes = [
    ...new Set(
      normalizedExtracted.length > 0
        ? normalizedExtracted
        : normalizedPrimary
          ? [normalizedPrimary]
          : []
    ),
  ];
  logger.debug("Order codes from webhook", { orderCodes, count: orderCodes.length });
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

      // Fallback: nếu không extract được mã MAV, thử match theo số tiền + trạng thái
      if (!orderCodes.length && transferAmountNormalized > 0) {
        logger.info("[Webhook] No MAV order code found, trying amount-based fallback", {
          amount: transferAmountNormalized,
          content: transaction.transaction_content,
        });
        const fallbackCodes = await resolveOrderByPayment(client, {
          amount: transferAmountNormalized,
          transactionContent: transaction.transaction_content,
        });
        if (fallbackCodes.length) {
          orderCodes.push(...fallbackCodes);
          logger.info("[Webhook] Fallback matched orders", { orderCodes: fallbackCodes });
        } else {
          logger.warn("[Webhook] Fallback could not match any order", {
            amount: transferAmountNormalized,
          });
        }
      }

      for (const code of orderCodes.length ? orderCodes : orderCode ? [orderCode] : []) {
        const stateRes = await client.query(
          `SELECT
            ${ORDER_COLS.status},
            ${ORDER_COLS.expiryDate}
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
                state[ORDER_COLS.expiryDate]
              )
            : null
        );
      }

      // Dùng mã đơn đã resolve (fallback hoặc extract) thay vì orderCode gốc
      const resolvedOrderCode = orderCodes[0] || orderCode;
      receiptResult = await insertPaymentReceipt(transaction, { client, orderCode: resolvedOrderCode });

      if (receiptResult?.inserted) {
        const referenceImport =
          orderCodes.length > 1 ? null : transferAmountNormalized;

        for (const code of orderCodes.length ? orderCodes : orderCode ? [orderCode] : []) {
          const state = stateByOrderCode.get(code);
          const eligibility = eligibilityByOrderCode.get(code);

          // Trường hợp đặc biệt:
          // - Đơn đã ở trạng thái PAID thì không cộng thêm tiền NCC,
          //   kể cả khi khách hàng chuyển khoản thêm lần nữa.
          if (state && state[ORDER_COLS.status] === ORDER_STATUS.PAID) {
            logger.info("[Webhook] Skip supplier import for already PAID order", {
              orderCode: code,
            });
            continue;
          }

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

      // Chỉ đổi trạng thái Chưa Thanh Toán → Đang Xử Lý tại webhook.
      // Đơn Cần Gia Hạn để renewal tự cập nhật status khi chạy gia hạn.
      if (receiptResult?.inserted || receiptResult?.duplicate) {
        const codesToUpdate = orderCodes.length ? orderCodes : orderCode ? [orderCode] : [];
        for (const code of codesToUpdate) {
          const state = stateByOrderCode.get(code);
          if (!state) continue;

          const statusValue = state[ORDER_COLS.status];
          if (statusValue === ORDER_STATUS.UNPAID) {
            await client.query(
              `UPDATE ${ORDER_TABLE}
               SET ${ORDER_COLS.status} = $2
               WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
                 AND ${ORDER_COLS.status} = $3`,
              [code, ORDER_STATUS.PROCESSING, ORDER_STATUS.UNPAID]
            );
            logger.debug("[Webhook] Order status → Đang Xử Lý", {
              orderCode: code,
              previousStatus: statusValue,
            });
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

    // Chạy gia hạn cho đơn Cần Gia Hạn (RENEWAL, daysLeft <= 4). Renewal tự cập nhật status → Đang Xử Lý.
    try {
      for (const code of orderCodes.length ? orderCodes : orderCode ? [orderCode] : []) {
        const precomputedEligibility = eligibilityByOrderCode.get(code);
        if (precomputedEligibility?.eligible) {
          queueRenewalTask(code, {
            forceRenewal: precomputedEligibility.forceRenewal,
          });
          await processRenewalTask(code);
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
