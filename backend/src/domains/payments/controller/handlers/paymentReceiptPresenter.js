const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toStringOrEmpty = (value) => (value == null ? "" : String(value));

const normalizeOutboundAuditDelta = (delta = {}) => ({
  outboundAmount:
    toNumber(delta.outbound_amount) ||
    Math.abs(toNumber(delta.bank_balance_delta)),
  outboundReason: toStringOrEmpty(delta.outbound_reason).trim(),
  outboundReasonLabel: toStringOrEmpty(delta.outbound_reason_label).trim(),
  outboundContent: toStringOrEmpty(delta.content).trim(),
});

const buildPaymentReceiptResponse = (row = {}, outboundAudit = {}) => ({
  id: toNumber(row.id),
  orderCode: toStringOrEmpty(row.orderCode),
  paidAt: toStringOrEmpty(row.paidAt),
  amount: toNumber(row.amount),
  sender: toStringOrEmpty(row.sender),
  receiver: toStringOrEmpty(row.receiver),
  note: toStringOrEmpty(row.note),
  isFinancialPosted: Boolean(row.isFinancialPosted),
  postedRevenue: toNumber(row.postedRevenue),
  postedProfit: toNumber(row.postedProfit),
  postedOffFlowBankReceipt: toNumber(row.postedOffFlowBankReceipt),
  reconciledAt: row.reconciledAt || null,
  adjustmentApplied: Boolean(row.adjustmentApplied),
  outboundAmount: toNumber(outboundAudit.outboundAmount),
  outboundReason: toStringOrEmpty(outboundAudit.outboundReason),
  outboundReasonLabel: toStringOrEmpty(outboundAudit.outboundReasonLabel),
  outboundContent: toStringOrEmpty(outboundAudit.outboundContent),
});

module.exports = {
  buildPaymentReceiptResponse,
  normalizeOutboundAuditDelta,
};
