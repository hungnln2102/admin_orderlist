const { normalizeAmount } = require("../../utils");
const { normalizeTransactionPayload } = require("../../transactions");
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

  const paymentReferenceCodes = extractPaymentReferenceCandidates(transaction);
  const explicitBatchCodes = extractBatchCodes(transaction);
  
  const orderCodes = [];
  const batchCodes = [
    ...new Set([
      ...explicitBatchCodes,
    ]),
  ];

  const rawAmount = normalizeAmount(
    transaction.transfer_amount || transaction.amount_in
  );
  // SePay always sends transferAmount as a positive number.
  // Use transferType to determine direction: "out" = money leaving the account.
  const transferType = String(
    transaction.transfer_type || transaction.transferType || ""
  ).trim().toLowerCase();
  const isOutbound = transferType === "out";
  const transferAmountNormalized = isOutbound ? -Math.abs(rawAmount) : rawAmount;
  const supplierSettlementTransfer = isSupplierSettlementTransfer(transaction);

  return {
    transaction,
    orderCode: null,
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
