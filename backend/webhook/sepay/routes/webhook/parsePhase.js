const { normalizeAmount, extractOrderCodes } = require("../../utils");
const {
  normalizeTransactionPayload,
  deriveOrderCode,
} = require("../../transactions");
const { extractPaymentReferenceCandidates } = require("../../paymentReference");
const { BATCH_CODE_REGEX, isBatchCode } = require("./constants");

const isSupplierSettlementTransfer = (transaction) => {
  const content = String(transaction?.transaction_content || "").trim();
  if (!content) return false;
  return /^TT\s+.+\s+k[ỳy]\s+\d{8}$/i.test(content);
};

const extractBatchCodes = (transaction) => {
  const fields = [
    transaction?.code,
    transaction?.transaction_content,
    transaction?.note,
    transaction?.description,
  ];
  const out = new Set();
  for (const field of fields) {
    const matches = String(field || "").toUpperCase().match(BATCH_CODE_REGEX) || [];
    for (const code of matches) {
      const normalized = String(code || "").trim().toUpperCase();
      if (normalized) out.add(normalized);
    }
  }
  return [...out];
};

function parseWebhookTransaction(payload) {
  const transaction = normalizeTransactionPayload(payload);
  if (!transaction) return null;

  const orderCode = deriveOrderCode(transaction);
  const paymentReferenceCodes = extractPaymentReferenceCandidates(transaction);
  const extractedOrderCodes = extractOrderCodes(transaction);
  const explicitBatchCodes = extractBatchCodes(transaction);
  const normalizedPrimary = String(orderCode || "").trim().toUpperCase();
  const normalizedExtracted = extractedOrderCodes
    .map((code) => String(code || "").trim().toUpperCase())
    .filter(Boolean);
  const orderCodes = [
    ...new Set(
      normalizedExtracted.length > 0
        ? normalizedExtracted
        : normalizedPrimary
          ? [normalizedPrimary]
          : []
    ),
  ];
  const batchCodes = [
    ...new Set([
      ...explicitBatchCodes,
      ...orderCodes.filter((code) => isBatchCode(code)),
    ]),
  ];

  const transferAmountNormalized = normalizeAmount(
    transaction.transfer_amount || transaction.amount_in
  );
  const supplierSettlementTransfer = isSupplierSettlementTransfer(transaction);

  return {
    transaction,
    orderCode,
    paymentReferenceCodes,
    orderCodes,
    batchCodes,
    transferAmountNormalized,
    supplierSettlementTransfer,
  };
}

module.exports = {
  parseWebhookTransaction,
  isSupplierSettlementTransfer,
  extractBatchCodes,
};
