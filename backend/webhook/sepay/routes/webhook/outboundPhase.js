const logger = require("@/utils/logger");
const { insertFinancialAuditLog } = require("../../payments");
const { tryAutoSettleSupplierPaymentByOutbound } = require("./autoSettleSupplierPayment");
const { findAccountIdByReceiver } = require("@/domains/wallet/shop-bank-accounts/services/shopBankLedgerService");
const { hasSupplierSignature } = require("./supplierPaymentSignature");

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

  // Debit shop bank balance immediately when webhook fires
  if (bankAccountId && outboundAmount > 0 && receiptId) {
    const { debitShopBankFromPaymentReceipt } = require("@/domains/wallet/shop-bank-accounts/services/shopBankLedgerService");
    try {
      await debitShopBankFromPaymentReceipt(client, {
        receiptId,
        senderAccount,
        accountId: bankAccountId,
        amount: outboundAmount,
        note: transaction.note || transaction.description || null,
      });
      logger.info("[Webhook] Auto-debit bank balance from outbound receipt", {
        receiptId,
        accountId: bankAccountId,
        amount: outboundAmount,
      });
    } catch (ledgerError) {
      logger.error("[Webhook][ShopBankLedger] debit from outbound receipt failed", {
        receiptId,
        error: ledgerError.message,
      });
    }
  }

  const contentLower = contentRaw.toLowerCase();
  const isSupplierPaymentByContent =
    /\btt\s+.+\s+k[yỳ]\s+\d/i.test(contentRaw) ||
    /nhap\s*hang|nhap\s*kho|thanh\s*toan\s*ncc|chuyen\s*tien\s*ncc|tt\s*ncc/i.test(contentLower);

  // Nhận diện qua chữ ký số tiền: nếu phần dư % 1000 nằm trong vùng 900..999
  // thì khả năng cao đây là thanh toán NCC dùng suffix trừ (amount = nợ - NCC_ID)
  const isSupplierPaymentBySignature = hasSupplierSignature(outboundAmount);

  const isSupplierPayment = isSupplierPaymentByContent || isSupplierPaymentBySignature;
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
        detected_by_signature: isSupplierPaymentBySignature && !isSupplierPaymentByContent,
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
    isSupplierPaymentByContent,
    isSupplierPaymentBySignature,
    monthKey: paidMonthKey,
    content: contentRaw.slice(0, 120),
  });

  if (isSupplierPayment) {
    let settled = false;
    try {
      const result = await tryAutoSettleSupplierPaymentByOutbound({
        client,
        receiptId,
        transferAmountNormalized,
        paidMonthKey,
        shopBankAccountId: bankAccountId,
      });
      if (result) {
        settled = true;
      }
    } catch (autoSettleErr) {
      logger.error("[Webhook] AutoSettle supplier failed", {
        receiptId,
        error: autoSettleErr.message,
        stack: autoSettleErr.stack,
      });
    }

    if (!settled && receiptId) {
      try {
        const flowTypeRes = await client.query(
          `SELECT id FROM billing.receipt_flow_types WHERE code = $1 LIMIT 1`,
          ["import_order"]
        );
        const flowTypeId = flowTypeRes.rows[0]?.id || null;
        if (flowTypeId) {
          await client.query(
            `UPDATE billing.payment_receipt
             SET flow_type_id = $1,
                 flow_classified_at = NOW(),
                 flow_note = $2
             WHERE id = $3`,
            [flowTypeId, `Auto-detected supplier payment outbound (unmatched)`, receiptId]
          );
          logger.info("[Webhook] Pre-classified unmatched outbound supplier payment", {
            receiptId,
            flowTypeId,
          });
        }
      } catch (classifyErr) {
        logger.error("[Webhook] Failed to pre-classify unmatched outbound supplier payment", {
          receiptId,
          error: classifyErr.message,
        });
      }
    }
    return { isSupplierPayment: true, settled };
  }
  return { isSupplierPayment: false, settled: false };
}

module.exports = { processOutboundPhase };
