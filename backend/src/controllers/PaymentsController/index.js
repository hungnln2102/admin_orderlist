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
const {
  createDateNormalization,
} = require("../../utils/sql");

const PAYMENT_RECEIPT_DEF = getDefinition("PAYMENT_RECEIPT", ORDERS_SCHEMA);
const PAYMENT_SUPPLY_DEF = getDefinition("PAYMENT_SUPPLY", PARTNER_SCHEMA);
const TABLES = {
  paymentReceipt: tableName(PAYMENT_RECEIPT_DEF.tableName, SCHEMA_ORDERS),
  paymentSupply: tableName(PAYMENT_SUPPLY_DEF.tableName, SCHEMA_PARTNER),
  supply: tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_SUPPLIER),
  orderList: tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS),
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
    console.error("[payments] Query failed (payment-receipts):", error);
    res.status(500).json({ error: "Không thể tải biên lai thanh toán." });
  }
};

const confirmPaymentSupply = async (req, res) => {
  const { paymentId } = req.params;
  const parsedPaymentId = Number.parseInt(paymentId, 10);
  if (!Number.isInteger(parsedPaymentId) || parsedPaymentId <= 0) {
    return res.status(400).json({
      error: "ID thanh toán không hợp lệ.",
    });
  }

  const paidAmountRaw = req.body?.paidAmount;
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
  const paidAmountNumber = parsePaid(paidAmountRaw);
  const hasPaidAmount = paidAmountNumber !== null;

  try {
    const updatedRow = await withTransaction(async (trx) => {
      const paymentResult = await trx.raw(
        `
        SELECT ${QUOTED_COLS.paymentSupply.id} AS id,
               ${QUOTED_COLS.paymentSupply.sourceId} AS source_id,
               ${QUOTED_COLS.paymentSupply.importValue} AS import,
               ${QUOTED_COLS.paymentSupply.paid} AS paid,
               ${QUOTED_COLS.paymentSupply.round} AS round,
               ${QUOTED_COLS.paymentSupply.status} AS status
        FROM ${TABLES.paymentSupply}
        WHERE ${QUOTED_COLS.paymentSupply.id} = ?
        LIMIT 1;
      `,
        [parsedPaymentId]
      );
      if (!paymentResult.rows?.length) {
        return null;
      }
      const paymentRow = paymentResult.rows[0];
      const sourceId = Number(paymentRow.source_id);
      const normalizedPaidAmount =
        hasPaidAmount && paidAmountNumber !== null
          ? paidAmountNumber
          : Number(paymentRow.import) || 0;

      const todayDMY = (() => {
        const now = new Date();
        const day = String(now.getUTCDate()).padStart(2, "0");
        const month = String(now.getUTCMonth() + 1).padStart(2, "0");
        const year = now.getUTCFullYear();
        return `${day}/${month}/${year}`;
      })();

      const supplyResult = await trx.raw(
        `SELECT ${QUOTED_COLS.supplier.supplierName} AS source_name FROM ${TABLES.supply} WHERE ${QUOTED_COLS.supplier.id} = ? LIMIT 1;`,
        [sourceId]
      );
      const sourceName =
        supplyResult.rows?.[0]?.source_name !== undefined
          ? supplyResult.rows[0].source_name
          : "";
      const trimmedSourceName = sourceName.trim();

      const UNPAID_STATUS = STATUS.UNPAID;
      const PROCESSING_STATUS = STATUS.PROCESSING;
      const PAID_STATUS = STATUS.PAID;

      let carryoverImport = null;
      try {
        const processingResult = await trx.raw(
          `
          SELECT
            ${QUOTED_COLS.orderList.id} AS id,
            COALESCE(${QUOTED_COLS.orderList.cost}, 0) AS cost,
            ${createDateNormalization(QUOTED_COLS.orderList.orderDate)} AS order_date
          FROM ${TABLES.orderList}
          WHERE ${QUOTED_COLS.orderList.status} = ?
            AND TRIM(${QUOTED_COLS.orderList.supply}::text) = TRIM(?)
          ORDER BY order_date ASC NULLS FIRST, ${QUOTED_COLS.orderList.id} ASC;
        `,
        [PROCESSING_STATUS, trimmedSourceName]
        );

        const processingRows = processingResult.rows || [];
        let runningSum = 0;
        const orderIdsToMark = [];
        for (const row of processingRows) {
          if (runningSum >= normalizedPaidAmount) break;
          const costValue = Number(row.cost) || 0;
          runningSum += costValue;
          orderIdsToMark.push(row.id);
        }

        if (orderIdsToMark.length) {
          await trx.raw(
            `
            UPDATE ${TABLES.orderList}
            SET ${QUOTED_COLS.orderList.status} = ?
            WHERE ${QUOTED_COLS.orderList.id} = ANY(?::int[]);
          `,
            [PAID_STATUS, orderIdsToMark]
          );
        }


        const totalProcessingImport = processingRows.reduce(
          (acc, row) => acc + (Number(row.cost) || 0),
          0
        );
        const importDelta = totalProcessingImport - normalizedPaidAmount;
        // Chỉ tạo chu kỳ mới khi còn nợ (tổng đơn > tiền thanh toán)
        // Nếu tiền thanh toán > tổng đơn, không tạo chu kỳ mới (tránh vòng lặp vô tận)
        carryoverImport = importDelta > 0 ? importDelta : null;
      } catch (orderErr) {
        console.error(
          "[payments] Không thể đối chiếu các đơn đặt hàng chưa thanh toán cho hàng hóa",
          sourceId,
          orderErr
        );
      }

      let hasUnpaidCycle = false;
      if (sourceId) {
        const unpaidCycleResult = await trx.raw(
          `
          SELECT 1
          FROM ${TABLES.paymentSupply} ps
          WHERE ${QUOTED_COLS.paymentSupply.sourceId} = ?
            AND ${QUOTED_COLS.paymentSupply.status} = ?
            AND ${QUOTED_COLS.paymentSupply.id} <> ?
          LIMIT 1;
        `,
          [sourceId, UNPAID_STATUS, parsedPaymentId]
        );
        hasUnpaidCycle = unpaidCycleResult.rows?.length > 0;
      }

      if (carryoverImport !== null && carryoverImport > 0 && sourceId && !hasUnpaidCycle) {
        await trx.raw(
          `
          INSERT INTO ${TABLES.paymentSupply} (${QUOTED_COLS.paymentSupply.sourceId}, ${QUOTED_COLS.paymentSupply.importValue}, ${QUOTED_COLS.paymentSupply.paid}, ${QUOTED_COLS.paymentSupply.round}, ${QUOTED_COLS.paymentSupply.status})
          VALUES (?, ?, 0, ?, ?);
        `,
          [sourceId, carryoverImport, todayDMY, UNPAID_STATUS]
        );
      }

      const updateResult = await trx.raw(
        `
      UPDATE ${TABLES.paymentSupply}
      SET ${QUOTED_COLS.paymentSupply.status} = ?,
          ${QUOTED_COLS.paymentSupply.paid} = ?,
          ${QUOTED_COLS.paymentSupply.round} = TRIM(BOTH ' ' FROM CONCAT(COALESCE(${QUOTED_COLS.paymentSupply.round}::text, ''), ' - ', ?::text))
      WHERE ${QUOTED_COLS.paymentSupply.id} = ?
      RETURNING ${QUOTED_COLS.paymentSupply.id} AS id, 
                ${QUOTED_COLS.paymentSupply.sourceId} AS source_id, 
                ${QUOTED_COLS.paymentSupply.importValue} AS import, 
                ${QUOTED_COLS.paymentSupply.paid} AS paid, 
                ${QUOTED_COLS.paymentSupply.status} AS status, 
                ${QUOTED_COLS.paymentSupply.round} AS round;
    `,
        [PAID_STATUS, normalizedPaidAmount, todayDMY, parsedPaymentId]
      );

      return updateResult.rows?.[0] || null;
    });

    if (!updatedRow) {
      return res.status(404).json({ error: "Không tìm thấy hồ sơ thanh toán." });
    }
    res.json(updatedRow);
  } catch (error) {
    console.error(
      `[payments] Mutation failed (POST /api/payment-supply/${paymentId}/confirm):`,
      error
    );
    res.status(500).json({
      error: "Không thể xác nhận thanh toán.",
    });
  }
};

module.exports = {
  listPaymentReceipts,
  confirmPaymentSupply,
};
