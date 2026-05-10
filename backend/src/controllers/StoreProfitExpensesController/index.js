const { db } = require("../../db");
const logger = require("../../utils/logger");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../config/dbSchema");
const { normalizeDateInput, normalizeTextInput } = require("../../utils/normalizers");
const {
  monthKeyVietnamFromDbTimestamp,
  applyExternalImportProfitDelta,
  applyEstimatedBankBalanceDelta,
} = require("../Order/finance/dashboardSummary");
const {
  storeProfitExpensesHasMavnColumns,
} = require("../Order/finance/storeProfitExpensesHasMavnColumns");

const TABLE = tableName(FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE, SCHEMA_FINANCE);
const COLS = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;
const VN_DATE_FROM_CREATED_AT_SQL =
  "to_char((created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM-DD')";

const ALLOWED_EXPENSE_TYPES = new Set([
  "withdraw_profit",
  "external_import",
  "mavn_import",
]);

const normalizeExpenseType = (value) => {
  const normalized = normalizeTextInput(value || "").toLowerCase();
  if (ALLOWED_EXPENSE_TYPES.has(normalized)) {
    return normalized;
  }
  return "";
};

/** Hỗ trợ nhiều loại trong 1 query (`?expense_type=external_import,mavn_import`). */
const normalizeExpenseTypeList = (value) => {
  if (value === undefined || value === null) return [];
  const raw = String(value).trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => ALLOWED_EXPENSE_TYPES.has(part));
};

const parseAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const normalizeExpenseMetaInput = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  return value;
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
  const expenseTypeList = normalizeExpenseTypeList(req.query?.expense_type);

  try {
    const hasMavnCols = await storeProfitExpensesHasMavnColumns();
    const baseCols = [
      COLS.ID,
      COLS.AMOUNT,
      COLS.REASON,
      COLS.EXPENSE_TYPE,
      ...(hasMavnCols ? [COLS.LINKED_ORDER_CODE, COLS.EXPENSE_META] : []),
      COLS.CREATED_AT,
    ];
    const baseQuery = db(TABLE);
    if (from) baseQuery.whereRaw(`DATE(${COLS.CREATED_AT}) >= ?`, [from]);
    if (to) baseQuery.whereRaw(`DATE(${COLS.CREATED_AT}) <= ?`, [to]);
    if (expenseTypeList.length === 1) {
      baseQuery.where(COLS.EXPENSE_TYPE, expenseTypeList[0]);
    } else if (expenseTypeList.length > 1) {
      baseQuery.whereIn(COLS.EXPENSE_TYPE, expenseTypeList);
    }

    const [rows, summaryRow] = await Promise.all([
      baseQuery
        .clone()
        .select(
          ...baseCols,
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
  const linkedOrderCodeRaw = normalizeTextInput(
    req.body?.linked_order_code || req.body?.linkedOrderCode || ""
  );
  const linkedOrderCode = linkedOrderCodeRaw
    ? linkedOrderCodeRaw.slice(0, 64)
    : "";
  const metaInput = normalizeExpenseMetaInput(req.body?.expense_meta);

  if (expenseType === "mavn_import") {
    return res.status(400).json({
      error: "Loại mavn_import chỉ được tạo tự động từ đơn MAVN Đã Thanh Toán.",
    });
  }

  try {
    const hasMavnCols = await storeProfitExpensesHasMavnColumns();
    const row = await db.transaction(async (trx) => {
      const insertPayload = {
        [COLS.AMOUNT]: amount,
        [COLS.REASON]: reason || null,
        [COLS.EXPENSE_TYPE]: expenseType,
      };

      if (hasMavnCols) {
        insertPayload[COLS.LINKED_ORDER_CODE] = linkedOrderCode || null;
        insertPayload[COLS.EXPENSE_META] =
          metaInput ||
          (expenseType === "external_import" && linkedOrderCode
            ? {
                source: "manual_external_import",
                flow: "mavryk_renewal_manual",
              }
            : null);
      }

      const [created] = await trx(TABLE)
        .insert(insertPayload)
        .returning([COLS.ID]);
      const createdId = Number(created?.id ?? created?.[COLS.ID] ?? 0);
      const inserted = await trx(TABLE)
        .select(
          COLS.ID,
          COLS.AMOUNT,
          COLS.REASON,
          COLS.EXPENSE_TYPE,
          ...(hasMavnCols ? [COLS.LINKED_ORDER_CODE, COLS.EXPENSE_META] : []),
          COLS.CREATED_AT,
          trx.raw(`${VN_DATE_FROM_CREATED_AT_SQL} AS expense_date`)
        )
        .where(COLS.ID, createdId)
        .first();

      if (
        (expenseType === "external_import" || expenseType === "withdraw_profit") &&
        amount > 0 &&
        inserted?.[COLS.CREATED_AT]
      ) {
        const mk = await monthKeyVietnamFromDbTimestamp(
          trx,
          inserted[COLS.CREATED_AT]
        );
        if (mk) await applyEstimatedBankBalanceDelta(trx, mk, -amount);
      }

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
        (expType === "external_import" || expType === "withdraw_profit") &&
        amt > 0 &&
        row[COLS.CREATED_AT]
      ) {
        const mk = await monthKeyVietnamFromDbTimestamp(
          trx,
          row[COLS.CREATED_AT]
        );
        if (mk) await applyEstimatedBankBalanceDelta(trx, mk, amt);
      }

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
