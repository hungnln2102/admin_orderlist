const { db, withTransaction } = require("../../db");
const {
  getDefinition,
  PARTNER_SCHEMA,
  SCHEMA_PARTNER,
  SCHEMA_SUPPLIER,
  SCHEMA_ORDERS,
  ORDERS_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const { QUOTED_COLS } = require("../../utils/columns");
const { STATUS } = require("../../utils/statuses");
const logger = require("../../utils/logger");

const PAYMENT_RECEIPT_DEF = getDefinition("PAYMENT_RECEIPT", ORDERS_SCHEMA);
const PAYMENT_SUPPLY_DEF = getDefinition("PAYMENT_SUPPLY", PARTNER_SCHEMA);
const TABLES = {
  paymentReceipt: tableName(PAYMENT_RECEIPT_DEF.tableName, SCHEMA_ORDERS),
  paymentSupply: tableName(PAYMENT_SUPPLY_DEF.tableName, SCHEMA_PARTNER),
  supply: tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_SUPPLIER),
  supplyOrderCostLog: tableName(PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE, SCHEMA_PARTNER),
};
const PS = QUOTED_COLS.paymentSupply;

const listPaymentReceipts = async (req, res) => {
  const limitParam = Number.parseInt(req.query.limit, 10);
  const offsetParam = Number.parseInt(req.query.offset, 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 500)
    : 200;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

  try {
    const rows = await db(TABLES.paymentReceipt)
      .select({
        id: PAYMENT_RECEIPT_DEF.columns.id,
        orderCode: PAYMENT_RECEIPT_DEF.columns.orderCode,
        paidAt: PAYMENT_RECEIPT_DEF.columns.paidDate,
        amount: PAYMENT_RECEIPT_DEF.columns.amount,
        sender: PAYMENT_RECEIPT_DEF.columns.sender,
        receiver: PAYMENT_RECEIPT_DEF.columns.receiver,
        note: PAYMENT_RECEIPT_DEF.columns.note,
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
    }));

    res.json({ receipts, count: receipts.length, offset, limit });
  } catch (error) {
    logger.error("[payments] Query failed (payment-receipts)", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải biên lai thanh toán." });
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
  const paymentContent = String(req.body?.paymentContent ?? "").trim();

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
          MAX(${logCols.loggedAt}::date) AS newest_date,
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
      const newestDate = summary.newest_date ? new Date(summary.newest_date) : null;
      const toDmy = (date) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear());
        return `${day}/${month}/${year}`;
      };
      const periodLabel = `${toDmy(oldestDate)} - ${toDmy(newestDate)}`;

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
        [resolvedSupplyId, periodLabel, paymentContent, Math.round(paidAmountNumber)]
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
};
