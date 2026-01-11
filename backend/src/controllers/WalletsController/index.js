const { db } = require("../../db");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../config/dbSchema");
const { normalizeTextInput } = require("../../utils/normalizers");

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

const normalizeDate = (value) => {
  if (!value) return "";
  if (value instanceof Date) return value.toLocaleDateString("en-CA");
  const str = String(value);
  const match = str.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : str;
};

const listDailyBalances = async (_req, res) => {
  try {
    const wallets = await db(WALLET_TYPES_TABLE)
      .select({
        id: WALLET_COLS.ID,
        name: WALLET_COLS.WALLET_NAME,
        note: WALLET_COLS.NOTE,
        assetCode: WALLET_COLS.ASSET_CODE,
        linkedWalletId: WALLET_COLS.LINKED_WALLET_ID,
      })
      .orderBy(WALLET_COLS.ID, "asc");

    const balances = await db(DAILY_BALANCES_TABLE)
      .select({
        recordDate: BALANCE_COLS.RECORD_DATE,
        walletId: BALANCE_COLS.WALLET_ID,
      })
      .sum({ amount: BALANCE_COLS.AMOUNT })
      .groupBy(BALANCE_COLS.RECORD_DATE, BALANCE_COLS.WALLET_ID)
      .orderBy(BALANCE_COLS.RECORD_DATE, "desc");

    const normalizedWallets = wallets.map((w) => ({
      id: Number(w.id),
      name: w.name || "",
      field: `wallet_${w.id}`,
      note: w.note || "",
      assetCode: w.assetCode || "",
      linkedWalletId: w.linkedWalletId ? Number(w.linkedWalletId) : null,
    }));

    const rowsByDate = new Map();
    balances.forEach((row) => {
      const rawDate = row.recordDate ?? row.record_date;
      const dateStr = normalizeDate(rawDate);
      if (!rowsByDate.has(dateStr)) {
        rowsByDate.set(dateStr, { recordDate: dateStr, values: {} });
      }
      const target = rowsByDate.get(dateStr);
      const walletField = `wallet_${row.walletId}`;
      target.values[walletField] = Number(row.amount) || 0;
    });

    res.json({
      wallets: normalizedWallets,
      rows: Array.from(rowsByDate.values()),
    });
  } catch (error) {
    console.error("[wallets] Failed to load daily balances:", error);
    res
      .status(500)
      .json({ error: "Không thể tải dữ liệu đồng tiền từ cơ sở dữ liệu." });
  }
};

const saveDailyBalance = async (req, res) => {
  const rawDate = normalizeTextInput(req.body?.recordDate || "");
  const values = req.body?.values || {};

  const dateStr = normalizeDate(rawDate);
  if (!dateStr) {
    return res.status(400).json({ error: "recordDate không hợp lệ." });
  }
  if (!values || typeof values !== "object") {
    return res.status(400).json({ error: "values không hợp lệ." });
  }

  const entries = Object.entries(values)
    .map(([key, val]) => {
      const match = key.match(/^wallet_(\d+)$/i);
      const walletId = match ? Number(match[1]) : null;
      const raw = val === null || val === undefined ? "" : String(val);
      const cleaned = raw.replace(/[^\d.-]/g, "");
      if (!walletId || !cleaned) return null; // skip empty input
      const amount = Number(cleaned);
      return Number.isFinite(amount) ? { walletId, amount } : null;
    })
    .filter(Boolean);

  try {
    await db.transaction(async (trx) => {
      await trx(DAILY_BALANCES_TABLE)
        .where(BALANCE_COLS.RECORD_DATE, dateStr)
        .del();

      if (entries.length) {
        await trx(DAILY_BALANCES_TABLE).insert(
          entries.map((item) => ({
            [BALANCE_COLS.RECORD_DATE]: dateStr,
            [BALANCE_COLS.WALLET_ID]: item.walletId,
            [BALANCE_COLS.AMOUNT]: item.amount,
          }))
        );
      }
    });

    const balances = await db(DAILY_BALANCES_TABLE)
      .select({
        recordDate: BALANCE_COLS.RECORD_DATE,
        walletId: BALANCE_COLS.WALLET_ID,
      })
      .sum({ amount: BALANCE_COLS.AMOUNT })
      .where(BALANCE_COLS.RECORD_DATE, dateStr)
      .groupBy(BALANCE_COLS.RECORD_DATE, BALANCE_COLS.WALLET_ID)
      .orderBy(BALANCE_COLS.WALLET_ID, "asc");

    res.json({ ok: true, recordDate: dateStr, entries: balances });
  } catch (error) {
    console.error("[wallets] Failed to save daily balances:", error);
    res.status(500).json({ error: "Không thể lưu dữ liệu đồng tiền." });
  }
};

module.exports = {
  listDailyBalances,
  saveDailyBalance,
};
