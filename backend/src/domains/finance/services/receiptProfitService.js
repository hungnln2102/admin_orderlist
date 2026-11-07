const { TABLES, COLS } = require("@/db");
const { TRANSFER_TYPE, ALLOCATION_TYPE } = require("@/constants/receiptStatus");
const { matchBankGateway } = require("@/domains/wallets/services/walletService");
const { getVietnamDateString } = require("@/utils/time");
const { snapshotObligation, receiptMonth } = require("./profitObligationService");

async function resolveWebhookAccount(trx, accountNumber, gateway) {
  const normalized = String(accountNumber || "").replace(/\s+/g, "");
  if (!normalized) return null;
  const columns = COLS.FINANCIAL_ACCOUNTS;
  const candidates = await trx(TABLES.FINANCIAL_ACCOUNTS)
    .where(columns.IS_DELETED, false).where(columns.ACCOUNT_TYPE, "bank")
    .whereRaw("regexp_replace(??, '\\s', '', 'g') = ?", [columns.ACCOUNT_NUMBER, normalized]);
  const bankGateway = gateway && String(gateway).toUpperCase() !== "SEPAY" ? gateway : null;
  const matches = bankGateway ? candidates.filter((account) => matchBankGateway(bankGateway, account)) : candidates;
  return matches.length === 1 ? matches[0] : null;
}

async function startReceiptProfit(trx, receipt, account) {
  if (!account || account.account_scope !== "SHOP" || receipt.transfer_type !== TRANSFER_TYPE.OUT) return;
  const expense = COLS.STORE_PROFIT_EXPENSES;
  const [created] = await trx(TABLES.STORE_PROFIT_EXPENSES).insert({
    [expense.AMOUNT]: receipt.amount,
    [expense.EXPENSE_TYPE]: "monthly_expense",
    [expense.EXPENSE_DATE]: getVietnamDateString(receipt.payment_date),
    [expense.REASON]: receipt.note || "SePay OUT #" + receipt.id,
    [expense.PAYMENT_RECEIPT_ID]: receipt.id,
    [expense.SHOP_BANK_ACCOUNT_ID]: account.id,
    [expense.EXPENSE_META]: JSON.stringify({ source: "shop_out" }),
    [expense.STATUS]: "completed",
  }).returning(expense.ID);
  await trx(TABLES.PAYMENT_RECEIPT).where(COLS.PAYMENT_RECEIPT.ID, receipt.id)
    .update({ [COLS.PAYMENT_RECEIPT.SHOP_OUT_EXPENSE_ID]: created.id });
}

function remainingReceiptExpense(amount, covered, classified) {
  return Math.max(0, Math.round((Number(amount) - Number(covered) - Number(classified)) * 100) / 100);
}

async function syncReceiptProfit(trx, receiptId) {
  const receipt = await trx(TABLES.PAYMENT_RECEIPT).where(COLS.PAYMENT_RECEIPT.ID, receiptId).forUpdate().first();
  if (!receipt?.shop_out_expense_id) return;
  const allocation = COLS.PAYMENT_RECEIPT_ALLOCATIONS;
  const expense = COLS.STORE_PROFIT_EXPENSES;
  const allocations = await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).where(allocation.RECEIPT_ID, receipt.id);
  const covered = allocations.reduce((total, row) => total + Number(row.allocation_type === ALLOCATION_TYPE.SUPPLIER ? row.amount : row.profit_covered_amount || 0), 0);
  const classified = await trx(TABLES.STORE_PROFIT_EXPENSES)
    .where(expense.PAYMENT_RECEIPT_ID, receipt.id).whereNot(expense.ID, receipt.shop_out_expense_id)
    .where(expense.STATUS, "completed").sum({ total: expense.AMOUNT }).first();
  if (covered + Number(classified.total || 0) > Number(receipt.amount)) throw new Error("Receipt profit allocation exceeds amount");
  await trx(TABLES.STORE_PROFIT_EXPENSES).where(expense.ID, receipt.shop_out_expense_id).update({
    [expense.AMOUNT]: remainingReceiptExpense(receipt.amount, covered, classified.total || 0),
    [expense.UPDATED_AT]: trx.fn.now(),
  });
}

async function coverReceiptObligation(trx, receipt, allocationId, type, target, periodMonth) {
  const month = periodMonth || receiptMonth(receipt);
  if (periodMonth && periodMonth !== receiptMonth(receipt) && receipt.shop_out_expense_id) {
    throw new Error("Receipt and obligation must belong to the same month");
  }
  const snapshot = await snapshotObligation(trx, type, target, month);
  if (!receipt.shop_out_expense_id) return;
  const columns = COLS.PAYMENT_RECEIPT_ALLOCATIONS;
  const allocation = await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).where(columns.ID, allocationId).first();
  const used = await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).where(columns.PROFIT_SNAPSHOT_ID, snapshot.id)
    .whereNot(columns.ID, allocationId).sum({ total: columns.AMOUNT }).first();
  const logs = COLS.DEBT_PAYMENT_LOGS;
  const priorPayments = await trx(TABLES.DEBT_PAYMENT_LOGS)
    .where(logs.TARGET_TYPE, type).where(logs.TARGET_ID, target.id)
    .whereRaw("COALESCE(??, TO_CHAR(??, 'YYYY-MM')) = ?", [logs.PERIOD_MONTH, logs.PAYMENT_DATE, month])
    .sum({ total: logs.AMOUNT }).first();
  const covered = Math.min(Number(allocation.amount), Math.max(0, Number(snapshot.amount) - Math.max(Number(used.total || 0), Number(priorPayments.total || 0))));
  await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).where(columns.ID, allocationId).update({
    [columns.PROFIT_SNAPSHOT_ID]: snapshot.id,
    [columns.PROFIT_COVERED_AMOUNT]: covered,
  });
}

async function assertEditableExpense(trx, expense) {
  if (!expense.payment_receipt_id) return;
  const receipt = await trx(TABLES.PAYMENT_RECEIPT).where(COLS.PAYMENT_RECEIPT.ID, expense.payment_receipt_id).first();
  if (receipt?.shop_out_expense_id) throw new Error("Receipt-backed expense must be corrected through receipt allocation");
}

module.exports = { resolveWebhookAccount, startReceiptProfit, syncReceiptProfit, coverReceiptObligation, remainingReceiptExpense, assertEditableExpense };

