import type { PaymentReceipt } from "../helpers";

const toSafeString = (value: unknown) => (typeof value === "string" ? value : "");

export const normalizeReceiptRow = (
  row: Partial<PaymentReceipt> & Record<string, unknown>
): PaymentReceipt => {
  return {
    id: Number(row?.id) || 0,
    orderCode: toSafeString(row?.orderCode),
    paidAt: toSafeString(row?.paidAt),
    amount: Number(row?.amount) || 0,
    sender: toSafeString(row?.sender),
    receiver: toSafeString(row?.receiver),
    note: toSafeString(row?.note),
    isFinancialPosted: Boolean(row?.isFinancialPosted),
    postedRevenue: Number(row?.postedRevenue) || 0,
    postedProfit: Number(row?.postedProfit) || 0,
    postedOffFlowBankReceipt: Number(row?.postedOffFlowBankReceipt) || 0,
    reconciledAt: row?.reconciledAt != null ? String(row.reconciledAt) : null,
    adjustmentApplied: Boolean(row?.adjustmentApplied),
    outboundAmount: Number(row?.outboundAmount) || 0,
    outboundReason: toSafeString(row?.outboundReason),
    outboundReasonLabel: toSafeString(row?.outboundReasonLabel),
    outboundContent: toSafeString(row?.outboundContent),
  };
};
