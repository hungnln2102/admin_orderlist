const { TABLES, COLS } = require("@/db");
const { TRANSFER_TYPE } = require("@/constants/receiptStatus");
const { SUPPLIER_PAYMENT_STATUS } = require("@/constants/supplierStatus");
const { debitFinancialAccount } = require("@/domains/wallets/services/walletService");
const { settleSupplierDebtTransaction } = require("@/domains/suppliers/services/supplierSettlementService");
const { resolveWebhookAccount, startReceiptProfit } = require("@/domains/finance/services/receiptProfitService");


async function processOutboundReceiptInTrx({ trx, payload, receipt, receiptId, transferAmount, gateway, noteContent }) {
  const outgoingAccount = await resolveWebhookAccount(trx, payload.accountNumber, gateway);
  if (!outgoingAccount) {
    return { success: true, matched: false, receiptId, transferType: TRANSFER_TYPE.OUT, amount: transferAmount, reason: "ACCOUNT_NOT_RESOLVED" };
}
await trx(TABLES.PAYMENT_RECEIPT).where(COLS.PAYMENT_RECEIPT.ID, receiptId)
  .update({ [COLS.PAYMENT_RECEIPT.FINANCIAL_ACCOUNT_ID]: outgoingAccount.id });
await debitFinancialAccount(trx, {
  accountId: outgoingAccount.id,
  gateway,
  accountScope: "SHOP",
  allowNegativeBalance: true,
  amount: transferAmount,
  sourceKind: "payment_receipt",
  sourceId: receiptId,
  note: noteContent || `Webhook Tiền ra #${receiptId}`,
});

const candidateSuppliers = await trx(`${TABLES.SUPPLIER} as s`)
  .leftJoin(`${TABLES.SUPPLIER_ORDER_COST_LOG} as l`, `l.${COLS.SUPPLIER_ORDER_COST_LOG.SUPPLY_ID}`, `s.${COLS.SUPPLIER.ID}`)
  .where(`l.${COLS.SUPPLIER_ORDER_COST_LOG.NCC_PAYMENT_STATUS}`, SUPPLIER_PAYMENT_STATUS.UNPAID)
  .groupBy(`s.${COLS.SUPPLIER.ID}`, `s.${COLS.SUPPLIER.NUMBER_BANK}`)
  .havingRaw(
    `COALESCE(SUM(l.${COLS.SUPPLIER_ORDER_COST_LOG.IMPORT_COST}), 0) = ? + s.${COLS.SUPPLIER.ID}`,
    [transferAmount]
  )
  .select(`s.${COLS.SUPPLIER.ID}`, `s.${COLS.SUPPLIER.NUMBER_BANK}`);

// Chỉ đạo tối cao của Master: Bỏ đối soát theo nội dung chuyển khoản, chỉ khớp theo số tiền công thức
if (candidateSuppliers.length === 1) {
  const supplierId = Number(candidateSuppliers[0].id);
  const settlement = await settleSupplierDebtTransaction({
    trx,
    supplierId,
    receiptId,
    bankPaidAmount: transferAmount,
    source: "WEBHOOK",
  });
  return {
    success: true,
    matched: settlement.settled,
    receiptId,
    supplierId,
    transferType: TRANSFER_TYPE.OUT,
    amount: transferAmount,
    settlement,
  };
}

await startReceiptProfit(trx, receipt, outgoingAccount);
return {
  success: true,
  matched: false,
  receiptId,
  transferType: TRANSFER_TYPE.OUT,
  amount: transferAmount,
  reason: `Đã lưu Biên lai Tiền ra #${receiptId} chưa phân bổ NCC`,
};
}

module.exports = { processOutboundReceiptInTrx };
