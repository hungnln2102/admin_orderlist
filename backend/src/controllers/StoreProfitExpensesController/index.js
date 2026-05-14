const { db } = require("../../db");
const logger = require("../../utils/logger");
const {
  FINANCE_SCHEMA,
  SCHEMA_FINANCE,
  ORDERS_SCHEMA,
  PARTNER_SCHEMA,
  SCHEMA_ORDERS,
  SCHEMA_PARTNER,
  tableName,
} = require("../../config/dbSchema");
const { normalizeDateInput, normalizeTextInput } = require("../../utils/normalizers");
const { STATUS } = require("../../utils/statuses");
const {
  isMavnImportOrder,
  isMavrykShopSupplierName,
} = require("../../utils/orderHelpers");
const {
  monthKeyVietnamFromDbTimestamp,
  mergeSummaryUpdates,
} = require("../Order/finance/dashboardSummary");
const {
  storeProfitExpensesHasMavnColumns,
} = require("../Order/finance/storeProfitExpensesHasMavnColumns");

const TABLE = tableName(FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE, SCHEMA_FINANCE);
const COLS = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;
const ORDER_TABLE = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const ORDER_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;
const SUPPLIER_TABLE = tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_PARTNER);
const SUPPLIER_COLS = PARTNER_SCHEMA.SUPPLIER.COLS;
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

const MAVN_INTERNAL_EXTERNAL_IMPORT_BLOCKED = "MAVN_INTERNAL_EXTERNAL_IMPORT_BLOCKED";

const ensureNotDuplicateMavnInternalExternalImport = async (trx, linkedOrderCode) => {
  const normalizedCode = String(linkedOrderCode || "").trim().toUpperCase();
  if (!normalizedCode) return;

  const order = await trx(`${ORDER_TABLE} as o`)
    .leftJoin(
      `${SUPPLIER_TABLE} as s`,
      "o." + ORDER_COLS.ID_SUPPLY,
      "s." + SUPPLIER_COLS.ID
    )
    .select(
      `o.${ORDER_COLS.ID_ORDER} as id_order`,
      `o.${ORDER_COLS.STATUS} as status`,
      `s.${SUPPLIER_COLS.SUPPLIER_NAME} as supplier_name`
    )
    .whereRaw(`UPPER(TRIM(COALESCE(o.${ORDER_COLS.ID_ORDER}::text, ''))) = ?`, [normalizedCode])
    .first();

  if (!order) return;
  if (!isMavnImportOrder(order)) return;
  if (String(order.status || "").trim() !== STATUS.PAID) return;
  if (!isMavrykShopSupplierName(order.supplier_name)) return;

  // Cho phép tạo tay khi log tự động bị lỗi/mất.
  // Chỉ chặn nếu đơn đã có log linked với mã đơn này (tránh trừ lặp lần 2+).
  const existing = await trx(TABLE)
    .select(COLS.ID)
    .where(COLS.LINKED_ORDER_CODE, normalizedCode)
    .whereIn(COLS.EXPENSE_TYPE, ["external_import", "mavn_import"])
    .first();
  if (!existing) return;

  const err = new Error("Đơn MAVN NCC nội bộ đã có log linked; chặn tạo log trùng.");
  err.code = MAVN_INTERNAL_EXTERNAL_IMPORT_BLOCKED;
  throw err;
};

const mapExpenseRow = (row) => {
  const meta =
    row.expense_meta && typeof row.expense_meta === "object"
      ? row.expense_meta
      : null;
  const traceCode =
    meta && typeof meta.trace_code === "string" ? meta.trace_code : "";
  return {
    id: Number(row.id),
    amount: parseAmount(row.amount),
    reason: row.reason || "",
    expenseDate: row.expense_date || null,
    expenseType: row.expense_type || "",
    linkedOrderCode: row.linked_order_code ?? null,
    expenseMeta: meta,
    traceCode: traceCode || null,
    createdAt: row.created_at || null,
  };
};

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
      if (expenseType === "external_import" && linkedOrderCode) {
        await ensureNotDuplicateMavnInternalExternalImport(trx, linkedOrderCode);
      }

      const insertPayload = {
        [COLS.AMOUNT]: amount,
        [COLS.REASON]: reason || null,
        [COLS.EXPENSE_TYPE]: expenseType,
      };

      // Mã đơn liên kết & meta là TUỲ CHỌN — chỉ thêm khi có giá trị thực sự,
      // để cùng cột nullable không bị Knex serialize null/object lệch kiểu JSONB.
      if (hasMavnCols && linkedOrderCode) {
        insertPayload[COLS.LINKED_ORDER_CODE] = linkedOrderCode;
      }
      if (hasMavnCols) {
        const resolvedMeta =
          metaInput ||
          (expenseType === "external_import" && linkedOrderCode
            ? {
                source: "manual_external_import",
                flow: "mavryk_renewal_manual",
              }
            : null);
        if (resolvedMeta && Object.keys(resolvedMeta).length > 0) {
          insertPayload[COLS.EXPENSE_META] = trx.raw("?::jsonb", [
            JSON.stringify(resolvedMeta),
          ]);
        }
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

      // Gộp profit + bank delta trong 1 lần mergeSummaryUpdates để Telegram chỉ bắn 1 message,
      // thay vì gọi applyEstimatedBankBalanceDelta + applyExternalImportProfitDelta tách rời.
      if (
        (expenseType === "external_import" || expenseType === "withdraw_profit") &&
        amount > 0 &&
        inserted?.[COLS.CREATED_AT]
      ) {
        const mk = await monthKeyVietnamFromDbTimestamp(
          trx,
          inserted[COLS.CREATED_AT]
        );
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

const deleteStoreProfitExpense = async (req, res) => {
  const id = Number(req.params.id);

  try {
    const deleted = await db.transaction(async (trx) => {
      const row = await trx(TABLE).select("*").where(COLS.ID, id).first();
      if (!row) return 0;
      const expType = String(row[COLS.EXPENSE_TYPE] || "");
      const amt = parseAmount(row[COLS.AMOUNT]);
      const n = await trx(TABLE).where(COLS.ID, id).del();
      // Gộp profit + bank delta trong 1 lần mergeSummaryUpdates để Telegram chỉ bắn 1 message.
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
        if (mk) {
          const updates = { estimated_bank_balance: amt };
          if (expType === "external_import") {
            updates.total_profit = amt;
          }
          await mergeSummaryUpdates(trx, mk, updates, {
            context: `deleteStoreProfitExpense.${expType}`,
          });
        }
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
  updateStoreProfitExpense,
  deleteStoreProfitExpense,
};
