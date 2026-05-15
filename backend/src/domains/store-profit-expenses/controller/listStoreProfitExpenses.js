const { normalizeDateInput } = require("../../../utils/normalizers");
const {
  db,
  logger,
  TABLE,
  COLS,
  VN_DATE_FROM_CREATED_AT_SQL,
  normalizeExpenseTypeList,
  parseAmount,
  mapExpenseRow,
  storeProfitExpensesHasMavnColumns,
} = require("./shared");

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
        .select(...baseCols, db.raw(`${VN_DATE_FROM_CREATED_AT_SQL} AS expense_date`))
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

module.exports = {
  listStoreProfitExpenses,
};
