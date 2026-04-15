const { deriveOrderCode } = require("./utils");

const pickFirst = (source, keys = []) => {
  for (const key of keys) {
    if (!key) continue;
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
};

const normalizeTransactionLikePayload = (raw = {}) => {
  const transaction_content =
    pickFirst(raw, [
      "content",
      "transaction_content",
      "note",
      "description",
    ]) || "";

  const transaction_date = pickFirst(raw, [
    "transactionDate",
    "transaction_date",
    "transferTime",
    "time",
  ]);

  const amount_in = pickFirst(raw, [
    "amount_in",
    "transferAmount",
    "amountIn",
    "amount",
  ]) || 0;

  return {
    transaction_content,
    transaction_date,
    amount_in,
    code: pickFirst(raw, ["code", "paymentCode"]),
    transaction_id: pickFirst(raw, ["id", "transaction_id", "transactionId"]),
    reference_code: pickFirst(raw, [
      "referenceCode",
      "reference_code",
      "referenceNumber",
      "reference_number",
    ]),
    transfer_type: pickFirst(raw, ["transferType", "transfer_type"]),
    gateway: pickFirst(raw, ["gateway"]),
    note:
      pickFirst(raw, ["note", "description", "content", "transaction_content"]) || "",
    description: pickFirst(raw, ["description"]) || "",
    account_number: pickFirst(raw, ["accountNumber", "account_number"]) || "",
    transfer_amount:
      pickFirst(raw, ["transferAmount", "amount", "amount_in", "amountIn"]) || 0,
    transaction_date_raw: pickFirst(raw, [
      "transactionDate",
      "transaction_date",
      "transferTime",
      "time",
    ]),
  };
};

const normalizeTransactionPayload = (payload) => {
  if (!payload) return null;

  const source =
    payload.transaction && typeof payload.transaction === "object"
      ? payload.transaction
      : payload;
  const normalized = normalizeTransactionLikePayload(source);

  if (
    !normalized.transaction_content &&
    !normalized.transaction_date &&
    !normalized.amount_in
  ) {
    return null;
  }

  return normalized;
};

module.exports = {
  normalizeTransactionPayload,
  deriveOrderCode,
};
