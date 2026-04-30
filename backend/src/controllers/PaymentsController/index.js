const { db, withTransaction } = require("../../db");
const crypto = require("crypto");
const {
  getDefinition,
  PARTNER_SCHEMA,
  FINANCE_SCHEMA,
  SCHEMA_PARTNER,
  SCHEMA_SUPPLIER,
  SCHEMA_ORDERS,
  SCHEMA_RECEIPT,
  SCHEMA_FINANCE,
  ORDERS_SCHEMA,
  RECEIPT_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const { QUOTED_COLS } = require("../../utils/columns");
const { STATUS } = require("../../utils/statuses");
const logger = require("../../utils/logger");
const {
  updateDashboardMonthlySummaryOnStatusChange,
  recomputeSummaryMonthTotalTax,
} = require("../Order/finance/dashboardSummary");
const { syncMavnStoreProfitExpense } = require("../Order/orderFinanceHelpers");
const { runRenewal } = require("../../../webhook/sepay/renewal");

const PAYMENT_RECEIPT_DEF = getDefinition("PAYMENT_RECEIPT", RECEIPT_SCHEMA);
const PAYMENT_RECEIPT_STATE_DEF = getDefinition(
  "PAYMENT_RECEIPT_FINANCIAL_STATE",
  RECEIPT_SCHEMA
);
const PAYMENT_RECEIPT_AUDIT_DEF = getDefinition(
  "PAYMENT_RECEIPT_FINANCIAL_AUDIT_LOG",
  RECEIPT_SCHEMA
);
const ORDER_LIST_DEF = getDefinition("ORDER_LIST", ORDERS_SCHEMA);
const DASHBOARD_SUMMARY_DEF = getDefinition(
  "DASHBOARD_MONTHLY_SUMMARY",
  FINANCE_SCHEMA
);
const PAYMENT_SUPPLY_DEF = getDefinition("PAYMENT_SUPPLY", PARTNER_SCHEMA);
const PAYMENT_RECEIPT_BATCH_COLS = RECEIPT_SCHEMA.PAYMENT_RECEIPT_BATCH.COLS;
const PAYMENT_RECEIPT_BATCH_ITEM_COLS = RECEIPT_SCHEMA.PAYMENT_RECEIPT_BATCH_ITEM.COLS;
const TABLES = {
  paymentReceipt: tableName(PAYMENT_RECEIPT_DEF.tableName, SCHEMA_RECEIPT),
  paymentReceiptState: tableName(PAYMENT_RECEIPT_STATE_DEF.tableName, SCHEMA_RECEIPT),
  paymentReceiptAudit: tableName(PAYMENT_RECEIPT_AUDIT_DEF.tableName, SCHEMA_RECEIPT),
  orderList: tableName(ORDER_LIST_DEF.tableName, SCHEMA_ORDERS),
  dashboardSummary: tableName(DASHBOARD_SUMMARY_DEF.tableName, SCHEMA_FINANCE),
  paymentSupply: tableName(PAYMENT_SUPPLY_DEF.tableName, SCHEMA_PARTNER),
  paymentReceiptBatch: tableName(RECEIPT_SCHEMA.PAYMENT_RECEIPT_BATCH.TABLE, SCHEMA_RECEIPT),
  paymentReceiptBatchItem: tableName(RECEIPT_SCHEMA.PAYMENT_RECEIPT_BATCH_ITEM.TABLE, SCHEMA_RECEIPT),
  supply: tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_SUPPLIER),
  supplyOrderCostLog: tableName(PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE, SCHEMA_PARTNER),
};
const PS = QUOTED_COLS.paymentSupply;
const RECEIPT_STATE_COLS = PAYMENT_RECEIPT_STATE_DEF.columns;
const ORDER_COLS = ORDER_LIST_DEF.columns;
const SUMMARY_COLS = DASHBOARD_SUMMARY_DEF.columns;
const RECONCILE_ACTIONS = {
  ONLY: "reconcile_only",
  MARK_PAID: "reconcile_and_mark_paid",
  RENEW: "reconcile_and_renew",
};
const SUPPORTED_RECONCILE_ACTIONS = new Set([
  RECONCILE_ACTIONS.ONLY,
  RECONCILE_ACTIONS.MARK_PAID,
  RECONCILE_ACTIONS.RENEW,
]);

const normalizeMoney = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  const numeric = Number.parseFloat(cleaned || "0");
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
};

const ORDER_CODE_REGEX_GLOBAL = /\bMAV[A-Z0-9]{3,20}\b/gi;
const BATCH_CODE_REGEX_STRICT = /^MAVG[A-Z0-9]{4,20}$/i;
const BATCH_CODE_PREFIX = "MAVG";

const parseOrderCodesInput = (rawValue) => {
  const parts = Array.isArray(rawValue)
    ? rawValue
    : typeof rawValue === "string"
      ? [rawValue]
      : [];
  const unique = new Set();
  for (const part of parts) {
    const matches = String(part || "").toUpperCase().match(ORDER_CODE_REGEX_GLOBAL) || [];
    for (const code of matches) {
      const normalized = String(code || "").trim().toUpperCase();
      if (!normalized || BATCH_CODE_REGEX_STRICT.test(normalized)) continue;
      unique.add(normalized);
    }
  }
  return [...unique];
};

const generateCandidateBatchCode = () => {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${BATCH_CODE_PREFIX}${suffix}`;
};

const hasMissingTableError = (error, tableName) =>
  error?.code === "42P01" &&
  String(error?.message || "").toLowerCase().includes(String(tableName || "").toLowerCase());

const isMissingBatchTablesError = (error) =>
  hasMissingTableError(error, "payment_receipt_batch") ||
  hasMissingTableError(error, "payment_receipt_batch_item");

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const toMonthKey = (value) => {
  if (!value) return null;
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

const applyDashboardDelta = async (
  trx,
  monthKey,
  { revenueDelta = 0, profitDelta = 0, ordersDelta = 0 } = {}
) => {
  if (!monthKey) return;
  const revenue = normalizeMoney(revenueDelta);
  const profit = normalizeMoney(profitDelta);
  const orders = Number.isFinite(Number(ordersDelta)) ? Number(ordersDelta) : 0;
  if (!revenue && !profit && !orders) return;

  await trx.raw(
    `
      INSERT INTO ${TABLES.dashboardSummary} (
        ${SUMMARY_COLS.monthKey},
        ${SUMMARY_COLS.totalOrders},
        ${SUMMARY_COLS.totalRevenue},
        ${SUMMARY_COLS.totalProfit},
        ${SUMMARY_COLS.updatedAt}
      )
      VALUES (?, ?, ?, ?, NOW())
      ON CONFLICT (${SUMMARY_COLS.monthKey})
      DO UPDATE SET
        ${SUMMARY_COLS.totalOrders} = GREATEST(0, ${TABLES.dashboardSummary}.${SUMMARY_COLS.totalOrders} + EXCLUDED.${SUMMARY_COLS.totalOrders}),
        ${SUMMARY_COLS.totalRevenue} = ${TABLES.dashboardSummary}.${SUMMARY_COLS.totalRevenue} + EXCLUDED.${SUMMARY_COLS.totalRevenue},
        ${SUMMARY_COLS.totalProfit} = ${TABLES.dashboardSummary}.${SUMMARY_COLS.totalProfit} + EXCLUDED.${SUMMARY_COLS.totalProfit},
        ${SUMMARY_COLS.updatedAt} = NOW();
    `,
    [monthKey, orders, revenue, profit]
  );
  await recomputeSummaryMonthTotalTax(trx, monthKey);
};

const listPaymentReceipts = async (req, res) => {
  const limitParam = Number.parseInt(req.query.limit, 10);
  const offsetParam = Number.parseInt(req.query.offset, 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 500)
    : 200;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;
  const missingOrderOnly =
    String(req.query.missingOrderCode ?? req.query.emptyOrderCode ?? "").trim() === "1";

  try {
    let query = db({ pr: TABLES.paymentReceipt })
      .leftJoin(
        { fs: TABLES.paymentReceiptState },
        `fs.${RECEIPT_STATE_COLS.paymentReceiptId}`,
        `pr.${PAYMENT_RECEIPT_DEF.columns.id}`
      );
    if (missingOrderOnly) {
      const orderCol = PAYMENT_RECEIPT_DEF.columns.orderCode;
      query = query.whereRaw(`COALESCE(TRIM(pr.${orderCol}::text), '') = ''`);
    }
    const rows = await query
      .select({
        id: `pr.${PAYMENT_RECEIPT_DEF.columns.id}`,
        orderCode: `pr.${PAYMENT_RECEIPT_DEF.columns.orderCode}`,
        paidAt: `pr.${PAYMENT_RECEIPT_DEF.columns.paidDate}`,
        amount: `pr.${PAYMENT_RECEIPT_DEF.columns.amount}`,
        sender: `pr.${PAYMENT_RECEIPT_DEF.columns.sender}`,
        receiver: `pr.${PAYMENT_RECEIPT_DEF.columns.receiver}`,
        note: `pr.${PAYMENT_RECEIPT_DEF.columns.note}`,
        isFinancialPosted: `fs.${RECEIPT_STATE_COLS.isFinancialPosted}`,
        postedRevenue: `fs.${RECEIPT_STATE_COLS.postedRevenue}`,
        postedProfit: `fs.${RECEIPT_STATE_COLS.postedProfit}`,
        reconciledAt: `fs.${RECEIPT_STATE_COLS.reconciledAt}`,
        adjustmentApplied: `fs.${RECEIPT_STATE_COLS.adjustmentApplied}`,
      })
      .orderBy([
        { column: `pr.${PAYMENT_RECEIPT_DEF.columns.paidDate}`, order: "desc" },
        { column: `pr.${PAYMENT_RECEIPT_DEF.columns.id}`, order: "desc" },
      ])
      .offset(offset)
      .limit(limit);

    const normalizedRows = (rows || []).filter(Boolean);
    const receipts = normalizedRows.map((row) => ({
      id: row.id,
      orderCode: row.orderCode,
      paidAt: row.paidAt,
      amount: Number(row.amount) || 0,
      sender: row.sender,
      receiver: row.receiver,
      note: row.note,
      isFinancialPosted: !!row.isFinancialPosted,
      postedRevenue: Number(row.postedRevenue) || 0,
      postedProfit: Number(row.postedProfit) || 0,
      reconciledAt: row.reconciledAt || null,
      adjustmentApplied: !!row.adjustmentApplied,
    }));

    res.json({ receipts, count: receipts.length, offset, limit });
  } catch (error) {
    const missingStateTable =
      error?.code === "42P01" &&
      String(error?.message || "").includes("payment_receipt_financial_state");
    if (missingStateTable) {
      try {
        let fallbackQuery = db({ pr: TABLES.paymentReceipt });
        if (missingOrderOnly) {
          const orderCol = PAYMENT_RECEIPT_DEF.columns.orderCode;
          fallbackQuery = fallbackQuery.whereRaw(`COALESCE(TRIM(pr.${orderCol}::text), '') = ''`);
        }
        const fallbackRows = await fallbackQuery
          .select({
            id: `pr.${PAYMENT_RECEIPT_DEF.columns.id}`,
            orderCode: `pr.${PAYMENT_RECEIPT_DEF.columns.orderCode}`,
            paidAt: `pr.${PAYMENT_RECEIPT_DEF.columns.paidDate}`,
            amount: `pr.${PAYMENT_RECEIPT_DEF.columns.amount}`,
            sender: `pr.${PAYMENT_RECEIPT_DEF.columns.sender}`,
            receiver: `pr.${PAYMENT_RECEIPT_DEF.columns.receiver}`,
            note: `pr.${PAYMENT_RECEIPT_DEF.columns.note}`,
          })
          .orderBy([
            { column: `pr.${PAYMENT_RECEIPT_DEF.columns.paidDate}`, order: "desc" },
            { column: `pr.${PAYMENT_RECEIPT_DEF.columns.id}`, order: "desc" },
          ])
          .offset(offset)
          .limit(limit);

        const receipts = (fallbackRows || []).map((row) => ({
          id: row.id,
          orderCode: row.orderCode,
          paidAt: row.paidAt,
          amount: Number(row.amount) || 0,
          sender: row.sender,
          receiver: row.receiver,
          note: row.note,
          isFinancialPosted: false,
          postedRevenue: 0,
          postedProfit: 0,
          reconciledAt: null,
          adjustmentApplied: false,
        }));
        logger.warn("[payments] payment_receipt_financial_state missing, fallback query used");
        return res.json({ receipts, count: receipts.length, offset, limit });
      } catch (fallbackErr) {
        logger.error("[payments] Fallback query failed (payment-receipts)", {
          error: fallbackErr.message,
          stack: fallbackErr.stack,
        });
      }
    }
    logger.error("[payments] Query failed (payment-receipts)", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải biên lai thanh toán." });
  }
};

const createPaymentReceiptBatch = async (req, res) => {
  const rawOrderCodes =
    req.body?.orderCodes ?? req.body?.orders ?? req.body?.orderCode ?? "";
  const note = String(req.body?.note || "").trim();
  const orderCodes = parseOrderCodesInput(rawOrderCodes);
  if (orderCodes.length === 0) {
    return res.status(400).json({
      error: "Thiếu danh sách mã đơn hợp lệ (MAV...).",
    });
  }

  try {
    const result = await withTransaction(async (trx) => {
      const rows = await trx(TABLES.orderList)
        .select(
          ORDER_COLS.id,
          ORDER_COLS.idOrder,
          ORDER_COLS.status,
          ORDER_COLS.price
        )
        .whereRaw(`UPPER(${ORDER_COLS.idOrder}::text) IN (${orderCodes.map(() => "?").join(",")})`, orderCodes);

      const byCode = new Map(
        (rows || []).map((row) => [
          String(row?.[ORDER_COLS.idOrder] || "").trim().toUpperCase(),
          row,
        ])
      );
      const missingOrderCodes = orderCodes.filter((code) => !byCode.has(code));
      if (missingOrderCodes.length > 0) {
        throw createHttpError(
          400,
          `Không tìm thấy ${missingOrderCodes.length} mã đơn: ${missingOrderCodes.join(", ")}`
        );
      }

      const disallowed = rows.filter((row) => {
        const status = String(row?.[ORDER_COLS.status] || "").trim();
        return status !== STATUS.UNPAID && status !== STATUS.RENEWAL;
      });
      if (disallowed.length > 0) {
        const preview = disallowed
          .slice(0, 5)
          .map((row) => String(row?.[ORDER_COLS.idOrder] || "").trim().toUpperCase())
          .join(", ");
        throw createHttpError(
          409,
          `Chỉ tạo biên lai nhóm cho đơn Chưa Thanh Toán/Cần Gia Hạn. Không hợp lệ: ${preview}`
        );
      }

      let batchCode = "";
      for (let i = 0; i < 8; i += 1) {
        const candidate = generateCandidateBatchCode();
        const exists = await trx(TABLES.paymentReceiptBatch)
          .where(PAYMENT_RECEIPT_BATCH_COLS.BATCH_CODE, candidate)
          .first();
        if (!exists) {
          batchCode = candidate;
          break;
        }
      }
      if (!batchCode) {
        throw createHttpError(500, "Không thể tạo mã MAVG. Vui lòng thử lại.");
      }

      const totalAmount = rows.reduce(
        (sum, row) => sum + normalizeMoney(row?.[ORDER_COLS.price]),
        0
      );

      const insertedBatchRows = await trx(TABLES.paymentReceiptBatch)
        .insert({
          [PAYMENT_RECEIPT_BATCH_COLS.BATCH_CODE]: batchCode,
          [PAYMENT_RECEIPT_BATCH_COLS.TOTAL_AMOUNT]: totalAmount,
          [PAYMENT_RECEIPT_BATCH_COLS.ORDER_COUNT]: rows.length,
          [PAYMENT_RECEIPT_BATCH_COLS.STATUS]: "pending",
          [PAYMENT_RECEIPT_BATCH_COLS.SOURCE]: "invoices",
          [PAYMENT_RECEIPT_BATCH_COLS.NOTE]: note || null,
        })
        .returning("*");
      const batchRow = insertedBatchRows?.[0] || null;

      await trx(TABLES.paymentReceiptBatchItem).insert(
        rows.map((row) => ({
          [PAYMENT_RECEIPT_BATCH_ITEM_COLS.BATCH_ID]: batchRow?.[PAYMENT_RECEIPT_BATCH_COLS.ID],
          [PAYMENT_RECEIPT_BATCH_ITEM_COLS.BATCH_CODE]: batchCode,
          [PAYMENT_RECEIPT_BATCH_ITEM_COLS.ORDER_CODE]: String(row?.[ORDER_COLS.idOrder] || "").trim().toUpperCase(),
          [PAYMENT_RECEIPT_BATCH_ITEM_COLS.ORDER_LIST_ID]: row?.[ORDER_COLS.id] ?? null,
          [PAYMENT_RECEIPT_BATCH_ITEM_COLS.AMOUNT]: normalizeMoney(row?.[ORDER_COLS.price]),
          [PAYMENT_RECEIPT_BATCH_ITEM_COLS.STATUS]: "pending",
        }))
      );

      return {
        batchCode,
        orderCodes,
        orderCount: rows.length,
        totalAmount,
      };
    });

    return res.json({
      success: true,
      ...result,
      noteForTransfer: result.batchCode,
    });
  } catch (error) {
    if (isMissingBatchTablesError(error)) {
      logger.warn("[payments] Create receipt batch skipped: missing batch tables");
      return res.status(503).json({
        error:
          "Tính năng batch MAVG chưa sẵn sàng trên database. Vui lòng chạy migration backend rồi thử lại.",
      });
    }
    const statusCode = Number(error?.status) || 500;
    logger.error("[payments] Create receipt batch failed", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(statusCode).json({
      error: error.message || "Không thể tạo mã biên lai nhóm.",
    });
  }
};

const listPaymentReceiptBatches = async (req, res) => {
  const limitParam = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 100)
    : 20;
  try {
    const rows = await db(TABLES.paymentReceiptBatch)
      .select(
        PAYMENT_RECEIPT_BATCH_COLS.ID,
        PAYMENT_RECEIPT_BATCH_COLS.BATCH_CODE,
        PAYMENT_RECEIPT_BATCH_COLS.TOTAL_AMOUNT,
        PAYMENT_RECEIPT_BATCH_COLS.ORDER_COUNT,
        PAYMENT_RECEIPT_BATCH_COLS.STATUS,
        PAYMENT_RECEIPT_BATCH_COLS.PAID_RECEIPT_ID,
        PAYMENT_RECEIPT_BATCH_COLS.PAID_AT,
        PAYMENT_RECEIPT_BATCH_COLS.CREATED_AT
      )
      .where(PAYMENT_RECEIPT_BATCH_COLS.SOURCE, "invoices")
      .orderBy(PAYMENT_RECEIPT_BATCH_COLS.ID, "desc")
      .limit(limit);

    const batches = (rows || []).map((row) => ({
      id: Number(row?.[PAYMENT_RECEIPT_BATCH_COLS.ID]) || 0,
      batchCode: String(row?.[PAYMENT_RECEIPT_BATCH_COLS.BATCH_CODE] || "")
        .trim()
        .toUpperCase(),
      totalAmount: Number(row?.[PAYMENT_RECEIPT_BATCH_COLS.TOTAL_AMOUNT]) || 0,
      orderCount: Number(row?.[PAYMENT_RECEIPT_BATCH_COLS.ORDER_COUNT]) || 0,
      status: String(row?.[PAYMENT_RECEIPT_BATCH_COLS.STATUS] || "pending"),
      paidReceiptId: Number(row?.[PAYMENT_RECEIPT_BATCH_COLS.PAID_RECEIPT_ID]) || null,
      paidAt: row?.[PAYMENT_RECEIPT_BATCH_COLS.PAID_AT] || null,
      createdAt: row?.[PAYMENT_RECEIPT_BATCH_COLS.CREATED_AT] || null,
    }));
    return res.json({ batches, count: batches.length, limit });
  } catch (error) {
    if (isMissingBatchTablesError(error)) {
      logger.warn("[payments] List receipt batches skipped: missing batch tables");
      return res.json({
        batches: [],
        count: 0,
        limit,
        disabled: true,
        message:
          "Tính năng batch MAVG chưa sẵn sàng trên database. Vui lòng chạy migration backend.",
      });
    }
    logger.error("[payments] List receipt batches failed", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: "Không thể tải danh sách batch MAVG." });
  }
};

const getPaymentReceiptBatchDetail = async (req, res) => {
  const batchCode = String(req.params.batchCode || "").trim().toUpperCase();
  if (!BATCH_CODE_REGEX_STRICT.test(batchCode)) {
    return res.status(400).json({ error: "batchCode không đúng định dạng MAVG." });
  }
  try {
    const batch = await db(TABLES.paymentReceiptBatch)
      .select("*")
      .whereRaw(`UPPER(${PAYMENT_RECEIPT_BATCH_COLS.BATCH_CODE}::text) = ?`, [batchCode])
      .first();
    if (!batch) {
      return res.status(404).json({ error: "Không tìm thấy batch MAVG." });
    }

    const items = await db(TABLES.paymentReceiptBatchItem)
      .select(
        PAYMENT_RECEIPT_BATCH_ITEM_COLS.ID,
        PAYMENT_RECEIPT_BATCH_ITEM_COLS.ORDER_CODE,
        PAYMENT_RECEIPT_BATCH_ITEM_COLS.ORDER_LIST_ID,
        PAYMENT_RECEIPT_BATCH_ITEM_COLS.AMOUNT,
        PAYMENT_RECEIPT_BATCH_ITEM_COLS.STATUS,
        PAYMENT_RECEIPT_BATCH_ITEM_COLS.CREATED_AT
      )
      .whereRaw(`UPPER(${PAYMENT_RECEIPT_BATCH_ITEM_COLS.BATCH_CODE}::text) = ?`, [batchCode])
      .orderBy(PAYMENT_RECEIPT_BATCH_ITEM_COLS.ID, "asc");

    return res.json({
      batch: {
        id: Number(batch?.[PAYMENT_RECEIPT_BATCH_COLS.ID]) || 0,
        batchCode: String(batch?.[PAYMENT_RECEIPT_BATCH_COLS.BATCH_CODE] || "")
          .trim()
          .toUpperCase(),
        totalAmount: Number(batch?.[PAYMENT_RECEIPT_BATCH_COLS.TOTAL_AMOUNT]) || 0,
        orderCount: Number(batch?.[PAYMENT_RECEIPT_BATCH_COLS.ORDER_COUNT]) || 0,
        status: String(batch?.[PAYMENT_RECEIPT_BATCH_COLS.STATUS] || "pending"),
        note: batch?.[PAYMENT_RECEIPT_BATCH_COLS.NOTE] || null,
        paidReceiptId: Number(batch?.[PAYMENT_RECEIPT_BATCH_COLS.PAID_RECEIPT_ID]) || null,
        paidAt: batch?.[PAYMENT_RECEIPT_BATCH_COLS.PAID_AT] || null,
        createdAt: batch?.[PAYMENT_RECEIPT_BATCH_COLS.CREATED_AT] || null,
      },
      items: (items || []).map((row) => ({
        id: Number(row?.[PAYMENT_RECEIPT_BATCH_ITEM_COLS.ID]) || 0,
        orderCode: String(row?.[PAYMENT_RECEIPT_BATCH_ITEM_COLS.ORDER_CODE] || "")
          .trim()
          .toUpperCase(),
        orderListId:
          Number(row?.[PAYMENT_RECEIPT_BATCH_ITEM_COLS.ORDER_LIST_ID]) || null,
        amount: Number(row?.[PAYMENT_RECEIPT_BATCH_ITEM_COLS.AMOUNT]) || 0,
        status: String(row?.[PAYMENT_RECEIPT_BATCH_ITEM_COLS.STATUS] || "pending"),
        createdAt: row?.[PAYMENT_RECEIPT_BATCH_ITEM_COLS.CREATED_AT] || null,
      })),
    });
  } catch (error) {
    if (isMissingBatchTablesError(error)) {
      logger.warn("[payments] Get receipt batch detail skipped: missing batch tables", {
        batchCode,
      });
      return res.status(503).json({
        error:
          "Tính năng batch MAVG chưa sẵn sàng trên database. Vui lòng chạy migration backend rồi thử lại.",
      });
    }
    logger.error("[payments] Get receipt batch detail failed", {
      batchCode,
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: "Không thể tải chi tiết batch MAVG." });
  }
};

const listMatchableOrders = async (req, res) => {
  const limitParam = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 500)
    : 200;
  const q = String(req.query.q || "").trim().toUpperCase();

  try {
    let query = db({ o: TABLES.orderList })
      .select({
        id: `o.${ORDER_COLS.id}`,
        orderCode: `o.${ORDER_COLS.idOrder}`,
        status: `o.${ORDER_COLS.status}`,
        customer: `o.${ORDER_COLS.customer}`,
        informationOrder: `o.${ORDER_COLS.informationOrder}`,
      })
      .whereIn(`o.${ORDER_COLS.status}`, [STATUS.UNPAID, STATUS.RENEWAL])
      .whereRaw(`COALESCE(TRIM(o.${ORDER_COLS.idOrder}::text), '') <> ''`)
      .orderBy([
        { column: `o.${ORDER_COLS.orderDate}`, order: "desc" },
        { column: `o.${ORDER_COLS.id}`, order: "desc" },
      ])
      .limit(limit);

    if (q) {
      query = query.whereRaw(
        `(
          COALESCE(o.${ORDER_COLS.idOrder}::text, '') ILIKE ?
          OR COALESCE(o.${ORDER_COLS.customer}::text, '') ILIKE ?
          OR COALESCE(o.${ORDER_COLS.informationOrder}::text, '') ILIKE ?
        )`,
        [`%${q}%`, `%${q}%`, `%${q}%`]
      );
    }

    const rows = await query;
    const orders = (rows || []).map((row) => ({
      id: Number(row.id) || 0,
      orderCode: String(row.orderCode || "").trim().toUpperCase(),
      status: String(row.status || ""),
      customer: String(row.customer || ""),
      informationOrder: String(row.informationOrder || ""),
    }));

    res.json({ orders, count: orders.length, limit });
  } catch (error) {
    logger.error("[payments] Query failed (matchable-orders)", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể tải danh sách đơn hàng để ghép biên nhận." });
  }
};

const reconcilePaymentReceipt = async (req, res) => {
  const receiptId = Number.parseInt(req.params.receiptId, 10);
  const rawOrderCodeValue = String(req.body?.orderCode || "").trim().toUpperCase();
  const extractedOrderCode = rawOrderCodeValue.match(/MAV[A-Z0-9]{3,20}/)?.[0] || "";
  const orderCodeRaw = extractedOrderCode || rawOrderCodeValue;
  const requestedActionRaw = String(req.body?.action || RECONCILE_ACTIONS.ONLY)
    .trim()
    .toLowerCase();
  const requestedAction = requestedActionRaw || RECONCILE_ACTIONS.ONLY;
  if (!Number.isFinite(receiptId) || receiptId <= 0) {
    return res.status(400).json({ error: "receiptId không hợp lệ." });
  }
  if (!/^MAV[A-Z0-9]{3,20}$/i.test(orderCodeRaw)) {
    return res.status(400).json({ error: "orderCode không đúng định dạng MAV." });
  }
  if (!SUPPORTED_RECONCILE_ACTIONS.has(requestedAction)) {
    return res.status(400).json({
      error:
        "action không hợp lệ. Chỉ chấp nhận reconcile_only, reconcile_and_mark_paid, reconcile_and_renew.",
    });
  }

  try {
    const result = await withTransaction(async (trx) => {
      const receiptRes = await trx(TABLES.paymentReceipt)
        .where(PAYMENT_RECEIPT_DEF.columns.id, receiptId)
        .first();
      if (!receiptRes) throw new Error("Không tìm thấy biên lai.");

      let stateRow = await trx(TABLES.paymentReceiptState)
        .where(RECEIPT_STATE_COLS.paymentReceiptId, receiptId)
        .first();
      if (!stateRow) {
        await trx(TABLES.paymentReceiptState).insert({
          [RECEIPT_STATE_COLS.paymentReceiptId]: receiptId,
        });
        stateRow = await trx(TABLES.paymentReceiptState)
          .where(RECEIPT_STATE_COLS.paymentReceiptId, receiptId)
          .first();
      }

      const orderRow = await trx(TABLES.orderList)
        .whereRaw(`LOWER(${ORDER_COLS.idOrder}) = LOWER(?)`, [orderCodeRaw])
        .first();
      if (!orderRow) throw new Error("Không tìm thấy đơn hàng để reconcile.");

      await trx(TABLES.paymentReceipt)
        .where(PAYMENT_RECEIPT_DEF.columns.id, receiptId)
        .update({
          [PAYMENT_RECEIPT_DEF.columns.orderCode]: orderCodeRaw,
        });

      const adjustmentApplied = !!stateRow?.[RECEIPT_STATE_COLS.adjustmentApplied];
      const statusValueInitial = String(orderRow[ORDER_COLS.status] || "").trim();
      const orderSellingPriceVnd = normalizeMoney(orderRow[ORDER_COLS.PRICE]);
      const oCodeCol = PAYMENT_RECEIPT_DEF.columns.orderCode;
      const aAmtCol = PAYMENT_RECEIPT_DEF.columns.amount;
      const sumRes = await trx(TABLES.paymentReceipt)
        .whereRaw(`LOWER(TRIM(COALESCE(??, '')::text)) = LOWER(?)`, [oCodeCol, orderCodeRaw])
        .sum({ total_receipts: aAmtCol })
        .first();
      const totalReceiptsForOrderVnd = normalizeMoney(sumRes?.total_receipts);
      // Giá bán 0/âm: giữ hành vi cũ (tự nâng mark paid nếu đơn Chưa Thanh Toán với luồng only).
      const paidAmountCoversOrder =
        orderSellingPriceVnd <= 0
          ? true
          : totalReceiptsForOrderVnd >= orderSellingPriceVnd;

      // Mặc định luồng "Sửa mã đơn" (reconcile_only) tự mark paid nếu đơn Chưa Thanh Toán
      // *và* tổng biên lai gắn mã (kể cả lần này) >= giá bán. Tránh đưa "Đã Thanh Toán" khi thiếu tiền.
      let effectiveAction = requestedAction;
      if (requestedAction === RECONCILE_ACTIONS.ONLY) {
        if (statusValueInitial === STATUS.UNPAID && paidAmountCoversOrder) {
          effectiveAction = RECONCILE_ACTIONS.MARK_PAID;
        }
      } else if (requestedAction === RECONCILE_ACTIONS.MARK_PAID) {
        if (statusValueInitial === STATUS.UNPAID && !paidAmountCoversOrder) {
          // Gắn mã vẫn lưu; không rollback — chỉ bỏ bước chuyển "Đã Thanh Toán" khi thiếu tiền.
          effectiveAction = RECONCILE_ACTIONS.ONLY;
        }
      }
      let statusValue = statusValueInitial;
      let revenueDelta = 0;
      let profitDelta = 0;
      let nextPostedRevenue = Number(stateRow?.[RECEIPT_STATE_COLS.postedRevenue]) || 0;
      let nextPostedProfit = Number(stateRow?.[RECEIPT_STATE_COLS.postedProfit]) || 0;

      if (adjustmentApplied) {
        await trx.raw(
          `INSERT INTO ${TABLES.paymentReceiptAudit} (payment_receipt_id, order_code, rule_branch, delta, source) VALUES (?, ?, ?, ?::jsonb, ?)`,
          [
            receiptId,
            orderCodeRaw,
            "RECONCILE_SKIPPED_ALREADY_APPLIED",
            JSON.stringify({
              reason: "adjustment already applied",
              action: effectiveAction,
            }),
            "reconcile",
          ]
        );
      } else {
        const receiptMonthKey = toMonthKey(receiptRes[PAYMENT_RECEIPT_DEF.columns.paidDate]);
        const postedRevenue = Number(stateRow?.[RECEIPT_STATE_COLS.postedRevenue]) || 0;
        const postedProfit = Number(stateRow?.[RECEIPT_STATE_COLS.postedProfit]) || 0;

        if (statusValue === STATUS.PAID || statusValue === STATUS.PROCESSING) {
          // Đơn đã được xử lý trước đó: trừ lại phần đã cộng trước ở receipt không mã.
          revenueDelta = -postedRevenue;
          profitDelta = -postedProfit;
        } else if (statusValue === STATUS.UNPAID || statusValue === STATUS.RENEWAL) {
          // Chỉ điều chỉnh lợi nhuận về đúng amount - cost.
          const cost = normalizeMoney(orderRow[ORDER_COLS.cost]);
          profitDelta = -cost;
        }

        await applyDashboardDelta(trx, receiptMonthKey, {
          revenueDelta,
          profitDelta,
          ordersDelta: 0,
        });

        nextPostedRevenue = postedRevenue + revenueDelta;
        nextPostedProfit = postedProfit + profitDelta;

        await trx(TABLES.paymentReceiptState)
          .where(RECEIPT_STATE_COLS.paymentReceiptId, receiptId)
          .update({
            [RECEIPT_STATE_COLS.isFinancialPosted]: true,
            [RECEIPT_STATE_COLS.postedRevenue]: nextPostedRevenue,
            [RECEIPT_STATE_COLS.postedProfit]: nextPostedProfit,
            [RECEIPT_STATE_COLS.reconciledAt]: new Date(),
            [RECEIPT_STATE_COLS.adjustmentApplied]: true,
            [RECEIPT_STATE_COLS.updatedAt]: new Date(),
          });

        const reconcileRuleBranch =
          statusValue === STATUS.PAID || statusValue === STATUS.PROCESSING
            ? "RECONCILE_CASE1_REVERSE_TEMP_POST"
            : "RECONCILE_CASE2_UNPAID_RENEWAL_PROFIT_ADJUST";
        await trx.raw(
          `INSERT INTO ${TABLES.paymentReceiptAudit} (payment_receipt_id, order_code, rule_branch, delta, source) VALUES (?, ?, ?, ?::jsonb, ?)`,
          [
            receiptId,
            orderCodeRaw,
            reconcileRuleBranch,
            JSON.stringify({
              revenueDelta,
              profitDelta,
              postedRevenue: nextPostedRevenue,
              postedProfit: nextPostedProfit,
              orderStatus: statusValue,
              action: effectiveAction,
            }),
            "reconcile",
          ]
        );
      }

      const actionResult = {
        actionApplied: effectiveAction,
        actionRequested: requestedAction,
        statusBeforeAction: statusValueInitial,
        statusAfterAction: statusValue,
      };
      let shouldRunRenewal = false;

      if (effectiveAction === RECONCILE_ACTIONS.MARK_PAID) {
        if (statusValueInitial !== STATUS.UNPAID) {
          throw createHttpError(
            409,
            "Chỉ được dùng reconcile_and_mark_paid cho đơn Chưa Thanh Toán."
          );
        }

        const [updatedOrder] = await trx(TABLES.orderList)
          .where(ORDER_COLS.id, orderRow[ORDER_COLS.id])
          .update({
            [ORDER_COLS.status]: STATUS.PAID,
          })
          .returning("*");

        if (!updatedOrder) {
          throw createHttpError(500, "Không thể cập nhật trạng thái đơn hàng.");
        }

        await updateDashboardMonthlySummaryOnStatusChange(trx, orderRow, updatedOrder);
        await syncMavnStoreProfitExpense(trx, orderRow, updatedOrder);
        statusValue = STATUS.PAID;
        actionResult.statusAfterAction = statusValue;

        await trx.raw(
          `INSERT INTO ${TABLES.paymentReceiptAudit} (payment_receipt_id, order_code, rule_branch, delta, source) VALUES (?, ?, ?, ?::jsonb, ?)`,
          [
            receiptId,
            orderCodeRaw,
            "RECONCILE_AND_MARK_PAID_APPLIED",
            JSON.stringify({
              fromStatus: statusValueInitial,
              toStatus: statusValue,
            }),
            "reconcile",
          ]
        );
      } else if (effectiveAction === RECONCILE_ACTIONS.RENEW) {
        if (statusValueInitial !== STATUS.RENEWAL) {
          throw createHttpError(
            409,
            "Chỉ được dùng reconcile_and_renew cho đơn Cần Gia Hạn."
          );
        }
        shouldRunRenewal = true;
        await trx.raw(
          `INSERT INTO ${TABLES.paymentReceiptAudit} (payment_receipt_id, order_code, rule_branch, delta, source) VALUES (?, ?, ?, ?::jsonb, ?)`,
          [
            receiptId,
            orderCodeRaw,
            "RECONCILE_AND_RENEW_QUEUED",
            JSON.stringify({
              fromStatus: statusValueInitial,
            }),
            "reconcile",
          ]
        );
      }

      return {
        receiptId,
        orderCode: orderCodeRaw,
        status: statusValue,
        revenueDelta,
        profitDelta,
        postedRevenue: nextPostedRevenue,
        postedProfit: nextPostedProfit,
        reconciledAt: new Date().toISOString(),
        skipped: adjustmentApplied,
        reason: adjustmentApplied ? "adjustment already applied" : null,
        actionResult,
        shouldRunRenewal,
        effectiveAction,
        orderSellingPriceVnd,
        totalReceiptsForOrderVnd,
        paidAmountCoversOrder,
      };
    });

    let renewalResult = null;
    if (result.shouldRunRenewal) {
      renewalResult = await runRenewal(orderCodeRaw, {
        forceRenewal: true,
        source: "manual",
      });
    }
    const actionResult = {
      ...(result.actionResult || {}),
    };
    if (renewalResult?.success && renewalResult?.details?.TINH_TRANG) {
      actionResult.statusAfterAction = renewalResult.details.TINH_TRANG;
    }

    return res.json({
      success: true,
      actionRequested: requestedAction,
      actionApplied: result.effectiveAction || requestedAction,
      ...result,
      shouldRunRenewal: undefined,
      effectiveAction: undefined,
      actionResult,
      renewalSuccess: renewalResult ? !!renewalResult?.success : null,
      renewalDetails: renewalResult?.details || null,
    });
  } catch (error) {
    const statusCode = Number(error?.status) || 500;
    if (statusCode >= 400 && statusCode < 500) {
      logger.warn("[payments] Từ chối reconcile biên lai theo rule nghiệp vụ", {
        receiptId,
        orderCode: orderCodeRaw,
        action: requestedAction,
        statusCode,
        error: error.message,
      });
    } else {
      logger.error("[payments] Reconcile biên lai thất bại", {
        receiptId,
        orderCode: orderCodeRaw,
        action: requestedAction,
        statusCode,
        error: error.message,
        stack: error.stack,
      });
    }
    return res.status(statusCode).json({ error: error.message || "Không thể reconcile biên lai." });
  }
};

const confirmPaymentSupply = async (req, res) => {
  const { paymentId } = req.params;
  const parsedPaymentId = Number.parseInt(paymentId, 10);
  if (!Number.isInteger(parsedPaymentId) || parsedPaymentId < 0) {
    return res.status(400).json({
      error: "ID thanh toán không hợp lệ.",
    });
  }

  const parsePositiveInt = (value) => {
    const num = Number.parseInt(String(value ?? ""), 10);
    return Number.isInteger(num) && num > 0 ? num : null;
  };
  const parsePaymentContent = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const supplyIdFromBody = parsePositiveInt(req.body?.supplyId);
  const paymentContent = parsePaymentContent(req.body?.paymentContent);

  try {
    const result = await withTransaction(async (trx) => {
      let resolvedSupplyId = supplyIdFromBody;

      if (!resolvedSupplyId && parsedPaymentId > 0) {
        const paymentLookup = await trx.raw(
          `
          SELECT ${PS.sourceId} AS source_id
          FROM ${TABLES.paymentSupply}
          WHERE ${PS.id} = ?
          LIMIT 1;
        `,
          [parsedPaymentId]
        );
        resolvedSupplyId = parsePositiveInt(paymentLookup.rows?.[0]?.source_id);
      }

      if (!resolvedSupplyId) {
        throw createHttpError(400, "Thiếu nhà cung cấp để xác nhận thanh toán.");
      }

      const logCols = QUOTED_COLS.supplierOrderCostLog;
      const unpaidLogSummary = await trx.raw(
        `
        SELECT
          MIN(${logCols.loggedAt}::date) AS oldest_date,
          COUNT(*)::int AS unpaid_count,
          COALESCE(SUM(COALESCE(${logCols.importCost}, 0) - COALESCE(${logCols.refundAmount}, 0)), 0)::numeric AS net_unpaid_amount
        FROM ${TABLES.supplyOrderCostLog}
        WHERE ${logCols.supplyId} = ?
          AND TRIM(COALESCE(${logCols.nccPaymentStatus}::text, '')) <> ?;
      `,
        [resolvedSupplyId, STATUS.PAID]
      );

      const summary = unpaidLogSummary.rows?.[0] || {};
      const unpaidCount = Number(summary.unpaid_count) || 0;
      if (unpaidCount <= 0) {
        throw createHttpError(409, "Không có log NCC chưa thanh toán để chốt.");
      }
      const netUnpaidAmount = Number(summary.net_unpaid_amount) || 0;
      if (netUnpaidAmount === 0) {
        throw createHttpError(
          409,
          "Log NCC chưa thanh toán đang cân bằng, không có số tiền cần chốt."
        );
      }
      const isSupplierRefundToShop = netUnpaidAmount < 0;
      const expectedPaidAmount = Math.abs(Math.round(netUnpaidAmount));
      let matchedReceipt = null;

      if (isSupplierRefundToShop) {
        if (!paymentContent) {
          throw createHttpError(
            400,
            "Thiếu nội dung thanh toán để đối soát log Sepay (NCC nợ Shop)."
          );
        }
        const receiptCols = PAYMENT_RECEIPT_DEF.columns;
        const receiptLookup = await trx.raw(
          `
          SELECT
            pr.${receiptCols.id} AS id,
            pr.${receiptCols.amount} AS amount,
            pr.${receiptCols.paidDate} AS paid_date,
            pr.${receiptCols.note} AS note
          FROM ${TABLES.paymentReceipt} pr
          WHERE COALESCE(pr.${receiptCols.note}::text, '') ILIKE ?
            AND COALESCE(pr.${receiptCols.amount}::numeric, 0) >= ?
          ORDER BY pr.${receiptCols.paidDate} DESC, pr.${receiptCols.id} DESC
          LIMIT 1;
        `,
          [`%${paymentContent}%`, expectedPaidAmount]
        );
        matchedReceipt = receiptLookup.rows?.[0] || null;
        if (!matchedReceipt) {
          throw createHttpError(
            409,
            `Chưa thấy giao dịch Sepay khớp nội dung "${paymentContent}" với số tiền >= ${expectedPaidAmount}.`
          );
        }
      }

      const oldestDate = summary.oldest_date ? new Date(summary.oldest_date) : null;
      const toDmy = (date) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear());
        return `${day}/${month}/${year}`;
      };
      const paymentDate = new Date();
      const periodStart = toDmy(oldestDate) || toDmy(paymentDate);
      const periodEnd = toDmy(paymentDate);
      const periodLabel = `${periodStart} - ${periodEnd}`;
      const addAmount = isSupplierRefundToShop
        ? -Math.abs(expectedPaidAmount)
        : Math.abs(expectedPaidAmount);
      await trx.raw(`DROP INDEX IF EXISTS ${SCHEMA_PARTNER}.uq_supplier_payments_supplier_id;`);
      const insertResult = await trx.raw(
        `
        INSERT INTO ${TABLES.paymentSupply} (${PS.sourceId}, ${PS.round}, ${PS.status}, ${PS.paid})
        VALUES (?, ?, ?, ?)
        RETURNING ${PS.id} AS id,
                  ${PS.sourceId} AS source_id,
                  ${PS.round} AS round,
                  ${PS.status} AS status,
                  COALESCE(${PS.paid}::numeric, 0) AS paid;
      `,
        [resolvedSupplyId, periodLabel, STATUS.PAID, addAmount]
      );

      await trx.raw(
        `
        UPDATE ${TABLES.supplyOrderCostLog}
        SET ${logCols.nccPaymentStatus} = ?,
            ${logCols.loggedAt} = NOW()
        WHERE ${logCols.supplyId} = ?
          AND TRIM(COALESCE(${logCols.nccPaymentStatus}::text, '')) <> ?;
      `,
        [STATUS.PAID, resolvedSupplyId, STATUS.PAID]
      );

      return {
        paymentRow: insertResult.rows?.[0] || null,
        verification: {
          supplyId: resolvedSupplyId,
          unpaidCount,
          netUnpaidAmount,
          expectedPaidAmount,
          direction: isSupplierRefundToShop ? "supplier_refund_to_shop" : "shop_pay_to_supplier",
          paymentContent: paymentContent || null,
          paymentPeriod: periodLabel,
          matchedReceiptId: matchedReceipt?.id || null,
        },
      };
    });

    if (!result?.paymentRow) {
      return res.status(500).json({ error: "Không thể tạo chu kỳ thanh toán." });
    }
    res.json({
      ...result.paymentRow,
      verification: result.verification,
    });
  } catch (error) {
    const statusCode = Number(error?.status) || 500;
    logger.error(
      `[payments] Mutation failed (POST /api/payment-supply/${paymentId}/confirm)`,
      { paymentId, error: error.message, stack: error.stack }
    );
    res.status(statusCode).json({
      error: error.message || "Không thể xác nhận thanh toán.",
    });
  }
};

module.exports = {
  listPaymentReceipts,
  createPaymentReceiptBatch,
  listPaymentReceiptBatches,
  getPaymentReceiptBatchDetail,
  listMatchableOrders,
  confirmPaymentSupply,
  reconcilePaymentReceipt,
};
