const logger = require("@/utils/logger");
const { ORDER_COLS, ORDER_TABLE } = require("../../config");
const { normalizeMoney } = require("../../utils");
const {
  insertFinancialAuditLog,
  ensureSupplyAndPriceFromOrder,
  updatePaymentSupplyBalance,
  countPaymentReceiptsForOrderCode,
} = require("../../payments");
const { STATUS: ORDER_STATUS } = require("@/utils/statuses");
const {
  isMavnImportOrder,
  isMavrykShopSupplierName,
} = require("@/utils/orderHelpers");
const { getOrderQrPaymentEligibility } = require("../../orderPaymentEligibility");
const { REFUND_CREDIT_APPLICATIONS_TABLE } = require("./constants");
const {
  incrementDashboardSummaryByDelta,
  computeWebhookAmountDecision,
  postWebhookPaymentForOrder,
  getAccumulatedReceiptAmount,
  resolveOrderPriceForWebhookMatch,
  fetchSupplierNameBySupplyId,
} = require("./postingPhase");
const { resolveWebhookPostedRevenue } = require("./orderCodeResolution");
const { withSavepoint } = require("../../savepoint");
const { ensureOffFlowRefundCreditNote } = require("@/domains/orders/controller/finance/offFlowRefundCredits");

async function processOrderPaymentPhase({
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
}) {
  const { transferAmountNormalized, supplierSettlementTransfer } = parsed;
  let postedRevenueDelta = 0;
  let postedProfitDelta = 0;
  let postedImportDelta = 0;
  let postedOffFlowBankReceiptDelta = 0;
  const transitionedOrderCodesToPaid = new Set();

  if (!alreadyFinancialPosted && (receiptResult?.inserted || receiptResult?.duplicate)) {
    for (const code of loopOrderCodes) {
      const currentAmountForCode = getCurrentAmountForCode(code);
      if (isMavnImportOrder({ id_order: code })) {
        logger.info("[Webhook] Skip status update for MAVN (nhập hàng)", { orderCode: code });
        continue;
      }

      const state = stateByOrderCode.get(code);
      if (!state) continue;

      const statusValue = state[ORDER_COLS.status];

      // [Disable auto-posting for PAID order to keep receipt unallocated]
      // Đơn đã Đã Thanh Toán + biên lai mới: tiền vào NH không ghi DT/LN.
      /*
      if (
        receiptResult?.inserted &&
        currentAmountForCode > 0 &&
        statusValue === ORDER_STATUS.PAID
      ) {
        const extraVnd = normalizeMoney(currentAmountForCode);
        await incrementDashboardSummaryByDelta(client, paidMonthKey, {
          offFlowDelta: extraVnd,
          ordersDelta: 0,
          notify: false,
        });
        postedOffFlowBankReceiptDelta += extraVnd;
        if (receiptId) {
          await insertFinancialAuditLog(client, {
            payment_receipt_id: receiptId,
            order_code: code,
            rule_branch: "POST_PAID_ADDITIONAL_OFF_FLOW_BANK_RECEIPT",
            delta: {
              posted_off_flow_bank_receipt: extraVnd,
              month_key: paidMonthKey,
            },
            source: "webhook",
          });
        }
        try {
          await withSavepoint(client, "off_flow_credit_post_paid", async () => {
            await ensureOffFlowRefundCreditNote(client, {
              paymentReceiptId: receiptId,
              offFlowAmount: extraVnd,
              monthKey: paidMonthKey,
              customerName: state?.[ORDER_COLS.customer],
              customerContact: state?.[ORDER_COLS.contact],
              sourceOrderCode: code,
              ruleBranch: "POST_PAID_ADDITIONAL_OFF_FLOW_BANK_RECEIPT",
            });
          });
        } catch (creditErr) {
          logger.warn("[Webhook] Không tạo credit ngoài luồng (biên thêm sau Đã TT)", {
            orderCode: code,
            receiptId,
            error: creditErr.message,
          });
        }
        logger.debug("[Webhook] Ghi nhận tiền NH ngoài luồng DT/LN (biên thêm sau Đã TT)", {
          orderCode: code,
          status: statusValue,
          amount: extraVnd,
        });
        continue;
      }
      */

      const qrEligibility = getOrderQrPaymentEligibility(statusValue);
      if (!qrEligibility.canPayByQr && statusValue !== ORDER_STATUS.PROCESSING) {
        logger.info("[Webhook] Skip QR payment posting for locked order", {
          orderCode: code,
          status: statusValue,
          reason: qrEligibility.reason,
        });
        if (receiptId) {
          await insertFinancialAuditLog(client, {
            payment_receipt_id: receiptId,
            order_code: code,
            rule_branch: qrEligibility.auditBranch,
            delta: {
              order_status: statusValue,
              reason: qrEligibility.reason,
            },
            source: "webhook",
          });
        }
        continue;
      }

      let amountDecision = amountDecisionByOrderCode.get(code) || null;
      if (
        !amountDecision &&
        (
          statusValue === ORDER_STATUS.UNPAID ||
          statusValue === ORDER_STATUS.RENEWAL ||
          statusValue === ORDER_STATUS.PROCESSING
        )
      ) {
        const accumulatedAmount = await getAccumulatedReceiptAmount(
          client,
          code,
          state[ORDER_COLS.orderDate]
        );
        const orderPriceForWebhook = await resolveOrderPriceForWebhookMatch(
          client,
          code,
          state,
          statusValue
        );
        amountDecision = computeWebhookAmountDecision({
          orderPrice: orderPriceForWebhook,
          currentAmount: currentAmountForCode,
          accumulatedAmount,
          creditAppliedAmount: state.credit_applied_amount,
        });

        // SPLIT OVERPAID SURPLUS IN WEBHOOK
        if (amountDecision.complete && amountDecision.offFlowCurrent > 0) {
          const surplus = amountDecision.offFlowCurrent;
          const finalCurrentAmount = currentAmountForCode - surplus;
          const finalAccumulatedAmount = accumulatedAmount - surplus;
          const transaction = parsed.transaction || {};

          // Update original receipt amount in database
          await client.query(
            `UPDATE billing.payment_receipt SET amount = amount - $1 WHERE id = $2`,
            [surplus, receiptId]
          );

          // Insert new transaction for the surplus amount
          const splitNote = `[Tách dư GD #${receiptId}] ${transaction.note || transaction.description || ""}`;
          await client.query(
            `INSERT INTO billing.payment_receipt (
              id_order, amount, payment_date, receiver, note, sender,
              sepay_transaction_id, reference_code, transfer_type, gateway,
              is_financial_posted, posted_revenue, posted_profit, posted_off_flow_bank_receipt,
              reconciled_at, adjustment_applied
            ) VALUES (
              NULL, $1, $2, $3, $4, $5,
              NULL, $6, $7, $8,
              FALSE, 0, 0, 0,
              NULL, FALSE
            )`,
            [
              surplus,
              receiptResult?.paidDate || transaction.transaction_date || new Date(),
              transaction.account_number || transaction.accountNumber || "",
              splitNote.slice(0, 1000),
              transaction.sender || null,
              transaction.reference_code || null,
              transaction.transfer_type || null,
              transaction.gateway || null
            ]
          );

          logger.info(`[Webhook] Tách dư thành công: GD #${receiptId} giảm còn ${finalCurrentAmount}, tạo GD mới cho phần dư ${surplus}`);

          // Recompute amount decision based on exact amount matched
          amountDecision = computeWebhookAmountDecision({
            orderPrice: orderPriceForWebhook,
            currentAmount: finalCurrentAmount,
            accumulatedAmount: finalAccumulatedAmount,
            creditAppliedAmount: state.credit_applied_amount,
          });
        }

        amountDecisionByOrderCode.set(code, amountDecision);
        logger.info("[Webhook][FinancialDebug] Computed payment decision", {
          receiptId,
          orderCode: code,
          orderStatus: statusValue,
          monthKey: paidMonthKey,
          webhookAmount: currentAmountForCode,
          orderPriceAtWebhook: amountDecision.orderPriceAtWebhook,
          creditedAmount: amountDecision.creditedAmount,
          recognizedRevenueCurrent: amountDecision.recognizedRevenueCurrent,
          offFlowCurrent: amountDecision.offFlowCurrent,
          complete: amountDecision.complete,
          branch: amountDecision.branch,
          webhookAmountFlow: amountDecision.webhookAmountFlow,
        });
      }

      const renewalEligibility = eligibilityByOrderCode.get(code);
      if (
        statusValue === ORDER_STATUS.RENEWAL &&
        renewalEligibility?.eligible &&
        amountDecision?.complete
      ) {
        continue;
      }

      if (
        statusValue === ORDER_STATUS.UNPAID ||
        statusValue === ORDER_STATUS.PROCESSING ||
        statusValue === ORDER_STATUS.RENEWAL
      ) {
        if (amountDecision && !amountDecision.complete) {
          if (receiptId) {
            await insertFinancialAuditLog(client, {
              payment_receipt_id: receiptId,
              order_code: code,
              rule_branch: amountDecision.branch,
              delta: {
                received_current: amountDecision.receivedCurrent,
                received_accumulated: amountDecision.receivedAccumulated,
                credit_applied_amount: amountDecision.creditedAmount,
                effective_received_current: amountDecision.effectiveReceivedCurrent,
                effective_received_accumulated: amountDecision.effectiveReceivedAccumulated,
                order_price_at_webhook: amountDecision.orderPriceAtWebhook,
                required_min: amountDecision.requiredMin,
                shortfall_amount: amountDecision.shortfallAmount,
                max_accepted_shortfall: amountDecision.maxAcceptedShortfall,
                recognized_revenue_current: amountDecision.recognizedRevenueCurrent,
                off_flow_current: amountDecision.offFlowCurrent,
                webhook_amount_flow: amountDecision.webhookAmountFlow,
                posted_revenue: 0,
                posted_profit: 0,
                installment_note: "Chưa đủ thu — chờ bù tiền, chưa cộng DT/LN.",
              },
              source: "webhook",
            });
          }
          continue;
        }

        const nextStatus = ORDER_STATUS.PAID;
        const statusUpdateResult = await client.query(
          `UPDATE ${ORDER_TABLE}
           SET ${ORDER_COLS.status} = $2
           WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
             AND ${ORDER_COLS.status} = $3`,
          [code, nextStatus, statusValue]
        );
        if (statusUpdateResult.rowCount > 0) {
          const wireNow =
            amountDecision != null
              ? resolveWebhookPostedRevenue(amountDecision)
              : currentAmountForCode;
          const {
            revenue: rev,
            profit: prof,
            offFlow: flow,
            importDelta: imp,
          } = await postWebhookPaymentForOrder(client, {
            code,
            state,
            receiptId,
            paidMonthKey,
            revenueAmount: wireNow,
            ordersDelta: 1,
            ruleBranch:
              statusValue === ORDER_STATUS.PROCESSING
                ? "PROCESSING_TO_PAID_WEBHOOK_POST"
                : statusValue === ORDER_STATUS.RENEWAL
                  ? amountDecision?.branch || "RENEWAL_TO_PAID_WEBHOOK_POST"
                  : amountDecision?.branch || "EXACT_OR_FULL_COMPLETE",
            amountDecision,
            profitPostingMode: "transition_to_paid",
            notify: false,
          });
          postedRevenueDelta += rev;
          postedProfitDelta += prof;
          postedImportDelta += imp;
          postedOffFlowBankReceiptDelta += flow;
          transitionedOrderCodesToPaid.add(code);
          logger.info("[Webhook][FinancialDebug] Posted order financial delta", {
            receiptId,
            orderCode: code,
            monthKey: paidMonthKey,
            webhookAmount: currentAmountForCode,
            creditedAmount: amountDecision?.creditedAmount ?? 0,
            recognizedRevenueCurrent: amountDecision?.recognizedRevenueCurrent ?? rev,
            postedRevenueDelta: rev,
            postedProfitDelta: prof,
            postedImportDelta: imp,
            postedOffFlowDelta: flow,
            statusTransition: `${statusValue}->${nextStatus}`,
          });
        }
        logger.debug("[Webhook] Order status → Đã Thanh Toán", {
          orderCode: code,
          previousStatus: statusValue,
          nextStatus,
        });
      }
    }
  }

  // [Disable auto-posting for unmatched receipts to keep them unallocated]
  // Xử lý khi không có đơn nào khớp (luồng chưa liên kết)
  /*
  if (
    !alreadyFinancialPosted &&
    !loopOrderCodes.length &&
    transferAmountNormalized > 0 &&
    !supplierSettlementTransfer
  ) {
    await incrementDashboardSummaryByDelta(client, paidMonthKey, {
      offFlowDelta: transferAmountNormalized,
      ordersDelta: 0,
      notify: false,
    });
    postedOffFlowBankReceiptDelta += transferAmountNormalized;
    if (receiptId) {
      await insertFinancialAuditLog(client, {
        payment_receipt_id: receiptId,
        order_code: "",
        rule_branch: "NO_ORDER_CODE_OFF_FLOW_BANK_RECEIPT",
        delta: {
          posted_off_flow_bank_receipt: transferAmountNormalized,
          month_key: paidMonthKey,
        },
        source: "webhook",
      });
    }
    try {
      await withSavepoint(client, "off_flow_credit_no_order", async () => {
        await ensureOffFlowRefundCreditNote(client, {
          paymentReceiptId: receiptId,
          offFlowAmount: transferAmountNormalized,
          monthKey: paidMonthKey,
          ruleBranch: "NO_ORDER_CODE_OFF_FLOW_BANK_RECEIPT",
          note: `Credit ngoài luồng — CK không mã đơn (biên lai #${receiptId || "NA"}).`,
        });
      });
    } catch (creditErr) {
      logger.warn("[Webhook] Không tạo credit ngoài luồng (không mã đơn)", {
        receiptId,
        error: creditErr.message,
      });
    }
  }
  */

  // Cập nhật chi phí nhập hàng cho Nhà Cung Cấp
  if (receiptResult?.inserted) {
    const referenceImport = loopOrderCodes.length > 1 ? null : transferAmountNormalized;
    for (const code of loopOrderCodes) {
      const state = stateByOrderCode.get(code);
      const eligibility = eligibilityByOrderCode.get(code);
      const qrEligibility = getOrderQrPaymentEligibility(state?.[ORDER_COLS.status]);
      const isManualProcessingAwaitingWebhook =
        state?.[ORDER_COLS.status] === ORDER_STATUS.PROCESSING;

      if (!qrEligibility.canPayByQr && !isManualProcessingAwaitingWebhook) continue;
      if (isMavnImportOrder({ id_order: code })) continue;

      const loopSupplyName = await fetchSupplierNameBySupplyId(
        client,
        state?.[ORDER_COLS.idSupply]
      );
      if (isMavrykShopSupplierName(loopSupplyName)) continue;
      if (eligibility?.eligible) continue;

      const priorStatus = state?.[ORDER_COLS.status];
      if (
        priorStatus === ORDER_STATUS.PAID &&
        !transitionedOrderCodesToPaid.has(code)
      ) {
        const receiptN = await countPaymentReceiptsForOrderCode(client, code);
        if (receiptN > 1) continue;
      }

      const ensured = await ensureSupplyAndPriceFromOrder(code, {
        referenceImport,
        client,
      });
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

  return {
    postedRevenueDelta,
    postedProfitDelta,
    postedImportDelta,
    postedOffFlowBankReceiptDelta,
    transitionedOrderCodesToPaid,
  };
}

module.exports = { processOrderPaymentPhase };
