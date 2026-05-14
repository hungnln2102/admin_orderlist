const {
  db,
  logger,
  TABLE,
  COLS,
  VN_DATE_FROM_CREATED_AT_SQL,
  normalizeTextInput,
  mapExpenseRow,
  storeProfitExpensesHasMavnColumns,
} = require("./shared");

/**
 * PATCH /api/store-profit-expenses/:id
 * Body: { trace_code?: string, linked_order_code?: string, reason?: string }
 *
 * Hiện chỉ cho phép sửa các trường mô tả (trace_code merge vào expense_meta;
 * reason + linked_order_code update cột riêng). KHÔNG đụng amount / expense_type
 * để tránh đảo lộn dashboard summary đã commit khi tạo log.
 */
const updateStoreProfitExpense = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "id không hợp lệ." });
  }

  const traceCodeRaw = normalizeTextInput(
    req.body?.trace_code ?? req.body?.traceCode ?? ""
  );
  const traceCode = traceCodeRaw ? traceCodeRaw.slice(0, 100) : "";
  const hasTraceCodeKey =
    "trace_code" in (req.body || {}) || "traceCode" in (req.body || {});

  const linkedOrderCodeRaw = normalizeTextInput(
    req.body?.linked_order_code ?? req.body?.linkedOrderCode ?? ""
  );
  const linkedOrderCode = linkedOrderCodeRaw ? linkedOrderCodeRaw.slice(0, 64) : "";
  const hasLinkedOrderCodeKey =
    "linked_order_code" in (req.body || {}) ||
    "linkedOrderCode" in (req.body || {});

  const reasonInputRaw =
    req.body && "reason" in req.body ? String(req.body.reason ?? "") : null;
  const reasonInput =
    reasonInputRaw !== null ? normalizeTextInput(reasonInputRaw) : null;

  try {
    const hasMavnCols = await storeProfitExpensesHasMavnColumns();
    const updated = await db.transaction(async (trx) => {
      const existing = await trx(TABLE)
        .select(
          COLS.ID,
          COLS.REASON,
          ...(hasMavnCols ? [COLS.LINKED_ORDER_CODE, COLS.EXPENSE_META] : [])
        )
        .where(COLS.ID, id)
        .first();
      if (!existing) return null;

      const patch = {};

      if (reasonInput !== null) {
        patch[COLS.REASON] = reasonInput || null;
      }

      if (hasMavnCols && hasLinkedOrderCodeKey) {
        patch[COLS.LINKED_ORDER_CODE] = linkedOrderCode || null;
      }

      if (hasMavnCols && hasTraceCodeKey) {
        const currentMeta =
          existing?.[COLS.EXPENSE_META] &&
          typeof existing[COLS.EXPENSE_META] === "object"
            ? { ...existing[COLS.EXPENSE_META] }
            : {};
        if (traceCode) {
          currentMeta.trace_code = traceCode;
        } else {
          delete currentMeta.trace_code;
        }
        if (Object.keys(currentMeta).length > 0) {
          patch[COLS.EXPENSE_META] = trx.raw("?::jsonb", [
            JSON.stringify(currentMeta),
          ]);
        } else {
          patch[COLS.EXPENSE_META] = null;
        }
      }

      if (Object.keys(patch).length === 0) {
        return existing;
      }

      await trx(TABLE).where(COLS.ID, id).update(patch);

      return trx(TABLE)
        .select(
          COLS.ID,
          COLS.AMOUNT,
          COLS.REASON,
          COLS.EXPENSE_TYPE,
          ...(hasMavnCols ? [COLS.LINKED_ORDER_CODE, COLS.EXPENSE_META] : []),
          COLS.CREATED_AT,
          trx.raw(`${VN_DATE_FROM_CREATED_AT_SQL} AS expense_date`)
        )
        .where(COLS.ID, id)
        .first();
    });

    if (!updated) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy chi phí ngoài luồng." });
    }

    logger.info("[store-profit-expenses] update ok", {
      id,
      hasTraceCode: hasTraceCodeKey ? Boolean(traceCode) : "(skip)",
      hasLinkedOrderCode: hasLinkedOrderCodeKey
        ? Boolean(linkedOrderCode)
        : "(skip)",
      hasReason: reasonInput !== null,
    });

    return res.json({ item: mapExpenseRow(updated) });
  } catch (error) {
    logger.error("[store-profit-expenses] update failed", {
      id,
      error: error.message,
      stack: error.stack,
    });
    return res
      .status(500)
      .json({ error: "Không thể cập nhật chi phí ngoài luồng." });
  }
};

module.exports = {
  updateStoreProfitExpense,
};
