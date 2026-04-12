const { db } = require("../../db");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../config/dbSchema");
const { normalizeTextInput } = require("../../utils/normalizers");
const logger = require("../../utils/logger");

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

/** Legacy sentinel date (no longer written; rows may exist until migration 038). */
const COLUMN_TOTAL_RECORD_DATE = "1900-01-01";

/** Postgres: undefined_column */
const PG_UNDEFINED_COLUMN = "42703";

const isMissingBalanceScopeColumnError = (err) => {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  if (!msg.includes("balance_scope")) return false;
  return (
    err.code === PG_UNDEFINED_COLUMN ||
    msg.includes("does not exist") ||
    msg.includes("unknown column")
  );
};

const selectWalletTypeColumnsLegacy = () => ({
  id: WALLET_COLS.ID,
  name: WALLET_COLS.WALLET_NAME,
  note: WALLET_COLS.NOTE,
  assetCode: WALLET_COLS.ASSET_CODE,
  isInvestment: WALLET_COLS.IS_INVESTMENT,
  linkedWalletId: WALLET_COLS.LINKED_WALLET_ID,
});

const loadWalletTypesOrdered = async () => {
  try {
    return await db(WALLET_TYPES_TABLE)
      .select(selectWalletTypeColumns())
      .orderBy(WALLET_COLS.ID, "asc");
  } catch (err) {
    if (!isMissingBalanceScopeColumnError(err)) throw err;
    logger.warn(
      "[wallets] balance_scope column missing (run database/migrations/036_wallet_balance_scope.sql). Using legacy select."
    );
    return await db(WALLET_TYPES_TABLE)
      .select(selectWalletTypeColumnsLegacy())
      .orderBy(WALLET_COLS.ID, "asc");
  }
};

const loadWalletScopeByIdMap = async () => {
  try {
    const walletRows = await db(WALLET_TYPES_TABLE).select(
      WALLET_COLS.ID,
      WALLET_COLS.BALANCE_SCOPE
    );
    return new Map(
      walletRows.map((r) => [Number(r.id), parseBalanceScope(r[WALLET_COLS.BALANCE_SCOPE])])
    );
  } catch (err) {
    if (!isMissingBalanceScopeColumnError(err)) throw err;
    const walletRows = await db(WALLET_TYPES_TABLE).select(WALLET_COLS.ID);
    return new Map(walletRows.map((r) => [Number(r.id), "per_row"]));
  }
};

const parseBalanceScope = (raw) => {
  const s = String(raw ?? "per_row").trim().toLowerCase().replace(/-/g, "_");
  return s === "column_total" ? "column_total" : "per_row";
};

const normalizeDate = (value) => {
  if (!value) return "";
  if (value instanceof Date) return value.toLocaleDateString("en-CA");
  const str = String(value);
  const match = str.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : str;
};

const selectWalletTypeColumns = () => ({
  id: WALLET_COLS.ID,
  name: WALLET_COLS.WALLET_NAME,
  note: WALLET_COLS.NOTE,
  assetCode: WALLET_COLS.ASSET_CODE,
  isInvestment: WALLET_COLS.IS_INVESTMENT,
  linkedWalletId: WALLET_COLS.LINKED_WALLET_ID,
  balanceScope: WALLET_COLS.BALANCE_SCOPE,
});

const normalizeWalletRow = (w) => ({
  id: Number(w.id),
  name: w.name || "",
  field: `wallet_${w.id}`,
  note: w.note || "",
  assetCode: w.assetCode || w.asset_code || "",
  isInvestment: Boolean(w.isInvestment ?? w.is_investment),
  linkedWalletId:
    w.linkedWalletId != null || w.linked_wallet_id != null
      ? Number(w.linkedWalletId ?? w.linked_wallet_id)
      : null,
  balanceScope: parseBalanceScope(w.balanceScope ?? w.balance_scope),
});

const listDailyBalances = async (_req, res) => {
  try {
    const wallets = await loadWalletTypesOrdered();

    const balances = await db(DAILY_BALANCES_TABLE)
      .select({
        recordDate: BALANCE_COLS.RECORD_DATE,
        walletId: BALANCE_COLS.WALLET_ID,
      })
      .sum({ amount: BALANCE_COLS.AMOUNT })
      .groupBy(BALANCE_COLS.RECORD_DATE, BALANCE_COLS.WALLET_ID)
      .orderBy(BALANCE_COLS.RECORD_DATE, "desc");

    const normalizedWallets = wallets.map(normalizeWalletRow);

    const rowsByDate = new Map();

    balances.forEach((row) => {
      const rawDate = row.recordDate ?? row.record_date;
      const dateStr = normalizeDate(rawDate);
      if (dateStr === COLUMN_TOTAL_RECORD_DATE) {
        return;
      }

      const wid = Number(row.walletId ?? row.wallet_id);
      if (!rowsByDate.has(dateStr)) {
        rowsByDate.set(dateStr, { recordDate: dateStr, values: {} });
      }
      const target = rowsByDate.get(dateStr);
      target.values[`wallet_${wid}`] = Number(row.amount) || 0;
    });

    const rows = Array.from(rowsByDate.values()).sort((a, b) =>
      a.recordDate < b.recordDate ? 1 : a.recordDate > b.recordDate ? -1 : 0
    );

    res.json({
      wallets: normalizedWallets,
      rows,
    });
  } catch (error) {
    logger.error("[wallets] Failed to load daily balances", { error: error.message, stack: error.stack });
    res
      .status(500)
      .json({ error: "Không thể tải dữ liệu đồng tiền từ cơ sở dữ liệu." });
  }
};

/** wallet_id -> amount from request body (only keys with non-empty numeric input). */
const parseWalletAmountsFromBody = (values) => {
  const map = new Map();
  if (!values || typeof values !== "object") return map;
  for (const [key, val] of Object.entries(values)) {
    const match = key.match(/^wallet_(\d+)$/i);
    const walletId = match ? Number(match[1]) : null;
    if (!walletId) continue;
    const raw = val === null || val === undefined ? "" : String(val);
    const cleaned = raw.replace(/[^\d.-]/g, "");
    if (!cleaned) continue;
    const amount = Number(cleaned);
    if (!Number.isFinite(amount)) continue;
    map.set(walletId, amount);
  }
  return map;
};

const saveDailyBalance = async (req, res) => {
  const rawDate = normalizeTextInput(req.body?.recordDate || "");
  const values = req.body?.values || {};

  const dateStr = normalizeDate(rawDate);
  if (!dateStr) {
    return res.status(400).json({ error: "recordDate không hợp lệ." });
  }
  if (dateStr === COLUMN_TOTAL_RECORD_DATE) {
    return res.status(400).json({
      error: "recordDate không hợp lệ (ngày dành riêng cho hệ thống).",
    });
  }
  if (!values || typeof values !== "object") {
    return res.status(400).json({ error: "values không hợp lệ." });
  }

  const incomingByWallet = parseWalletAmountsFromBody(values);

  try {
    const wallets = await loadWalletTypesOrdered();
    const normalizedWallets = wallets.map(normalizeWalletRow);

    await db.transaction(async (trx) => {
      const existingRows = await trx(DAILY_BALANCES_TABLE)
        .select(BALANCE_COLS.WALLET_ID, BALANCE_COLS.AMOUNT)
        .where(BALANCE_COLS.RECORD_DATE, dateStr);

      const existingByWallet = new Map();
      for (const row of existingRows) {
        const wid = Number(row[BALANCE_COLS.WALLET_ID] ?? row.wallet_id);
        const amt = Number(row[BALANCE_COLS.AMOUNT] ?? row.amount);
        if (Number.isFinite(wid)) {
          existingByWallet.set(wid, Number.isFinite(amt) ? amt : 0);
        }
      }

      await trx(DAILY_BALANCES_TABLE).where(BALANCE_COLS.RECORD_DATE, dateStr).del();

      const inserts = [];

      for (const w of normalizedWallets) {
        const wid = w.id;

        let amount;
        if (incomingByWallet.has(wid)) {
          amount = incomingByWallet.get(wid);
        } else if (existingByWallet.has(wid)) {
          amount = existingByWallet.get(wid);
        } else {
          continue;
        }

        inserts.push({
          [BALANCE_COLS.RECORD_DATE]: dateStr,
          [BALANCE_COLS.WALLET_ID]: wid,
          [BALANCE_COLS.AMOUNT]: amount,
        });
      }

      if (inserts.length) {
        await trx(DAILY_BALANCES_TABLE).insert(inserts);
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
    logger.error("[wallets] Failed to save daily balances", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể lưu dữ liệu đồng tiền." });
  }
};

const createWalletType = async (req, res) => {
  const wallet_name = normalizeTextInput(req.body?.wallet_name || "");
  if (!wallet_name) {
    return res.status(400).json({ error: "Thiếu wallet_name (tên cột hiển thị)." });
  }
  const noteRaw = req.body?.note;
  const note =
    noteRaw === null || noteRaw === undefined || noteRaw === ""
      ? null
      : normalizeTextInput(String(noteRaw)) || null;
  let asset_code = normalizeTextInput(req.body?.asset_code || "") || "VND";
  if (asset_code.length > 50) asset_code = asset_code.slice(0, 50);
  const is_investment = Boolean(req.body?.is_investment);
  const balance_scope = parseBalanceScope(req.body?.balance_scope);

  const insertBase = {
    [WALLET_COLS.WALLET_NAME]: wallet_name,
    [WALLET_COLS.NOTE]: note,
    [WALLET_COLS.ASSET_CODE]: asset_code,
    [WALLET_COLS.IS_INVESTMENT]: is_investment,
    [WALLET_COLS.LINKED_WALLET_ID]: null,
  };

  try {
    let created;
    try {
      [created] = await db(WALLET_TYPES_TABLE)
        .insert({ ...insertBase, [WALLET_COLS.BALANCE_SCOPE]: balance_scope })
        .returning("*");
    } catch (insertErr) {
      if (!isMissingBalanceScopeColumnError(insertErr)) throw insertErr;
      if (balance_scope === "column_total") {
        return res.status(400).json({
          error:
            "Database chưa có cột balance_scope. Chạy file database/migrations/036_wallet_balance_scope.sql để dùng loại cột column_total (tổng cột).",
        });
      }
      [created] = await db(WALLET_TYPES_TABLE).insert(insertBase).returning("*");
    }

    const row = created || {};
    res.status(201).json({
      wallet: normalizeWalletRow({
        id: row.id,
        name: row.wallet_name,
        note: row.note,
        assetCode: row.asset_code,
        isInvestment: row.is_investment,
        linkedWalletId: row.linked_wallet_id,
        balanceScope: row.balance_scope,
      }),
    });
  } catch (error) {
    logger.error("[wallets] create type failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tạo cột ví." });
  }
};

const updateWalletType = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID cột ví không hợp lệ." });
  }
  let legacyNoBalanceScope = false;
  let existing;
  try {
    existing = await db(WALLET_TYPES_TABLE)
      .select(WALLET_COLS.ID, WALLET_COLS.BALANCE_SCOPE)
      .where(WALLET_COLS.ID, id)
      .first();
  } catch (err) {
    if (!isMissingBalanceScopeColumnError(err)) throw err;
    legacyNoBalanceScope = true;
    existing = await db(WALLET_TYPES_TABLE)
      .select(WALLET_COLS.ID)
      .where(WALLET_COLS.ID, id)
      .first();
    if (existing) {
      existing[WALLET_COLS.BALANCE_SCOPE] = "per_row";
    }
  }
  if (!existing) {
    return res.status(404).json({ error: "Không tìm thấy cột ví." });
  }

  const patch = {};
  if (req.body?.wallet_name !== undefined) {
    const wallet_name = normalizeTextInput(String(req.body.wallet_name || ""));
    if (!wallet_name) {
      return res.status(400).json({ error: "wallet_name không được để trống." });
    }
    patch[WALLET_COLS.WALLET_NAME] = wallet_name;
  }
  if (req.body?.note !== undefined) {
    const noteRaw = req.body.note;
    patch[WALLET_COLS.NOTE] =
      noteRaw === null || noteRaw === ""
        ? null
        : normalizeTextInput(String(noteRaw)) || null;
  }
  if (req.body?.asset_code !== undefined) {
    let ac = normalizeTextInput(String(req.body.asset_code || "")) || "VND";
    if (ac.length > 50) ac = ac.slice(0, 50);
    patch[WALLET_COLS.ASSET_CODE] = ac;
  }
  if (req.body?.is_investment !== undefined) {
    patch[WALLET_COLS.IS_INVESTMENT] = Boolean(req.body.is_investment);
  }
  if (req.body?.balance_scope !== undefined) {
    if (legacyNoBalanceScope) {
      return res.status(400).json({
        error:
          "Database chưa có cột balance_scope. Chạy file database/migrations/036_wallet_balance_scope.sql.",
      });
    }
    patch[WALLET_COLS.BALANCE_SCOPE] = parseBalanceScope(req.body.balance_scope);
  }

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: "Không có trường nào để cập nhật." });
  }

  try {
    await db(WALLET_TYPES_TABLE).where(WALLET_COLS.ID, id).update(patch);

    let row;
    try {
      row = await db(WALLET_TYPES_TABLE)
        .select(selectWalletTypeColumns())
        .where(WALLET_COLS.ID, id)
        .first();
    } catch (selErr) {
      if (!isMissingBalanceScopeColumnError(selErr)) throw selErr;
      row = await db(WALLET_TYPES_TABLE)
        .select(selectWalletTypeColumnsLegacy())
        .where(WALLET_COLS.ID, id)
        .first();
    }
    res.json({ wallet: normalizeWalletRow(row) });
  } catch (error) {
    logger.error("[wallets] update type failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể cập nhật cột ví." });
  }
};

const deleteWalletType = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID cột ví không hợp lệ." });
  }
  const existing = await db(WALLET_TYPES_TABLE)
    .select(WALLET_COLS.ID)
    .where(WALLET_COLS.ID, id)
    .first();
  if (!existing) {
    return res.status(404).json({ error: "Không tìm thấy cột ví." });
  }

  try {
    await db.transaction(async (trx) => {
      await trx(WALLET_TYPES_TABLE)
        .where(WALLET_COLS.LINKED_WALLET_ID, id)
        .update({ [WALLET_COLS.LINKED_WALLET_ID]: null });
      await trx(DAILY_BALANCES_TABLE).where(BALANCE_COLS.WALLET_ID, id).del();
      await trx(WALLET_TYPES_TABLE).where(WALLET_COLS.ID, id).del();
    });
    res.json({ ok: true, id });
  } catch (error) {
    logger.error("[wallets] delete type failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể xóa cột ví (có thể đang được tham chiếu)." });
  }
};

module.exports = {
  listDailyBalances,
  saveDailyBalance,
  createWalletType,
  updateWalletType,
  deleteWalletType,
};
