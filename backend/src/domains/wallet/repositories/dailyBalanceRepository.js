const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("@/config/dbSchema");

const WALLET_TYPES_TABLE = tableName(
  FINANCE_SCHEMA.MASTER_WALLETTYPES.TABLE,
  SCHEMA_FINANCE
);
const DAILY_BALANCES_TABLE = tableName(
  FINANCE_SCHEMA.TRANS_DAILYBALANCES.TABLE,
  SCHEMA_FINANCE
);
const WALLET_COLS = FINANCE_SCHEMA.MASTER_WALLETTYPES.COLS;
const BALANCE_COLS = FINANCE_SCHEMA.TRANS_DAILYBALANCES.COLS;
const DAILY_BALANCES_BASE_TABLE = FINANCE_SCHEMA.TRANS_DAILYBALANCES.TABLE;

const DEFAULT_SUPPLIER_REFUND_WALLET_NAME = "VP Bank (Cá nhân)";

const toMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
};

const normalizeDate = (value) => {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  }
  const text = String(value);
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : text;
};

const resolveSupplierRefundWalletName = () =>
  String(
    process.env.SUPPLIER_REFUND_WALLET_NAME || DEFAULT_SUPPLIER_REFUND_WALLET_NAME
  ).trim();

const findWalletTypeByName = async (executor, walletName) => {
  const normalizedName = String(walletName || "").trim().toLowerCase();
  if (!normalizedName) return null;

  const exact = await executor(WALLET_TYPES_TABLE)
    .select({ id: WALLET_COLS.ID, name: WALLET_COLS.WALLET_NAME })
    .whereRaw(`LOWER(TRIM(??)) = ?`, [WALLET_COLS.WALLET_NAME, normalizedName])
    .first();
  if (exact) return exact;

  return executor(WALLET_TYPES_TABLE)
    .select({ id: WALLET_COLS.ID, name: WALLET_COLS.WALLET_NAME })
    .whereRaw(`LOWER(COALESCE(??, '')) LIKE ?`, [WALLET_COLS.WALLET_NAME, "%cá nhân%"])
    .orWhereRaw(`LOWER(COALESCE(??, '')) LIKE ?`, [WALLET_COLS.WALLET_NAME, "%vp bank%"])
    .orderBy(WALLET_COLS.ID, "asc")
    .first();
};

const getColumnTotalWalletIds = async (executor) => {
  try {
    const rows = await executor(WALLET_TYPES_TABLE).select(WALLET_COLS.ID, WALLET_COLS.BALANCE_SCOPE);
    const ids = new Set();
    for (const r of rows) {
      const scope = String(r[WALLET_COLS.BALANCE_SCOPE] ?? r.balance_scope ?? "per_row").trim().toLowerCase().replace(/-/g, "_");
      if (scope === "column_total") {
        ids.add(Number(r[WALLET_COLS.ID] ?? r.id));
      }
    }
    return ids;
  } catch {
    return new Set();
  }
};

const incrementDailyWalletBalance = async (
  executor,
  { walletName, recordDate, amount }
) => {
  const normalizedAmount = toMoney(amount);
  const dateStr = normalizeDate(recordDate);
  if (!dateStr || normalizedAmount === 0) {
    return { skipped: true, reason: "invalid_payload" };
  }

  const wallet = await findWalletTypeByName(executor, walletName);
  if (!wallet?.id) {
    throw new Error(`Không tìm thấy cột ví nhận hoàn NCC: ${walletName}`);
  }

  // 1. Find existing rows for the target date
  const existingRows = await executor(DAILY_BALANCES_TABLE)
    .select(BALANCE_COLS.WALLET_ID)
    .where(BALANCE_COLS.RECORD_DATE, dateStr);
  const existingWids = new Set(existingRows.map(r => Number(r[BALANCE_COLS.WALLET_ID] ?? r.wallet_id)));

  // Query wallet types to identify column_total wallets
  const columnTotalWids = await getColumnTotalWalletIds(executor);

  // 2. Find previous latest balances
  const previousRows = await executor(DAILY_BALANCES_TABLE)
    .select(BALANCE_COLS.WALLET_ID, BALANCE_COLS.AMOUNT)
    .where(BALANCE_COLS.RECORD_DATE, "<", dateStr)
    .orderBy(BALANCE_COLS.RECORD_DATE, "desc");

  const latestByWallet = new Map();
  for (const row of previousRows || []) {
    const wid = Number(row[BALANCE_COLS.WALLET_ID] ?? row.wallet_id);
    if (!latestByWallet.has(wid)) {
      const amt = Number(row[BALANCE_COLS.AMOUNT] ?? row.amount);
      latestByWallet.set(wid, Number.isFinite(amt) ? amt : 0);
    }
  }

  // 3. Insert carry-over balances for missing wallets on this date (only for per_row wallets)
  const carryOverInserts = [];
  for (const [wid, prevAmount] of latestByWallet.entries()) {
    if (!existingWids.has(wid) && !columnTotalWids.has(wid)) {
      carryOverInserts.push({
        [BALANCE_COLS.RECORD_DATE]: dateStr,
        [BALANCE_COLS.WALLET_ID]: wid,
        [BALANCE_COLS.AMOUNT]: prevAmount
      });
    }
  }
  if (carryOverInserts.length > 0) {
    await executor(DAILY_BALANCES_TABLE).insert(carryOverInserts);
  }

  // 4. Finally, apply the increment to the target wallet
  await executor.raw(
    `
      INSERT INTO ${DAILY_BALANCES_TABLE}
        (${BALANCE_COLS.RECORD_DATE}, ${BALANCE_COLS.WALLET_ID}, ${BALANCE_COLS.AMOUNT})
      VALUES (?, ?, ?)
      ON CONFLICT (${BALANCE_COLS.RECORD_DATE}, ${BALANCE_COLS.WALLET_ID})
      DO UPDATE SET ${BALANCE_COLS.AMOUNT} = ${DAILY_BALANCES_BASE_TABLE}.${BALANCE_COLS.AMOUNT} + EXCLUDED.${BALANCE_COLS.AMOUNT}
    `,
    [dateStr, Number(wallet.id), normalizedAmount]
  );

  return {
    skipped: false,
    recordDate: dateStr,
    walletId: Number(wallet.id),
    walletName: wallet.name || walletName,
    amount: normalizedAmount,
  };
};

const findWalletTypeById = async (executor, id) => {
  const normalizedId = Number(id);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;

  return executor(WALLET_TYPES_TABLE)
    .select({ id: WALLET_COLS.ID, name: WALLET_COLS.WALLET_NAME })
    .where(WALLET_COLS.ID, normalizedId)
    .first();
};

const incrementDailyWalletBalanceById = async (
  executor,
  { walletId, recordDate, amount }
) => {
  const normalizedAmount = toMoney(amount);
  const dateStr = normalizeDate(recordDate);
  if (!dateStr || !walletId || normalizedAmount === 0) {
    return { skipped: true, reason: "invalid_payload" };
  }

  const wallet = await findWalletTypeById(executor, walletId);
  if (!wallet?.id) {
    throw new Error(`Không tìm thấy cột ví nhận: ID ${walletId}`);
  }

  // 1. Find existing rows for the target date
  const existingRows = await executor(DAILY_BALANCES_TABLE)
    .select(BALANCE_COLS.WALLET_ID)
    .where(BALANCE_COLS.RECORD_DATE, dateStr);
  const existingWids = new Set(existingRows.map(r => Number(r[BALANCE_COLS.WALLET_ID] ?? r.wallet_id)));

  // Query wallet types to identify column_total wallets
  const columnTotalWids = await getColumnTotalWalletIds(executor);

  // 2. Find previous latest balances
  const previousRows = await executor(DAILY_BALANCES_TABLE)
    .select(BALANCE_COLS.WALLET_ID, BALANCE_COLS.AMOUNT)
    .where(BALANCE_COLS.RECORD_DATE, "<", dateStr)
    .orderBy(BALANCE_COLS.RECORD_DATE, "desc");

  const latestByWallet = new Map();
  for (const row of previousRows || []) {
    const wid = Number(row[BALANCE_COLS.WALLET_ID] ?? row.wallet_id);
    if (!latestByWallet.has(wid)) {
      const amt = Number(row[BALANCE_COLS.AMOUNT] ?? row.amount);
      latestByWallet.set(wid, Number.isFinite(amt) ? amt : 0);
    }
  }

  // 3. Insert carry-over balances for missing wallets on this date (only for per_row wallets)
  const carryOverInserts = [];
  for (const [wid, prevAmount] of latestByWallet.entries()) {
    if (!existingWids.has(wid) && !columnTotalWids.has(wid)) {
      carryOverInserts.push({
        [BALANCE_COLS.RECORD_DATE]: dateStr,
        [BALANCE_COLS.WALLET_ID]: wid,
        [BALANCE_COLS.AMOUNT]: prevAmount
      });
    }
  }
  if (carryOverInserts.length > 0) {
    await executor(DAILY_BALANCES_TABLE).insert(carryOverInserts);
  }

  // 4. Finally, apply the increment to the target wallet
  await executor.raw(
    `
      INSERT INTO ${DAILY_BALANCES_TABLE}
        (${BALANCE_COLS.RECORD_DATE}, ${BALANCE_COLS.WALLET_ID}, ${BALANCE_COLS.AMOUNT})
      VALUES (?, ?, ?)
      ON CONFLICT (${BALANCE_COLS.RECORD_DATE}, ${BALANCE_COLS.WALLET_ID})
      DO UPDATE SET ${BALANCE_COLS.AMOUNT} = ${DAILY_BALANCES_BASE_TABLE}.${BALANCE_COLS.AMOUNT} + EXCLUDED.${BALANCE_COLS.AMOUNT}
    `,
    [dateStr, Number(wallet.id), normalizedAmount]
  );

  return {
    skipped: false,
    recordDate: dateStr,
    walletId: Number(wallet.id),
    walletName: wallet.name || "",
    amount: normalizedAmount,
  };
};

const creditSupplierRefundToDailyWallet = (executor, { recordDate, amount }) =>
  incrementDailyWalletBalance(executor, {
    walletName: resolveSupplierRefundWalletName(),
    recordDate,
    amount,
  });

module.exports = {
  DEFAULT_SUPPLIER_REFUND_WALLET_NAME,
  creditSupplierRefundToDailyWallet,
  incrementDailyWalletBalance,
  findWalletTypeById,
  incrementDailyWalletBalanceById,
};

