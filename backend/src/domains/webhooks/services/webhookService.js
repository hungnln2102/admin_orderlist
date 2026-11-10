const { EVENTS } = require("@/events");
const { processPaymentWebhook } = require("@/domains/payments/services/webhookPaymentService");

async function handleIncomingWebhook(payload = {}) {
  const rawAmount = payload.transferAmount ?? payload.amount ?? payload.accumulatedAmount ?? 0;
  const amount = Math.abs(Number(rawAmount) || 0);
  const rawTransferType = String(
    payload.transferType || payload.transfer_type || (Number(rawAmount) < 0 ? "out" : "in")
  ).toLowerCase();
  const isOutbound = rawTransferType === "out" || Number(rawAmount) < 0;
  const eventType = isOutbound ? EVENTS.WEBHOOK_MONEY_OUT : EVENTS.WEBHOOK_MONEY_IN;

  const eventData = {
    id: payload.id || payload.sepay_transaction_id || payload.transactionId || null,
    amount,
    transferType: isOutbound ? "out" : "in",
    content: payload.content || payload.transactionContent || "",
    referenceCode: payload.referenceCode || payload.code || payload.id || "",
    gateway: payload.gateway || payload.bankBrandName || "SEPAY",
    accountNumber: payload.accountNumber || "",
    transactionDate: payload.transactionDate || new Date().toISOString(),
    rawPayload: payload,
  };

  const payment = await processPaymentWebhook(eventData);

  return { success: true, eventType, data: eventData, payment };
}

module.exports = { handleIncomingWebhook };
