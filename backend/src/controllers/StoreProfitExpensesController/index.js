const { db } = require("../../db");
const logger = require("../../utils/logger");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../config/dbSchema");
const { normalizeDateInput, normalizeTextInput } = require("../../utils/normalizers");
const {
  monthKeyVietnamFromDbTimestamp,
  applyExternalImportProfitDelta,
} = require("../Order/finance/dashboardSummary");

const TABLE = tableName(FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE, SCHEMA_FINANCE);
const COLS = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;
const VN_DATE_FROM_CREATED_AT_SQL =
  "to_char((created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM-DD')";

const normalizeExpenseType = (value) => {
  const normalized = normalizeTextInput(value || "").toLowerCase();
  if (
    normalized === "withdraw_profit" ||
    normalized === "external_import" ||
    normalized === "mavn_import"
  ) {
    return normalized;
  }
  return "";
};

const parseAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const mapExpenseRow = (row) => ({
  id: Number(row.id),
  amount: parseAmount(row.amount),
  reason: row.reason || "",
  expenseDate: row.expense_date || null,
  expenseType: row.expense_type || "",
  linkedOrderCode: row.linked_order_code ?? null,
  expenseMeta: row.expense_meta ?? null,
  createdAt: row.created_at || null,
});

const listStoreProfitExpenses = async (req, res) => {
  const from = normalizeDateInput(req.query?.from);
  const to = normalizeDateInput(req.query?.to);
  const expenseType = normalizeExpenseType(req.query?.expense_type);

  try {
    const baseQuery = db(TABLE);
    if (from) baseQuery.whereRaw(`DATE(${COLS.CREATED_AT}) >= ?`, [from]);
    if (to) baseQuery.whereRaw(`DATE(${COLS.CREATED_AT}) <= ?`, [to]);
    if (expenseType) baseQuery.where(COLS.EXPENSE_TYPE, expenseType);

    const [rows, summaryRow] = await Promise.all([
      baseQuery
        .clone()
        .select(
          COLS.ID,
          COLS.AMOUNT,
          COLS.REASON,
          COLS.EXPENSE_TYPE,
          COLS.LINKED_ORDER_CODE,
          COLS.EXPENSE_META,
          COLS.CREATED_AT,
          db.raw(`${VN_DATE_FROM_CREATED_AT_SQL} AS expense_date`)
        )
        .orderBy(COLS.CREATED_AT, "desc")
        .orderBy(COLS.ID, "desc"),
      baseQuery
        .clone()
        .sum({ total_amount: COLS.AMOUNT })
        .count({ total_rows: COLS.ID })
        .first(),
    ]);

    res.json({
      items: (rows || []).map(mapExpenseRow),
      summary: {
        totalAmount: parseAmount(summaryRow?.total_amount),
        totalRows: Number(summaryRow?.total_rows || 0),
      },
    });
  } catch (error) {
    logger.error("[store-profit-expenses] list failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể tải danh sách chi phí ngoài luồng." });
  }
};

const createStoreProfitExpense = async (req, res) => {
  const amount = parseAmount(req.body?.amount);
  const reason = normalizeTextInput(req.body?.reason || "");
  const expenseType =
    normalizeExpenseType(req.body?.expense_type) || "withdraw_profit";

  if (expenseType === "mavn_import") {
    return res.status(400).json({
      error: "Loại mavn_import chỉ được tạo tự động từ đơn MAVN Đã Thanh Toán.",
    });
  }

  try {
    const row = await db.transaction(async (trx) => {
      const [created] = await trx(TABLE)
        .insert({
          [COLS.AMOUNT]: amount,
          [COLS.REASON]: reason || null,
          [COLS.EXPENSE_TYPE]: expenseType,
        })
        .returning([COLS.ID]);
      const createdId = Number(created?.id ?? created?.[COLS.ID] ?? 0);
      const inserted = await trx(TABLE)
        .select(
          COLS.ID,
          COLS.AMOUNT,
          COLS.REASON,
          COLS.EXPENSE_TYPE,
          COLS.LINKED_ORDER_CODE,
          COLS.EXPENSE_META,
          COLS.CREATED_AT,
          trx.raw(`${VN_DATE_FROM_CREATED_AT_SQL} AS expense_date`)
        )
        .where(COLS.ID, createdId)
        .first();

      if (
        expenseType === "external_import" &&
        amount > 0 &&
        inserted?.[COLS.CREATED_AT]
      ) {
        const mk = await monthKeyVietnamFromDbTimestamp(
          trx,
          inserted[COLS.CREATED_AT]
        );
        if (mk) await applyExternalImportProfitDelta(trx, mk, -amount);
      }

      return inserted;
    });

    res.status(201).json({ item: mapExpenseRow(row || {}) });
  } catch (error) {
    logger.error("[store-profit-expenses] create failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể tạo chi phí ngoài luồng." });
  }
};

const deleteStoreProfitExpense = async (req, res) => {
  const id = Number(req.params.id);

  try {
    const deleted = await db.transaction(async (trx) => {
      const row = await trx(TABLE).select("*").where(COLS.ID, id).first();
      if (!row) return 0;
      const expType = String(row[COLS.EXPENSE_TYPE] || "");
      const amt = parseAmount(row[COLS.AMOUNT]);
      const n = await trx(TABLE).where(COLS.ID, id).del();
      if (
        n &&
        expType === "external_import" &&
        amt > 0 &&
        row[COLS.CREATED_AT]
      ) {
        const mk = await monthKeyVietnamFromDbTimestamp(
          trx,
          row[COLS.CREATED_AT]
        );
        if (mk) await applyExternalImportProfitDelta(trx, mk, amt);
      }
      return n;
    });

    if (!deleted) {
      return res.status(404).json({ error: "Không tìm thấy chi phí ngoài luồng." });
    }
    res.json({ ok: true, id });
  } catch (error) {
    logger.error("[store-profit-expenses] delete failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể xóa chi phí ngoài luồng." });
  }
};

module.exports = {
  listStoreProfitExpenses,
  createStoreProfitExpense,
  deleteStoreProfitExpense,
};
