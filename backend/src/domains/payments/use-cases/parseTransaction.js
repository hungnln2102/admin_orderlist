const { normalizeAmount } = require("../../../../webhook/sepay/utils");
const {
  normalizeTransactionPayload,
} = require("../../../../webhook/sepay/transactions");
const { extractPaymentReferenceCandidates } = require("../../../../webhook/sepay/paymentReference");
const { BATCH_CODE_REGEX, isBatchCode } = require("../../../../webhook/sepay/routes/webhook/constants");

const ORDER_CODE_REGEX_GLOBAL = /\bMAV[A-Z0-9]{3,20}\b/gi;
const ORDER_CODE_REGEX_STRICT = /^MAV[A-Z0-9]{3,20}$/i;

const normalizeOrderCode = (value) => {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return "";
  return ORDER_CODE_REGEX_STRICT.test(text) ? text : "";
};

const splitTransactionContent = (content) => {
  const parts = (content || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) return [parts[0], parts[0]];
  return [parts[parts.length - 1], parts[0]];
};

const extractOrderCodes = (transaction) => {
  const fields = [
    transaction?.code,
    transaction?.transaction_content,
    transaction?.note,
    transaction?.description,
  ];
  const codes = new Set();
  for (const text of fields) {
    if (!text) continue;
    const str = String(text).trim();
    const parts = str.split("-").map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const matches = part.match(ORDER_CODE_REGEX_GLOBAL);
      if (matches) {
        matches.forEach((m) => {
          const normalized = normalizeOrderCode(m);
          if (normalized) codes.add(normalized);
        });
      } else {
        const normalizedPart = normalizeOrderCode(part);
        if (normalizedPart) codes.add(normalizedPart);
      }
    }
    const globalMatches = str.match(ORDER_CODE_REGEX_GLOBAL);
    if (globalMatches) {
      globalMatches.forEach((m) => {
        const normalized = normalizeOrderCode(m);
        if (normalized) codes.add(normalized);
      });
    }
  }
  return Array.from(codes);
};

const deriveOrderCode = (transaction) => {
  const codes = extractOrderCodes(transaction);
  if (codes.length > 0) return codes[0];
  const [fromSplit] = splitTransactionContent(transaction?.transaction_content);
  return normalizeOrderCode(fromSplit);
};

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
