const {
  ADMIN_SCHEMA,
  SCHEMA_ADMIN,
  tableName,
} = require("../../../config/dbSchema");

const LEDGER_TABLE = tableName(
  ADMIN_SCHEMA.USDT_WALLET_LEDGER.TABLE,
  SCHEMA_ADMIN
);
const LEDGER_COLS = ADMIN_SCHEMA.USDT_WALLET_LEDGER.COLS;
const WALLET_TABLE = tableName(ADMIN_SCHEMA.USDT_WALLETS.TABLE, SCHEMA_ADMIN);
const WALLET_COLS = ADMIN_SCHEMA.USDT_WALLETS.COLS;

const ENTRY_TYPES = {
  DEPOSIT_IN: "deposit_in",
  WITHDRAW: "withdraw",
};

const SOURCE_KINDS = {
  ORDER_PAYMENT: "order_payment",
  MANUAL_WITHDRAW: "manual_withdraw",
};

const toUsd = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 10000) / 10000;
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

const findLedgerBySource = async (executor, sourceKind, sourceId) => {
  if (!sourceKind || sourceId == null || sourceId === "") return null;
  const result = await runQuery(
    executor,
    `SELECT ${LEDGER_COLS.ID} AS id
     FROM ${LEDGER_TABLE}
     WHERE ${LEDGER_COLS.SOURCE_KIND} = ? AND ${LEDGER_COLS.SOURCE_ID} = ?
     LIMIT 1`,
    [sourceKind, String(sourceId)]
  );
  return result.rows?.[0] || null;
};

const lockWalletRow = async (executor, walletId) => {
  const result = await runQuery(
    executor,
    `SELECT
       ${WALLET_COLS.ID} AS id,
       ${WALLET_COLS.BALANCE} AS balance,
       ${WALLET_COLS.TOTAL_RECEIVED} AS total_received,
       ${WALLET_COLS.TOTAL_WITHDRAWN} AS total_withdrawn
     FROM ${WALLET_TABLE}
     WHERE ${WALLET_COLS.ID} = ?
     FOR UPDATE`,
    [walletId]
  );
  return result.rows?.[0] || null;
};

const insertLedgerAndUpdateWallet = async (
  executor,
  {
    walletId,
    entryType,
    amount,
    signedAmount,
    sourceKind = null,
    sourceId = null,
    exchangeRate = null,
    vndEquivalent = null,
    note = null,
    incrementReceived = 0,
    incrementWithdrawn = 0,
  }
) => {
  const normalizedAmount = toUsd(amount);
  if (normalizedAmount <= 0) {
    throw new Error("Ledger amount must be positive.");
  }

  const wallet = await lockWalletRow(executor, walletId);
  if (!wallet) {
    throw new Error("USDT wallet not found.");
  }

  const currentBalance = toUsd(wallet.balance);
  const nextBalance = toUsd(currentBalance + toUsd(signedAmount));
  const nextReceived = toUsd(wallet.total_received) + toUsd(incrementReceived);
  const nextWithdrawn = toUsd(wallet.total_withdrawn) + toUsd(incrementWithdrawn);

  await runQuery(
    executor,
    `UPDATE ${WALLET_TABLE}
     SET ${WALLET_COLS.BALANCE} = ?,
         ${WALLET_COLS.TOTAL_RECEIVED} = ?,
         ${WALLET_COLS.TOTAL_WITHDRAWN} = ?,
         ${WALLET_COLS.UPDATED_AT} = NOW()
     WHERE ${WALLET_COLS.ID} = ?`,
    [nextBalance, nextReceived, nextWithdrawn, walletId]
  );

  const insertResult = await runQuery(
    executor,
    `INSERT INTO ${LEDGER_TABLE} (
       ${LEDGER_COLS.USDT_WALLET_ID},
       ${LEDGER_COLS.ENTRY_TYPE},
       ${LEDGER_COLS.AMOUNT},
       ${LEDGER_COLS.SIGNED_AMOUNT},
       ${LEDGER_COLS.BALANCE_AFTER},
       ${LEDGER_COLS.SOURCE_KIND},
       ${LEDGER_COLS.SOURCE_ID},
       ${LEDGER_COLS.EXCHANGE_RATE},
       ${LEDGER_COLS.VND_EQUIVALENT},
       ${LEDGER_COLS.NOTE}
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING ${LEDGER_COLS.ID} AS id`,
    [
      walletId,
      entryType,
      normalizedAmount,
      toUsd(signedAmount),
      nextBalance,
      sourceKind,
      sourceId != null ? String(sourceId) : null,
      exchangeRate != null ? Number(exchangeRate) : null,
      vndEquivalent != null ? Math.round(Number(vndEquivalent)) : null,
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

const creditUsdtWalletFromOrder = async (
  executor,
  {
    walletId,
    orderId,
    amountUsd,
    exchangeRate = null,
    vndEquivalent = null,
    note = null,
  }
) => {
  const normalizedAmount = toUsd(amountUsd);
  const normalizedOrderId = Number(orderId);
  if (!normalizedOrderId || normalizedAmount <= 0) return null;

  const sourceId = String(normalizedOrderId);
  const existing = await findLedgerBySource(
    executor,
    SOURCE_KINDS.ORDER_PAYMENT,
    sourceId
  );
  if (existing) return { skipped: true, reason: "duplicate" };

  const result = await insertLedgerAndUpdateWallet(executor, {
    walletId,
    entryType: ENTRY_TYPES.DEPOSIT_IN,
    amount: normalizedAmount,
    signedAmount: normalizedAmount,
    sourceKind: SOURCE_KINDS.ORDER_PAYMENT,
    sourceId,
    exchangeRate,
    vndEquivalent,
    note,
    incrementReceived: normalizedAmount,
    incrementWithdrawn: 0,
  });

  return { walletId, ...result };
};

const debitUsdtWalletWithdraw = async (
  executor,
  { walletId, amount, sourceKind, sourceId, note = null }
) => {
  const normalizedAmount = toUsd(amount);
  const normalizedWalletId = Number(walletId);
  if (!normalizedWalletId || normalizedAmount <= 0) {
    throw new Error("Invalid USDT withdraw ledger payload.");
  }

  if (sourceKind && sourceId != null) {
    const existing = await findLedgerBySource(executor, sourceKind, String(sourceId));
    if (existing) return { skipped: true, reason: "duplicate" };
  }

  return insertLedgerAndUpdateWallet(executor, {
    walletId: normalizedWalletId,
    entryType: ENTRY_TYPES.WITHDRAW,
    amount: normalizedAmount,
    signedAmount: -normalizedAmount,
    sourceKind,
    sourceId: sourceId != null ? String(sourceId) : null,
    note,
    incrementReceived: 0,
    incrementWithdrawn: normalizedAmount,
  });
};

module.exports = {
  ENTRY_TYPES,
  SOURCE_KINDS,
  creditUsdtWalletFromOrder,
  debitUsdtWalletWithdraw,
  toUsd,
};
