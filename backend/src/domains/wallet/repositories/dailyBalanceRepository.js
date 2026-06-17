const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../../config/dbSchema");

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

const DEFAULT_SUPPLIER_REFUND_WALLET_NAME = "VP BANK (MAVRYKSTORE)";

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
    .whereRaw(`LOWER(COALESCE(??, '')) LIKE ?`, [WALLET_COLS.WALLET_NAME, "%mavrykstore%"])
    .orWhereRaw(`LOWER(COALESCE(??, '')) LIKE ?`, [WALLET_COLS.WALLET_NAME, "%vp bank%"])
    .orderBy(WALLET_COLS.ID, "asc")
    .first();
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
};
