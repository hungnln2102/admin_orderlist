const {
  ADMIN_SCHEMA,
  SCHEMA_ADMIN,
  tableName,
} = require("../../../config/dbSchema");
const {
  normalizeAccountNumber,
  normalizeRoundedMoney,
} = require("../helpers/shopBankInputs");

const LEDGER_TABLE = tableName(
  ADMIN_SCHEMA.SHOP_BANK_ACCOUNT_LEDGER.TABLE,
  SCHEMA_ADMIN
);
const LEDGER_COLS = ADMIN_SCHEMA.SHOP_BANK_ACCOUNT_LEDGER.COLS;
const ACCOUNT_TABLE = tableName(ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.TABLE, SCHEMA_ADMIN);
const ACCOUNT_COLS = ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.COLS;

const ENTRY_TYPES = {
  RECEIPT_IN: "receipt_in",
  WITHDRAW: "withdraw",
  EXTERNAL_OUT: "external_out",
  SUPPLIER_PAYMENT_OUT: "supplier_payment_out",
  REFUND_OUT: "refund_out",
  MAVN_INTERNAL_OUT: "mavn_internal_out",
  MAVN_INTERNAL_IN: "mavn_internal_in",
};

const SOURCE_KINDS = {
  PAYMENT_RECEIPT: "payment_receipt",
  STORE_PROFIT_EXPENSE: "store_profit_expense",
  PAYMENT_SUPPLY: "payment_supply",
  REFUND_CREDIT_NOTE: "refund_credit_note",
  MAVN_INTERNAL_SYNC: "mavn_internal_sync",
  RENEWAL_MAVRYK_AUTO: "renewal_mavryk_auto",
};


const runQuery = async (executor, text, params = []) => {
  if (executor && typeof executor.query === "function" && typeof executor.raw !== "function") {
    let index = 0;
    const pgText = text.replace(/\?/g, () => `$${++index}`);
    return executor.query(pgText, params);
  }
  if (executor && typeof executor.raw === "function") {
    const result = await executor.raw(text, params);
    return { rows: result.rows || [] };
  }
  throw new Error("Invalid query executor");
};

const findAccountIdByReceiver = async (executor, receiverAccount) => {
  const stkKey = normalizeAccountNumber(receiverAccount);
  if (!stkKey) return null;
  const result = await runQuery(
    executor,
    `SELECT ${ACCOUNT_COLS.ID} AS id
     FROM ${ACCOUNT_TABLE}
     WHERE TRIM(REGEXP_REPLACE(${ACCOUNT_COLS.ACCOUNT_NUMBER}, '\\s+', '', 'g')) = ?
     LIMIT 1`,
    [stkKey]
  );
  const row = result.rows?.[0];
  return row?.id ? Number(row.id) : null;
};

const resolveAccountId = async (executor, { accountId = null, receiverAccount = "" } = {}) => {
  const normalizedAccountId = Number(accountId);
  if (Number.isFinite(normalizedAccountId) && normalizedAccountId > 0) {
    return normalizedAccountId;
  }
  return findAccountIdByReceiver(executor, receiverAccount);
};

const findLedgerBySource = async (executor, sourceKind, sourceId) => {
  if (!sourceKind || !sourceId) return null;
  const result = await runQuery(
    executor,
    `SELECT ${LEDGER_COLS.ID} AS id
     FROM ${LEDGER_TABLE}
     WHERE ${LEDGER_COLS.SOURCE_KIND} = ? AND ${LEDGER_COLS.SOURCE_ID} = ?
     LIMIT 1`,
    [sourceKind, sourceId]
  );
  return result.rows?.[0] || null;
};

const lockAccountRow = async (executor, accountId) => {
  const result = await runQuery(
    executor,
    `SELECT
       ${ACCOUNT_COLS.ID} AS id,
       ${ACCOUNT_COLS.BALANCE} AS balance,
       ${ACCOUNT_COLS.TOTAL_RECEIVED} AS total_received,
       ${ACCOUNT_COLS.TOTAL_WITHDRAWN} AS total_withdrawn
     FROM ${ACCOUNT_TABLE}
     WHERE ${ACCOUNT_COLS.ID} = ?
     FOR UPDATE`,
    [accountId]
  );
  return result.rows?.[0] || null;
};

const insertLedgerAndUpdateAccount = async (
  executor,
  {
    accountId,
    entryType,
    amount,
    signedAmount,
    sourceKind = null,
    sourceId = null,
    note = null,
    incrementReceived = 0,
    incrementWithdrawn = 0,
  }
) => {
  const normalizedAmount = normalizeRoundedMoney(amount);
  if (normalizedAmount <= 0) {
    throw new Error("Ledger amount must be positive.");
  }

  const account = await lockAccountRow(executor, accountId);
  if (!account) {
    throw new Error("Shop bank account not found.");
  }

  const currentBalance = normalizeRoundedMoney(account.balance);
  const nextBalance = currentBalance + normalizeRoundedMoney(signedAmount);
  const nextReceived = normalizeRoundedMoney(account.total_received) + normalizeRoundedMoney(incrementReceived);
  const nextWithdrawn = normalizeRoundedMoney(account.total_withdrawn) + normalizeRoundedMoney(incrementWithdrawn);

  await runQuery(
    executor,
    `UPDATE ${ACCOUNT_TABLE}
     SET ${ACCOUNT_COLS.BALANCE} = ?,
         ${ACCOUNT_COLS.TOTAL_RECEIVED} = ?,
         ${ACCOUNT_COLS.TOTAL_WITHDRAWN} = ?,
         ${ACCOUNT_COLS.UPDATED_AT} = NOW()
     WHERE ${ACCOUNT_COLS.ID} = ?`,
    [nextBalance, nextReceived, nextWithdrawn, accountId]
  );

  const insertResult = await runQuery(
    executor,
    `INSERT INTO ${LEDGER_TABLE} (
       ${LEDGER_COLS.SHOP_BANK_ACCOUNT_ID},
       ${LEDGER_COLS.ENTRY_TYPE},
       ${LEDGER_COLS.AMOUNT},
       ${LEDGER_COLS.SIGNED_AMOUNT},
       ${LEDGER_COLS.BALANCE_AFTER},
       ${LEDGER_COLS.SOURCE_KIND},
       ${LEDGER_COLS.SOURCE_ID},
       ${LEDGER_COLS.NOTE}
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING ${LEDGER_COLS.ID} AS id`,
    [
      accountId,
      entryType,
      normalizedAmount,
      normalizeRoundedMoney(signedAmount),
      nextBalance,
      sourceKind,
      sourceId,
      note,
    ]
  );

  return {
    ledgerId: Number(insertResult.rows?.[0]?.id) || 0,
    balanceAfter: nextBalance,
    totalReceived: nextReceived,
    totalWithdrawn: nextWithdrawn,
  };
};

const creditShopBankFromPaymentReceipt = async (
  executor,
  { receiptId, receiverAccount, accountId = null, amount, note = null }
) => {
  const normalizedAmount = normalizeRoundedMoney(amount);
  const normalizedReceiptId = Number(receiptId);
  if (!normalizedReceiptId || normalizedAmount <= 0) return null;

  const existing = await findLedgerBySource(
    executor,
    SOURCE_KINDS.PAYMENT_RECEIPT,
    normalizedReceiptId
  );
  if (existing) return { skipped: true, reason: "duplicate" };

  const resolvedAccountId = await resolveAccountId(executor, {
    accountId,
    receiverAccount,
  });
  if (!resolvedAccountId) return { skipped: true, reason: "unknown_stk" };

  const result = await insertLedgerAndUpdateAccount(executor, {
    accountId: resolvedAccountId,
    entryType: ENTRY_TYPES.RECEIPT_IN,
    amount: normalizedAmount,
    signedAmount: normalizedAmount,
    sourceKind: SOURCE_KINDS.PAYMENT_RECEIPT,
    sourceId: normalizedReceiptId,
    note,
    incrementReceived: normalizedAmount,
    incrementWithdrawn: 0,
  });

  return { accountId: resolvedAccountId, ...result };
};

const creditShopBankSupplierRefund = async (
  executor,
  { accountId, amount, sourceId, note = null }
) => {
  const normalizedAmount = normalizeRoundedMoney(amount);
  const normalizedAccountId = Number(accountId);
  if (!normalizedAccountId || normalizedAmount <= 0) {
    throw new Error("Invalid supplier refund ledger payload.");
  }

  if (sourceId) {
    const existing = await findLedgerBySource(
      executor,
      SOURCE_KINDS.PAYMENT_SUPPLY,
      sourceId
    );
    if (existing) return { skipped: true, reason: "duplicate" };
  }

  return insertLedgerAndUpdateAccount(executor, {
    accountId: normalizedAccountId,
    entryType: ENTRY_TYPES.RECEIPT_IN,
    amount: normalizedAmount,
    signedAmount: normalizedAmount,
    sourceKind: SOURCE_KINDS.PAYMENT_SUPPLY,
    sourceId,
    note,
    incrementReceived: normalizedAmount,
    incrementWithdrawn: 0,
  });
};

const debitShopBankWithdraw = async (
  executor,
  { accountId, amount, sourceKind, sourceId, note = null }
) => {
  const normalizedAmount = normalizeRoundedMoney(amount);
  const normalizedAccountId = Number(accountId);
  if (!normalizedAccountId || normalizedAmount <= 0) {
    throw new Error("Invalid withdraw ledger payload.");
  }

  if (sourceKind && sourceId) {
    const existing = await findLedgerBySource(executor, sourceKind, sourceId);
    if (existing) return { skipped: true, reason: "duplicate" };
  }

  return insertLedgerAndUpdateAccount(executor, {
    accountId: normalizedAccountId,
    entryType: ENTRY_TYPES.WITHDRAW,
    amount: normalizedAmount,
    signedAmount: -normalizedAmount,
    sourceKind,
    sourceId,
    note,
    incrementReceived: 0,
    incrementWithdrawn: normalizedAmount,
  });
};

const debitShopBankExternalOut = async (
  executor,
  { accountId, amount, sourceKind, sourceId, note = null }
) => {
  const normalizedAmount = normalizeRoundedMoney(amount);
  const normalizedAccountId = Number(accountId);
  if (!normalizedAccountId || normalizedAmount <= 0) {
    throw new Error("Invalid external_out ledger payload.");
  }

  if (sourceKind && sourceId) {
    const existing = await findLedgerBySource(executor, sourceKind, sourceId);
    if (existing) return { skipped: true, reason: "duplicate" };
  }

  return insertLedgerAndUpdateAccount(executor, {
    accountId: normalizedAccountId,
    entryType: ENTRY_TYPES.EXTERNAL_OUT,
    amount: normalizedAmount,
    signedAmount: -normalizedAmount,
    sourceKind,
    sourceId,
    note,
    incrementReceived: 0,
    incrementWithdrawn: 0,
  });
};

const debitShopBankSupplierPayment = async (
  executor,
  { accountId, amount, sourceKind = SOURCE_KINDS.PAYMENT_SUPPLY, sourceId, note = null }
) => {
  const normalizedAmount = normalizeRoundedMoney(amount);
  const normalizedAccountId = Number(accountId);
  if (!normalizedAccountId || normalizedAmount <= 0) {
    throw new Error("Invalid supplier payment ledger payload.");
  }

  if (sourceKind && sourceId) {
    const existing = await findLedgerBySource(executor, sourceKind, sourceId);
    if (existing) return { skipped: true, reason: "duplicate" };
  }

  return insertLedgerAndUpdateAccount(executor, {
    accountId: normalizedAccountId,
    entryType: ENTRY_TYPES.SUPPLIER_PAYMENT_OUT,
    amount: normalizedAmount,
    signedAmount: -normalizedAmount,
    sourceKind,
    sourceId,
    note,
    incrementReceived: 0,
    incrementWithdrawn: 0,
  });
};

/**
 * Mục 1: cashout phiếu credit refund — STK do admin chọn trên UI "Đã Hoàn".
 */
const debitShopBankRefundCashout = async (
  executor,
  { accountId, amount, sourceId, note = null }
) => {
  const normalizedAmount = normalizeRoundedMoney(amount);
  const normalizedAccountId = Number(accountId);
  if (!normalizedAccountId || normalizedAmount <= 0) {
    throw new Error("Invalid refund cashout ledger payload.");
  }

  if (sourceId) {
    const existing = await findLedgerBySource(
      executor,
      SOURCE_KINDS.REFUND_CREDIT_NOTE,
      sourceId
    );
    if (existing) return { skipped: true, reason: "duplicate" };
  }

  return insertLedgerAndUpdateAccount(executor, {
    accountId: normalizedAccountId,
    entryType: ENTRY_TYPES.REFUND_OUT,
    amount: normalizedAmount,
    signedAmount: -normalizedAmount,
    sourceKind: SOURCE_KINDS.REFUND_CREDIT_NOTE,
    sourceId,
    note,
    incrementReceived: 0,
    incrementWithdrawn: 0,
  });
};

/**
 * Mục 3: đồng bộ trạng thái đơn MAVN nội bộ (NCC Mavryk shop).
 * `signedAmount > 0` = đơn rời PAID (tiền "trở về" bank, credit STK).
 * `signedAmount < 0` = đơn vào PAID hoặc tăng giá (tiền rời bank, debit STK).
 * Không có dedup theo sourceId vì cùng đơn có thể đảo trạng thái nhiều lần.
 */
const recordMavnInternalSettlement = async (
  executor,
  { accountId, signedAmount, sourceId = null, note = null }
) => {
  const normalizedAccountId = Number(accountId);
  const numericDelta = Number(signedAmount);
  if (!normalizedAccountId || !Number.isFinite(numericDelta) || numericDelta === 0) {
    return { skipped: true, reason: "no_delta" };
  }

  const absAmount = Math.abs(normalizeRoundedMoney(numericDelta));
  const isCredit = numericDelta > 0;
  return insertLedgerAndUpdateAccount(executor, {
    accountId: normalizedAccountId,
    entryType: isCredit ? ENTRY_TYPES.MAVN_INTERNAL_IN : ENTRY_TYPES.MAVN_INTERNAL_OUT,
    amount: absAmount,
    signedAmount: isCredit ? absAmount : -absAmount,
    sourceKind: SOURCE_KINDS.MAVN_INTERNAL_SYNC,
    sourceId,
    note,
    incrementReceived: 0,
    incrementWithdrawn: 0,
  });
};

module.exports = {
  ENTRY_TYPES,
  SOURCE_KINDS,
  findAccountIdByReceiver,
  creditShopBankFromPaymentReceipt,
  creditShopBankSupplierRefund,
  debitShopBankWithdraw,
  debitShopBankExternalOut,
  debitShopBankSupplierPayment,
  debitShopBankRefundCashout,
  recordMavnInternalSettlement,
};
