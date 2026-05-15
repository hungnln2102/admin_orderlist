const {
  db,
  logger,
  TABLE,
  COLS,
  VN_DATE_FROM_CREATED_AT_SQL,
  normalizeTextInput,
  normalizeExpenseType,
  parseAmount,
  normalizeExpenseMetaInput,
  ensureNotDuplicateMavnInternalExternalImport,
  mapExpenseRow,
  storeProfitExpensesHasMavnColumns,
  monthKeyVietnamFromDbTimestamp,
  mergeSummaryUpdates,
  MAVN_INTERNAL_EXTERNAL_IMPORT_BLOCKED,
} = require("./shared");

const createStoreProfitExpense = async (req, res) => {
  const amount = parseAmount(req.body?.amount);
  const reason = normalizeTextInput(req.body?.reason || "");
  const expenseType = normalizeExpenseType(req.body?.expense_type) || "withdraw_profit";
  const linkedOrderCodeRaw = normalizeTextInput(
    req.body?.linked_order_code || req.body?.linkedOrderCode || ""
  );
  const linkedOrderCode = linkedOrderCodeRaw ? linkedOrderCodeRaw.slice(0, 64) : "";
  const metaInput = normalizeExpenseMetaInput(req.body?.expense_meta);

  if (expenseType === "mavn_import") {
    return res.status(400).json({
      error: "Loại mavn_import chỉ được tạo tự động từ đơn MAVN Đã Thanh Toán.",
    });
  }

  try {
    const hasMavnCols = await storeProfitExpensesHasMavnColumns();
    const row = await db.transaction(async (trx) => {
      if (expenseType === "external_import" && linkedOrderCode) {
        await ensureNotDuplicateMavnInternalExternalImport(trx, linkedOrderCode);
      }

      const insertPayload = {
        [COLS.AMOUNT]: amount,
        [COLS.REASON]: reason || null,
        [COLS.EXPENSE_TYPE]: expenseType,
      };

      if (hasMavnCols && linkedOrderCode) {
        insertPayload[COLS.LINKED_ORDER_CODE] = linkedOrderCode;
      }
      if (hasMavnCols) {
        const resolvedMeta =
          metaInput ||
          (expenseType === "external_import" && linkedOrderCode
            ? { source: "manual_external_import", flow: "mavryk_renewal_manual" }
            : null);
        if (resolvedMeta && Object.keys(resolvedMeta).length > 0) {
          insertPayload[COLS.EXPENSE_META] = trx.raw("?::jsonb", [
            JSON.stringify(resolvedMeta),
          ]);
        }
      }

      const [created] = await trx(TABLE).insert(insertPayload).returning([COLS.ID]);
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
        const mk = await monthKeyVietnamFromDbTimestamp(trx, inserted[COLS.CREATED_AT]);
        if (mk) {
          const updates = { estimated_bank_balance: -amount };
          if (expenseType === "external_import") {
            updates.total_profit = -amount;
          }
          await mergeSummaryUpdates(trx, mk, updates, {
            context: `createStoreProfitExpense.${expenseType}`,
          });
        }
      }

      return inserted;
    });

    res.status(201).json({ item: mapExpenseRow(row || {}) });
  } catch (error) {
    if (error?.code === MAVN_INTERNAL_EXTERNAL_IMPORT_BLOCKED) {
      return res.status(409).json({
        error:
          "Đơn MAVN NCC nội bộ đã có log linked với mã đơn này; không tạo external_import trùng để tránh trừ bank/lợi nhuận lặp.",
      });
    }
    logger.error("[store-profit-expenses] create failed", {
      error: error.message,
      stack: error.stack,
      payload: {
        amount,
        expenseType,
        hasReason: Boolean(reason),
        hasLinkedOrderCode: Boolean(linkedOrderCode),
        hasMeta: metaInput && Object.keys(metaInput).length > 0,
      },
      pgCode: error.code,
      pgDetail: error.detail,
      pgConstraint: error.constraint,
    });
    res.status(500).json({ error: "Không thể tạo chi phí ngoài luồng." });
  }
};

module.exports = {
  createStoreProfitExpense,
};
