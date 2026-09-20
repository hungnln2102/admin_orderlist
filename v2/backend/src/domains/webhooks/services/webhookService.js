const { eventBus, EVENTS, recordEvent } = require("@/events");

/**
 * Webhook Service: Xử lý webhook đầu vào, phân loại giao dịch Tiền vào / Tiền ra
 * và phát sự kiện tương ứng vào EventBus.
 */
async function handleIncomingWebhook(payload = {}) {
  const rawAmount = payload.transferAmount ?? payload.amount ?? payload.accumulatedAmount ?? 0;
  const amount = Math.abs(Number(rawAmount) || 0);

  const rawTransferType = String(
    payload.transferType || payload.transfer_type || (Number(rawAmount) < 0 ? "out" : "in")
  ).toLowerCase();

  const isOutbound = rawTransferType === "out" || Number(rawAmount) < 0;
  const eventType = isOutbound ? EVENTS.WEBHOOK_MONEY_OUT : EVENTS.WEBHOOK_MONEY_IN;

  const eventData = {
    amount,
    transferType: isOutbound ? "out" : "in",
    content: payload.content || payload.transactionContent || "",
    referenceCode: payload.referenceCode || payload.code || payload.id || "",
    gateway: payload.gateway || payload.bankBrandName || "SEPAY",
    accountNumber: payload.accountNumber || "",
    transactionDate: payload.transactionDate || new Date().toISOString(),
    rawPayload: payload,
  };

  console.log(
    `🔔 [WebhookDomain] Nhận webhook ${eventData.transferType.toUpperCase()}: ${new Intl.NumberFormat("vi-VN").format(amount)} ₫ (${eventData.gateway})`
  );

  // 1. Ghi nhận sự kiện vào Event Store
  await recordEvent(eventType, eventData, "WEBHOOK");

  // 2. Bắn sự kiện sang EventBus cho các subscriber lắng nghe
  eventBus.emit(eventType, eventData);

  return {
    success: true,
    eventType,
    data: eventData,
  };
}

module.exports = {
  handleIncomingWebhook,
};
