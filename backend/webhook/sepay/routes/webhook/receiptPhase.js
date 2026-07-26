const logger = require("@/utils/logger");
const {
  insertPaymentReceipt,
  getReceiptFinancialState,
  insertFinancialAuditLog,
} = require("../../payments");
const { creditShopBankFromPaymentReceipt } = require("@/domains/shop-bank-accounts/services/shopBankLedgerService");
const { toMonthKey, monthKeyFromPaidDateYmd } = require("./postingPhase");

async function processReceiptPhase(client, parsed, loopOrderCodes, resolvedBatchCodes) {
  const transaction = parsed.transaction;
  const transferAmountNormalized = parsed.transferAmountNormalized;
  const resolvedOrderCode = resolvedBatchCodes[0] || loopOrderCodes[0] || null;

  const receiptResult = await insertPaymentReceipt(transaction, { client, orderCode: resolvedOrderCode });
  const receiptId = receiptResult?.id ?? receiptResult?.existingId ?? null;
  const receiptState = await getReceiptFinancialState(client, receiptId);
  const alreadyFinancialPosted = !!receiptState?.is_financial_posted;

  const paidMonthKey =
    monthKeyFromPaidDateYmd(receiptResult?.paidDate) ||
    toMonthKey(transaction.transaction_date || transaction.transaction_date_raw || new Date());

  if (receiptId && alreadyFinancialPosted) {
    await insertFinancialAuditLog(client, {
      payment_receipt_id: receiptId,
      order_code: String(resolvedOrderCode || "").trim(),
      rule_branch: "SKIP_DUPLICATE_OR_ALREADY_POSTED",
      delta: {
        duplicate: !!receiptResult?.duplicate,
        inserted: !!receiptResult?.inserted,
        is_financial_posted: true,
      },
      source: "webhook",
    });
  }

  if (!alreadyFinancialPosted && receiptResult?.inserted && transferAmountNormalized > 0) {
    logger.info("[Webhook][FinancialDebug] Credit shop bank ledger from receipt", {
      receiptId,
      monthKey: paidMonthKey,
      transferAmount: transferAmountNormalized,
    });

    try {
      await creditShopBankFromPaymentReceipt(client, {
        receiptId,
        receiverAccount: transaction.account_number || transaction.accountNumber || "",
        amount: transferAmountNormalized,
        note: transaction.note || transaction.description || null,
      });
    } catch (ledgerError) {
      logger.error("[Webhook][ShopBankLedger] credit from receipt failed", {
        receiptId,
        error: ledgerError.message,
        stack: ledgerError.stack,
      });
      throw ledgerError;
    }
  }

  return {
    receiptResult,
    receiptId,
    alreadyFinancialPosted,
    paidMonthKey,
    resolvedOrderCode,
  };
}

module.exports = { processReceiptPhase };
