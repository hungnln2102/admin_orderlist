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
        // Cuối luồng webhook sẽ gửi 1 tin BIẾN ĐỘNG THÁNG tổng hợp.
        suppressFinanceNotify: true,
      });
      await processRenewalTask(code);
    }
  }
}

module.exports = {
  dispatchWebhookRenewals,
};
