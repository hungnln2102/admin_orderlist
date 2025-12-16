const { deriveOrderCode } = require("./utils");

const normalizeTransactionPayload = (payload) => {
  if (!payload) return null;
  if (payload.transaction && typeof payload.transaction === "object") {
    return payload.transaction;
  }

  const transaction_content =
    payload.content ||
    payload.description ||
    payload.note ||
    payload.transaction_content ||
    "";
  const transaction_date =
    payload.transactionDate ||
    payload.transaction_date ||
    payload.transferTime ||
    payload.time;
  const amount_in =
    payload.amount_in ||
    payload.transferAmount ||
    payload.amountIn ||
    payload.amount ||
    0;

  if (!transaction_content && !transaction_date && !amount_in) return null;

  return {
    transaction_content,
    transaction_date,
    amount_in,
    note: payload.note || payload.description || payload.content || "",
    description: payload.description || "",
    account_number: payload.accountNumber || payload.account_number || "",
    transfer_amount: payload.transferAmount || payload.amount || payload.amount_in,
    transaction_date_raw:
      payload.transactionDate || payload.transaction_date || payload.transferTime || payload.time,
  };
};

module.exports = {
  normalizeTransactionPayload,
  deriveOrderCode,
};
