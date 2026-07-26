const logger = require("@/utils/logger");
const { insertFinancialAuditLog } = require("../../payments");
const { tryAutoSettleSupplierPaymentByOutbound } = require("./autoSettleSupplierPayment");
const { findAccountIdByReceiver } = require("@/domains/shop-bank-accounts/services/shopBankLedgerService");

async function processOutboundPhase(client, parsed, receiptId, paidMonthKey) {
  const transaction = parsed.transaction;
  const transferAmountNormalized = parsed.transferAmountNormalized;
  const outboundAmount = Math.abs(transferAmountNormalized);
  const contentRaw = String(transaction.transaction_content || "").trim();
  const senderAccount = transaction.account_number || transaction.accountNumber || "";

  let bankAccountId = null;
  try {
    bankAccountId = await findAccountIdByReceiver(client, senderAccount);
  } catch (e) {
    logger.warn("[Webhook] findAccountIdByReceiver failed", { error: e.message });
  }

  const contentLower = contentRaw.toLowerCase();
  const isSupplierPayment =
    /\btt\s+.+\s+k[yỳ]\s+\d/i.test(contentRaw) ||
    /nhap\s*hang|nhap\s*kho|thanh\s*toan\s*ncc|chuyen\s*tien\s*ncc|tt\s*ncc/i.test(contentLower);
  const outboundReason = isSupplierPayment ? "supplier_payment" : "withdrawal";
  const outboundReasonLabel = isSupplierPayment ? "Nhập hàng / Thanh toán NCC" : "Rút tiền / Chuyển ra";

  if (receiptId) {
    await insertFinancialAuditLog(client, {
      payment_receipt_id: receiptId,
      order_code: "",
      rule_branch: "OUTBOUND_TRANSFER_BANK_BALANCE_DEBIT",
      delta: {
        bank_balance_delta: transferAmountNormalized,
        outbound_amount: outboundAmount,
        outbound_reason: outboundReason,
        outbound_reason_label: outboundReasonLabel,
        month_key: paidMonthKey,
        content: contentRaw,
      },
      source: "webhook",
    });
  }

  logger.info("[Webhook] Ghi nhận tiền ra — audit log", {
    receiptId,
    amount: transferAmountNormalized,
    outboundAmount,
    outboundReason,
    outboundReasonLabel,
    monthKey: paidMonthKey,
    content: contentRaw.slice(0, 120),
  });

  if (isSupplierPayment) {
    try {
      await tryAutoSettleSupplierPaymentByOutbound({
        client,
        receiptId,
        transferAmountNormalized,
        paidMonthKey,
        shopBankAccountId: bankAccountId,
      });
    } catch (autoSettleErr) {
      logger.error("[Webhook] AutoSettle supplier failed", {
        receiptId,
        error: autoSettleErr.message,
        stack: autoSettleErr.stack,
      });
    }
  }
}

module.exports = { processOutboundPhase };
