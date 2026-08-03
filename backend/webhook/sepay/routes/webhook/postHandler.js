const { pool, ORDER_COLS, ORDER_TABLE } = require("../../config");
const { safeStringify, normalizeMoney } = require("../../utils");
const { insertFinancialAuditLog, updateReceiptFinancialState } = require("../../payments");
const { isEligibleForRenewal } = require("../../renewal");
const logger = require("@/utils/logger");
const { verifyWebhookAuth } = require("./authPhase");
const { parseWebhookTransaction } = require("./parsePhase");
const {
  resolveOrderCodesByBatchCodes,
  resolveBatchOrderAmountsByBatchCodes,
} = require("./matchPhase");
const {
  PAYMENT_RECEIPT_BATCH_TABLE,
  PAYMENT_RECEIPT_BATCH_ITEM_TABLE,
  REFUND_CREDIT_APPLICATIONS_TABLE,
  isMissingBatchTablesError,
} = require("./constants");
const { dispatchWebhookRenewals } = require("./renewalPhase");
const {
  buildWebhookLoopOrderCodes,
  createWebhookAmountForCodeResolver,
} = require("./orderCodeResolution");
const { resolveBatchCodesByTransferTokens } = require("./resolveBatchCodesByTransfer");
const { resolveBatchCodesByExpectedAmount } = require("./resolveBatchCodesByExpectedAmount");
const { resolveOrderCodesByTransaction } = require("../../paymentReference");

// Import newly extracted phases
const { processReceiptPhase } = require("./receiptPhase");
const { processOrderPaymentPhase } = require("./orderPhase");
const { processOutboundPhase } = require("./outboundPhase");

async function handleWebhookPost(req, res) {
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

  const auth = verifyWebhookAuth(req);
  if (!auth.ok) {
    logger.warn("Webhook auth failed", {
      hasValidSignature: auth.hasValidSignature,
      hasValidApiKey: auth.hasValidApiKey,
      hasAuth: !!req.get("Authorization"),
    });
    return res.status(403).json({ message: "Invalid Signature" });
  }

  const parsed = parseWebhookTransaction(req.body);
  const transaction = parsed?.transaction || null;
  logger.debug("Parsed transaction", { transaction: safeStringify(transaction) });
  if (!transaction || !parsed) {
    return res.status(400).json({ message: "Missing transaction" });
  }

  // Phát sự kiện ra EventBus để tách biệt logic xử lý khỏi HTTP response
  const eventBus = require("@/events/eventBus");
  const EVENTS = require("@/events/eventTypes");
  eventBus.emit(EVENTS.SEPAY_WEBHOOK_RECEIVED, {
    reqBody: req.body,
    parsed,
  });

  // Trả về 200 ngay lập tức cho Sepay
  return res.status(200).json({ message: "Webhook accepted and queued for processing" });
}

async function processWebhookTransactionAsync(reqBody, parsed) {
  const transaction = parsed?.transaction || null;
  const {
    paymentReferenceCodes,
    batchCodes,
    transferAmountNormalized,
    supplierSettlementTransfer,
    singleOrderCode,
  } = parsed;
  const potentialSupplierRefundTransfer = Boolean(parsed?.potentialSupplierRefundTransfer);
  const autoSupplierSettlement = parsed?.autoSupplierSettlement || null;

  try {
    const eligibilityByOrderCode = new Map();
    const stateByOrderCode = new Map();
    const amountDecisionByOrderCode = new Map();
    let loopOrderCodes = [];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Phân giải Batch Code (Code Resolution Phase)
      const batchCodesFromTransfer = await resolveBatchCodesByTransferTokens(
        client,
        paymentReferenceCodes
      );
      const resolvedBatchCodes = [
        ...new Set([...(batchCodes || []), ...batchCodesFromTransfer]),
      ];

      if (resolvedBatchCodes.length === 0 && transferAmountNormalized > 0 && !supplierSettlementTransfer) {
        const batchByAmount = await resolveBatchCodesByExpectedAmount(client, {
          amount: transferAmountNormalized,
        });
        if (batchByAmount.length > 0) {
          resolvedBatchCodes.push(...batchByAmount);
        }
      }

      const batchOrderMap = await resolveOrderCodesByBatchCodes(client, resolvedBatchCodes);
      const batchOrderAmountMap = await resolveBatchOrderAmountsByBatchCodes(
        client,
        resolvedBatchCodes,
        normalizeMoney
      );
      
      const transactionOrderCodes = await resolveOrderCodesByTransaction(client, paymentReferenceCodes);

      loopOrderCodes = buildWebhookLoopOrderCodes({
        batchOrderMap,
        transactionOrderCodes,
        singleOrderCode,
      });

      let getCurrentAmountForCode = createWebhookAmountForCodeResolver({
        batchCodes: resolvedBatchCodes,
        batchOrderAmountMap,
        loopOrderCodes,
        transferAmountNormalized,
      });

      // Lấy state hiện tại của đơn hàng
      for (const code of loopOrderCodes) {
        const stateRes = await client.query(
          `SELECT
            ${ORDER_COLS.id},
            ${ORDER_COLS.idOrder},
            ${ORDER_COLS.idProduct},
            ${ORDER_COLS.status},
            ${ORDER_COLS.expiryDate},
            ${ORDER_COLS.orderDate},
            ${ORDER_COLS.price},
            ${ORDER_COLS.grossSellingPrice},
            ${ORDER_COLS.cost},
            ${ORDER_COLS.idSupply},
            ${ORDER_COLS.customer},
            ${ORDER_COLS.contact},
            (
              SELECT COALESCE(SUM(rca.applied_amount)::numeric, 0)
              FROM ${REFUND_CREDIT_APPLICATIONS_TABLE} rca
              WHERE rca.target_order_list_id = ${ORDER_TABLE}.${ORDER_COLS.id}
            ) AS credit_applied_amount
          FROM ${ORDER_TABLE}
          WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
          LIMIT 1`,
          [code]
        );
        const state = stateRes.rows[0] || null;
        stateByOrderCode.set(code, state);
        eligibilityByOrderCode.set(
          code,
          state ? isEligibleForRenewal(state[ORDER_COLS.status], state[ORDER_COLS.expiryDate]) : null
        );
      }

      const {
        receiptResult,
        receiptId,
        alreadyFinancialPosted,
        paidMonthKey,
        resolvedOrderCode,
      } = await processReceiptPhase(client, parsed, loopOrderCodes, resolvedBatchCodes);

      // Nếu receipt insert thành công và tìm được mã đơn bằng suffix (expected_amount),
      // nhưng mã đơn đó chưa có trong loopOrderCodes, ta thêm vào để tiếp tục xử lý Order Phase.
      if (receiptResult?.orderCode && !loopOrderCodes.includes(receiptResult.orderCode)) {
        const matchedCode = receiptResult.orderCode;
        loopOrderCodes.push(matchedCode);

        getCurrentAmountForCode = createWebhookAmountForCodeResolver({
          batchCodes: resolvedBatchCodes,
          batchOrderAmountMap,
          loopOrderCodes,
          transferAmountNormalized,
        });

        const stateRes = await client.query(
          `SELECT
            ${ORDER_COLS.id},
            ${ORDER_COLS.idOrder},
            ${ORDER_COLS.idProduct},
            ${ORDER_COLS.status},
            ${ORDER_COLS.expiryDate},
            ${ORDER_COLS.orderDate},
            ${ORDER_COLS.price},
            ${ORDER_COLS.grossSellingPrice},
            ${ORDER_COLS.cost},
            ${ORDER_COLS.idSupply},
            ${ORDER_COLS.customer},
            ${ORDER_COLS.contact},
            (
              SELECT COALESCE(SUM(rca.applied_amount)::numeric, 0)
              FROM ${REFUND_CREDIT_APPLICATIONS_TABLE} rca
              WHERE rca.target_order_list_id = ${ORDER_TABLE}.${ORDER_COLS.id}
            ) AS credit_applied_amount
          FROM ${ORDER_TABLE}
          WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
          LIMIT 1`,
          [matchedCode]
        );
        const state = stateRes.rows[0] || null;
        stateByOrderCode.set(matchedCode, state);
        eligibilityByOrderCode.set(
          matchedCode,
          state ? isEligibleForRenewal(state[ORDER_COLS.status], state[ORDER_COLS.expiryDate]) : null
        );
      }

      // 3. Outbound Phase
      if (
        !alreadyFinancialPosted &&
        (!loopOrderCodes.length && !resolvedOrderCode) &&
        transferAmountNormalized > 0 &&
        (supplierSettlementTransfer || potentialSupplierRefundTransfer) &&
        receiptId &&
        !autoSupplierSettlement
      ) {
        await insertFinancialAuditLog(client, {
          payment_receipt_id: receiptId,
          order_code: "",
          rule_branch: "NO_ORDER_CODE_SUPPLIER_SETTLEMENT_SKIP",
          delta: {
            posted_revenue: 0,
            posted_profit: 0,
            month_key: paidMonthKey,
            content: String(transaction.transaction_content || ""),
          },
          source: "webhook",
        });
      } else if (autoSupplierSettlement && receiptId) {
        await insertFinancialAuditLog(client, {
          payment_receipt_id: receiptId,
          order_code: "",
          rule_branch: "NO_ORDER_CODE_SUPPLIER_SETTLEMENT_AUTO_MATCHED",
          delta: {
            supplier_id: autoSupplierSettlement.supplyId,
            expected_refund_amount: autoSupplierSettlement.expectedRefund,
            match_gap: autoSupplierSettlement.gap,
            month_key: paidMonthKey,
            content: String(transaction.transaction_content || ""),
          },
          source: "webhook",
        });
      }

      if (!alreadyFinancialPosted && (receiptResult?.inserted || receiptResult?.duplicate) && transferAmountNormalized < 0 && paidMonthKey) {
        if (receiptResult?.duplicate) {
          logger.info("[Webhook] Outbound receipt duplicate → retry processOutboundPhase (idempotent)", {
            receiptId,
            amount: transferAmountNormalized,
          });
        }
        await processOutboundPhase(client, parsed, receiptId, paidMonthKey);
      }

      // 4. Order Payment & Ledger Update Phase
      let deltas = {
        postedRevenueDelta: 0,
        postedProfitDelta: 0,
        postedImportDelta: 0,
        postedOffFlowBankReceiptDelta: 0,
        transitionedOrderCodesToPaid: new Set(),
      };

      if (transferAmountNormalized > 0 && receiptResult?.inserted) {
        deltas = await processOrderPaymentPhase({
          client,
          parsed,
          loopOrderCodes,
          stateByOrderCode,
          eligibilityByOrderCode,
          amountDecisionByOrderCode,
          getCurrentAmountForCode,
          receiptResult,
          receiptId,
          alreadyFinancialPosted,
          paidMonthKey,
        });
      }

      const {
        postedRevenueDelta,
        postedProfitDelta,
        postedImportDelta,
        postedOffFlowBankReceiptDelta,
      } = deltas;

      // Update Financial State
      if (receiptId) {
        if (!alreadyFinancialPosted && (postedRevenueDelta !== 0 || postedProfitDelta !== 0 || postedOffFlowBankReceiptDelta !== 0)) {
          await updateReceiptFinancialState(client, receiptId, {
            is_financial_posted: true,
            posted_revenue: postedRevenueDelta,
            posted_profit: postedProfitDelta,
            posted_off_flow_bank_receipt: postedOffFlowBankReceiptDelta,
          });
        } else if (!alreadyFinancialPosted) {
          await updateReceiptFinancialState(client, receiptId, {
            is_financial_posted: false,
            posted_revenue: 0,
            posted_profit: 0,
            posted_off_flow_bank_receipt: 0,
          });
          await insertFinancialAuditLog(client, {
            payment_receipt_id: receiptId,
            order_code: String(resolvedOrderCode || "").trim(),
            rule_branch: "WEBHOOK_STATE_NOT_POSTED",
            delta: {
              posted_revenue: 0,
              posted_profit: 0,
              posted_off_flow_bank_receipt: 0,
              is_financial_posted: false,
            },
            source: "webhook",
          });
        }
      }

      // Update Batch Status
      if (receiptId && resolvedBatchCodes.length > 0) {
        try {
          await client.query(
            `UPDATE ${PAYMENT_RECEIPT_BATCH_TABLE}
             SET status = 'paid', paid_receipt_id = $1, paid_at = COALESCE(paid_at, NOW()), updated_at = NOW()
             WHERE UPPER(COALESCE(batch_code::text, '')) = ANY($2::text[])
               AND LOWER(COALESCE(status::text, 'pending')) <> 'cancelled'`,
            [receiptId, resolvedBatchCodes]
          );

          await client.query(
            `UPDATE ${PAYMENT_RECEIPT_BATCH_ITEM_TABLE}
             SET status = 'paid'
             WHERE UPPER(COALESCE(batch_code::text, '')) = ANY($1::text[])
               AND LOWER(COALESCE(status::text, 'pending')) NOT IN ('paid', 'cancelled')`,
            [resolvedBatchCodes]
          );
        } catch (error) {
          if (isMissingBatchTablesError(error)) {
            logger.warn("[Webhook] Skip updating batch status: batch tables missing");
          } else throw error;
        }
      }

      // 5. Commit
      await client.query("COMMIT");

      // 6. Notifications
      if (receiptResult?.inserted) {
        const eventBus = require("@/events/eventBus");
        const EVENTS = require("@/events/eventTypes");

        if (transferAmountNormalized > 0) {
          const hasEligibleRenewal = loopOrderCodes.some(code => eligibilityByOrderCode.get(code)?.eligible);
          eventBus.emit(EVENTS.SEPAY_MONEY_IN, {
            transactionId: transaction.transaction_id || transaction.id || null,
            amount: transferAmountNormalized,
            revenue: postedRevenueDelta,
            offFlow: postedOffFlowBankReceiptDelta,
            cost: postedImportDelta,
            profit: postedProfitDelta,
            monthKey: paidMonthKey,
            orderCode: loopOrderCodes[0] || null,
            bankAccountId: transaction.account_number || transaction.accountNumber || null,
            isOrderPayment: loopOrderCodes.length > 0 && !hasEligibleRenewal,
            isRenewal: hasEligibleRenewal,
          });
        } else if (transferAmountNormalized < 0) {
          eventBus.emit(EVENTS.SEPAY_MONEY_OUT, {
            transactionId: transaction.transaction_id || transaction.id || null,
            amount: transferAmountNormalized,
            bankAccountId: transaction.account_number || transaction.accountNumber || null,
            reason: String(transaction.transaction_content || "").trim(),
          });
        }
      }

      // 7. Gia hạn (Renewal Dispatch)
      try {
        await dispatchWebhookRenewals({
          client,
          loopOrderCodes,
          stateByOrderCode,
          amountDecisionByOrderCode,
          eligibilityByOrderCode,
          getCurrentAmountForCode,
          paidMonthKey,
          receiptId,
          ORDER_COLS,
        });
      } catch (renewErr) {
        logger.error("Renewal flow failed", { error: renewErr.message, stack: renewErr.stack });
      }

    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }

    return { message: "OK" };
  } catch (err) {
    logger.error("Error saving payment", { error: err.message, stack: err.stack });
    throw err;
  }
}

module.exports = {
  handleWebhookPost,
  processWebhookTransactionAsync,
};
