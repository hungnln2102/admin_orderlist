const { db, withTransaction } = require("../../db");
const {
  getDefinition,
  PARTNER_SCHEMA,
  FINANCE_SCHEMA,
  SCHEMA_PARTNER,
  SCHEMA_SUPPLIER,
  SCHEMA_ORDERS,
  SCHEMA_FINANCE,
  ORDERS_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const { QUOTED_COLS } = require("../../utils/columns");
const { STATUS } = require("../../utils/statuses");
const logger = require("../../utils/logger");

const PAYMENT_RECEIPT_DEF = getDefinition("PAYMENT_RECEIPT", ORDERS_SCHEMA);
const PAYMENT_RECEIPT_STATE_DEF = getDefinition(
  "PAYMENT_RECEIPT_FINANCIAL_STATE",
  ORDERS_SCHEMA
);
const ORDER_LIST_DEF = getDefinition("ORDER_LIST", ORDERS_SCHEMA);
const DASHBOARD_SUMMARY_DEF = getDefinition(
  "DASHBOARD_MONTHLY_SUMMARY",
  FINANCE_SCHEMA
);
const PAYMENT_SUPPLY_DEF = getDefinition("PAYMENT_SUPPLY", PARTNER_SCHEMA);
const TABLES = {
  paymentReceipt: tableName(PAYMENT_RECEIPT_DEF.tableName, SCHEMA_ORDERS),
  paymentReceiptState: tableName(PAYMENT_RECEIPT_STATE_DEF.tableName, SCHEMA_ORDERS),
  orderList: tableName(ORDER_LIST_DEF.tableName, SCHEMA_ORDERS),
  dashboardSummary: tableName(DASHBOARD_SUMMARY_DEF.tableName, SCHEMA_FINANCE),
  paymentSupply: tableName(PAYMENT_SUPPLY_DEF.tableName, SCHEMA_PARTNER),
  supply: tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_SUPPLIER),
  supplyOrderCostLog: tableName(PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE, SCHEMA_PARTNER),
};
const PS = QUOTED_COLS.paymentSupply;
const RECEIPT_STATE_COLS = PAYMENT_RECEIPT_STATE_DEF.columns;
const ORDER_COLS = ORDER_LIST_DEF.columns;
const SUMMARY_COLS = DASHBOARD_SUMMARY_DEF.columns;

const normalizeMoney = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  const numeric = Number.parseFloat(cleaned || "0");
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
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
};

const listPaymentReceipts = async (req, res) => {
  const limitParam = Number.parseInt(req.query.limit, 10);
  const offsetParam = Number.parseInt(req.query.offset, 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 500)
    : 200;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

  try {
    const rows = await db(TABLES.paymentReceipt)
      .leftJoin(
        TABLES.paymentReceiptState,
        `${TABLES.paymentReceiptState}.${RECEIPT_STATE_COLS.paymentReceiptId}`,
        `${TABLES.paymentReceipt}.${PAYMENT_RECEIPT_DEF.columns.id}`
      )
      .select({
        id: PAYMENT_RECEIPT_DEF.columns.id,
        orderCode: PAYMENT_RECEIPT_DEF.columns.orderCode,
        paidAt: PAYMENT_RECEIPT_DEF.columns.paidDate,
        amount: PAYMENT_RECEIPT_DEF.columns.amount,
        sender: PAYMENT_RECEIPT_DEF.columns.sender,
        receiver: PAYMENT_RECEIPT_DEF.columns.receiver,
        note: PAYMENT_RECEIPT_DEF.columns.note,
        isFinancialPosted: `${TABLES.paymentReceiptState}.${RECEIPT_STATE_COLS.isFinancialPosted}`,
        postedRevenue: `${TABLES.paymentReceiptState}.${RECEIPT_STATE_COLS.postedRevenue}`,
        postedProfit: `${TABLES.paymentReceiptState}.${RECEIPT_STATE_COLS.postedProfit}`,
        reconciledAt: `${TABLES.paymentReceiptState}.${RECEIPT_STATE_COLS.reconciledAt}`,
        adjustmentApplied: `${TABLES.paymentReceiptState}.${RECEIPT_STATE_COLS.adjustmentApplied}`,
      })
      .orderBy([
        { column: PAYMENT_RECEIPT_DEF.columns.paidDate, order: "desc" },
        { column: PAYMENT_RECEIPT_DEF.columns.id, order: "desc" },
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
    logger.error("[payments] Query failed (payment-receipts)", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải biên lai thanh toán." });
  }
};

const reconcilePaymentReceipt = async (req, res) => {
  const receiptId = Number.parseInt(req.params.receiptId, 10);
  const orderCodeRaw = String(req.body?.orderCode || "").trim().toUpperCase();
  if (!Number.isFinite(receiptId) || receiptId <= 0) {
    return res.status(400).json({ error: "receiptId không hợp lệ." });
  }
  if (!/^MAV[A-Z0-9]{3,20}$/i.test(orderCodeRaw)) {
    return res.status(400).json({ error: "orderCode không đúng định dạng MAV." });
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

      if (stateRow?.[RECEIPT_STATE_COLS.adjustmentApplied]) {
        return {
          receiptId,
          orderCode: orderCodeRaw,
          skipped: true,
          reason: "adjustment already applied",
        };
      }

      const receiptMonthKey = toMonthKey(receiptRes[PAYMENT_RECEIPT_DEF.columns.paidDate]);
      const postedRevenue = Number(stateRow?.[RECEIPT_STATE_COLS.postedRevenue]) || 0;
      const postedProfit = Number(stateRow?.[RECEIPT_STATE_COLS.postedProfit]) || 0;
      const statusValue = String(orderRow[ORDER_COLS.status] || "").trim();

      let revenueDelta = 0;
      let profitDelta = 0;

      if (statusValue === STATUS.PAID || statusValue === STATUS.PROCESSING) {
        // Đơn đã được xử lý trước đó: đảo phần đã cộng tạm từ receipt không mã.
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

      const nextPostedRevenue = postedRevenue + revenueDelta;
      const nextPostedProfit = postedProfit + profitDelta;

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

      return {
        receiptId,
        orderCode: orderCodeRaw,
        status: statusValue,
        revenueDelta,
        profitDelta,
        postedRevenue: nextPostedRevenue,
        postedProfit: nextPostedProfit,
        reconciledAt: new Date().toISOString(),
      };
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    logger.error("[payments] reconcile payment receipt failed", {
      receiptId,
      orderCode: orderCodeRaw,
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: error.message || "Không thể reconcile biên lai." });
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
  const parsePaid = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return value;
    }
    const cleaned = String(value).replace(/[^0-9]/g, "");
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isFinite(num) && num >= 0 ? num : null;
  };

  const supplyIdFromBody = parsePositiveInt(req.body?.supplyId);
  const paidAmountNumber = parsePaid(req.body?.paidAmount);

  if (paidAmountNumber === null || paidAmountNumber <= 0) {
    return res.status(400).json({ error: "Số tiền thanh toán không hợp lệ." });
  }

  try {
    const createdRow = await withTransaction(async (trx) => {
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
        throw new Error("Thiếu nhà cung cấp để xác nhận thanh toán.");
      }

      const logCols = QUOTED_COLS.supplierOrderCostLog;
      const unpaidLogSummary = await trx.raw(
        `
        SELECT
          MIN(${logCols.loggedAt}::date) AS oldest_date,
          COUNT(*)::int AS unpaid_count
        FROM ${TABLES.supplyOrderCostLog}
        WHERE ${logCols.supplyId} = ?
          AND TRIM(COALESCE(${logCols.nccPaymentStatus}::text, '')) <> ?;
      `,
        [resolvedSupplyId, STATUS.PAID]
      );

      const summary = unpaidLogSummary.rows?.[0] || {};
      const unpaidCount = Number(summary.unpaid_count) || 0;
      if (unpaidCount <= 0) {
        throw new Error("Không có log NCC chưa thanh toán để chốt.");
      }

      const oldestDate = summary.oldest_date ? new Date(summary.oldest_date) : null;
      const toDmy = (date) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear());
        return `${day}/${month}/${year}`;
      };
      const periodLabel = toDmy(oldestDate);
      const addAmount = Math.round(paidAmountNumber);

      const existingPay = await trx.raw(
        `
        SELECT ${PS.id} AS id
        FROM ${TABLES.paymentSupply}
        WHERE ${PS.sourceId} = ?
        LIMIT 1;
      `,
        [resolvedSupplyId]
      );
      const existingId = existingPay.rows?.[0]?.id;

      let insertResult;
      if (existingId != null) {
        insertResult = await trx.raw(
          `
          UPDATE ${TABLES.paymentSupply}
          SET
            ${PS.paid} = COALESCE(${PS.paid}, 0) + ?,
            ${PS.round} = ?,
            ${PS.status} = COALESCE(NULLIF(TRIM(${PS.status}), ''), '')
          WHERE ${PS.id} = ?
          RETURNING ${PS.id} AS id,
                    ${PS.sourceId} AS source_id,
                    ${PS.round} AS round,
                    ${PS.status} AS status,
                    COALESCE(${PS.paid}::numeric, 0) AS paid;
        `,
          [addAmount, periodLabel, existingId]
        );
      } else {
        insertResult = await trx.raw(
          `
          INSERT INTO ${TABLES.paymentSupply} (${PS.sourceId}, ${PS.round}, ${PS.status}, ${PS.paid})
          VALUES (?, ?, ?, ?)
          RETURNING ${PS.id} AS id,
                    ${PS.sourceId} AS source_id,
                    ${PS.round} AS round,
                    ${PS.status} AS status,
                    COALESCE(${PS.paid}::numeric, 0) AS paid;
        `,
          [resolvedSupplyId, periodLabel, "", addAmount]
        );
      }

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

      return insertResult.rows?.[0] || null;
    });

    if (!createdRow) {
      return res.status(500).json({ error: "Không thể tạo chu kỳ thanh toán." });
    }
    res.json(createdRow);
  } catch (error) {
    logger.error(
      `[payments] Mutation failed (POST /api/payment-supply/${paymentId}/confirm)`,
      { paymentId, error: error.message, stack: error.stack }
    );
    res.status(500).json({
      error: error.message || "Không thể xác nhận thanh toán.",
    });
  }
};

module.exports = {
  listPaymentReceipts,
  confirmPaymentSupply,
  reconcilePaymentReceipt,
};
