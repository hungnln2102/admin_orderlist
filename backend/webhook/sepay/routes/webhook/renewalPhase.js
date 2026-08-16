const { STATUS: ORDER_STATUS } = require("@/utils/statuses");
const { getOrderQrPaymentEligibility } = require("../../orderPaymentEligibility");
const { isMavnImportOrder } = require("@/utils/orderHelpers");
const { queueRenewalTask, processRenewalTask } = require("../../renewal");
const logger = require("@/utils/logger");
const {
  getAccumulatedReceiptAmount,
  resolveOrderPriceForWebhookMatch,
  computeWebhookAmountDecision,
} = require("./postingPhase");

async function dispatchWebhookRenewals({
  client,
  loopOrderCodes,
  stateByOrderCode,
  amountDecisionByOrderCode,
  eligibilityByOrderCode,
  getCurrentAmountForCode,
  paidMonthKey,
  receiptId,
  ORDER_COLS,
}) {
  const renewalOutcomes = [];
  const monthlyDeltasMap = new Map(); // monthKey -> { revenueDelta, profitDelta, importDelta, codes: [] }

  for (const code of loopOrderCodes) {
    const currentAmountForCode = getCurrentAmountForCode(code);
    const state = stateByOrderCode.get(code);
    const statusValue = state?.[ORDER_COLS.status];
    const qrEligibility = getOrderQrPaymentEligibility(statusValue);
    if (!qrEligibility.canPayByQr) {
      logger.info("[Webhook] Skip renewal for QR-locked order", {
        orderCode: code,
        status: statusValue,
        reason: qrEligibility.reason,
      });
      continue;
    }

    let amountDecision = amountDecisionByOrderCode.get(code) || null;
    if (!amountDecision) {
      if (state && (statusValue === ORDER_STATUS.UNPAID || statusValue === ORDER_STATUS.RENEWAL)) {
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
        amountDecisionByOrderCode.set(code, amountDecision);
      }
    }

    if (amountDecision && !amountDecision.complete) {
      logger.debug("[Webhook] Skip renewal, chờ đủ tiền theo rule (chưa complete)", {
        orderCode: code,
        receivedCurrent: amountDecision.receivedCurrent,
        receivedAccumulated: amountDecision.receivedAccumulated,
        requiredMin: amountDecision.requiredMin,
      });
      continue;
    }

    if (isMavnImportOrder({ id_order: code })) {
      logger.info("[Webhook] Bỏ qua renewal Sepay cho đơn MAVN", { orderCode: code });
      continue;
    }

    const precomputedEligibility = eligibilityByOrderCode.get(code);
    if (precomputedEligibility?.eligible) {
      queueRenewalTask(code, {
        forceRenewal: precomputedEligibility.forceRenewal,
        source: "webhook",
        paymentAmount: currentAmountForCode,
        paymentMonthKey: paidMonthKey,
        paymentReceiptId: receiptId,
        // Gia hạn tự gửi biến động tháng với delta của chính giao dịch webhook -> Đã gom lại ở cuối dispatchWebhookRenewals
        suppressFinanceNotify: true,
        // Gom tin nhắn Telegram gia hạn tự động
        suppressTelegramNotify: true,
      });
      const outcome = await processRenewalTask(code);
      if (outcome && outcome.lastRenewalResult) {
        renewalOutcomes.push({
          orderCode: code,
          result: outcome.lastRenewalResult
        });

        // Tích lũy biến động tài chính
        const deltas = outcome.lastRenewalResult.financialDeltas;
        if (deltas && deltas.monthKey) {
          if (!monthlyDeltasMap.has(deltas.monthKey)) {
            monthlyDeltasMap.set(deltas.monthKey, {
              revenueDelta: 0,
              profitDelta: 0,
              importDelta: 0,
              codes: [],
            });
          }
          const acc = monthlyDeltasMap.get(deltas.monthKey);
          acc.revenueDelta += deltas.revenueDelta || 0;
          acc.profitDelta += deltas.profitDelta || 0;
          acc.importDelta += deltas.importDelta || 0;
          acc.codes.push(code);
        }
      }
    }
  }

  // Gửi một thông báo biến động tài chính tổng hợp cho mỗi monthKey
  if (monthlyDeltasMap.size > 0) {
    const { notifyFinanceMonthlyDelta } = require("@/services/telegramFinanceDeltaNotifier");
    for (const [mKey, acc] of monthlyDeltasMap.entries()) {
      if (acc.revenueDelta || acc.profitDelta || acc.importDelta) {
        try {
          await notifyFinanceMonthlyDelta({
            monthKey: mKey,
            revenueDelta: acc.revenueDelta,
            profitDelta: acc.profitDelta,
            importDelta: acc.importDelta,
            refundDelta: 0,
            offFlowDelta: 0,
            bankBalanceDelta: 0,
            context: `renewal.runRenewalBatch:${acc.codes.join(",")}`,
            executor: client,
          });
        } catch (err) {
          logger.error("[Webhook] Lỗi gửi biến động tháng gộp", { error: err.message });
        }
      }
    }
  }

  if (renewalOutcomes.length > 0) {
    const { sendGroupedRenewalNotification } = require("../../notifications");
    await sendGroupedRenewalNotification(renewalOutcomes);
  }
}

module.exports = {
  dispatchWebhookRenewals,
};
