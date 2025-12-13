const { db, withTransaction } = require("../db");
const { DB_SCHEMA, getDefinition, tableName } = require("../config/dbSchema");
const { QUOTED_COLS } = require("../utils/columns");
const {
  createDateNormalization,
  createVietnameseStatusKey,
} = require("../utils/sql");

const PAYMENT_RECEIPT_DEF = getDefinition("PAYMENT_RECEIPT");
const PAYMENT_SUPPLY_DEF = getDefinition("PAYMENT_SUPPLY");
const SUPPLY_DEF = getDefinition("SUPPLY");
const BANK_LIST_DEF = getDefinition("BANK_LIST");

const TABLES = {
  paymentReceipt: tableName(DB_SCHEMA.PAYMENT_RECEIPT.TABLE),
  paymentSupply: tableName(DB_SCHEMA.PAYMENT_SUPPLY.TABLE),
  supply: tableName(DB_SCHEMA.SUPPLY.TABLE),
  bankList: tableName(DB_SCHEMA.BANK_LIST.TABLE),
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

    const receipts = (rows || []).map((row) => ({
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
    res.status(500).json({ error: "Unable to load payment receipts." });
  }
};

const confirmPaymentSupply = async (req, res) => {
  const { paymentId } = req.params;
  const parsedPaymentId = Number.parseInt(paymentId, 10);
  if (!Number.isInteger(parsedPaymentId) || parsedPaymentId <= 0) {
    return res.status(400).json({
      error: "Invalid payment id.",
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
        WHERE ${QUOTED_COLS.paymentSupply.id} = $1
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
        `SELECT ${QUOTED_COLS.supply.sourceName} AS source_name FROM ${TABLES.supply} WHERE ${QUOTED_COLS.supply.id} = $1 LIMIT 1;`,
        [sourceId]
      );
      const sourceName =
        supplyResult.rows?.[0]?.source_name !== undefined
          ? supplyResult.rows[0].source_name
          : "";
      const trimmedSourceName = sourceName.trim();

      const unpaidResult = await trx.raw(
        `
        SELECT
          id,
          COALESCE(cost, 0) AS cost,
          ${createDateNormalization("order_date")} AS order_date
        FROM ${TABLES.orderList}
        WHERE ${createVietnameseStatusKey("status")} = 'chua thanh toan'
          AND COALESCE(check_flag, FALSE) = FALSE
          AND TRIM(supply::text) = TRIM($1)
        ORDER BY order_date ASC NULLS FIRST, id ASC;
      `,
        [trimmedSourceName]
      );

      const unpaidRows = unpaidResult.rows || [];
      let runningSum = 0;
      const orderIdsToMark = [];
      for (const row of unpaidRows) {
        if (runningSum >= normalizedPaidAmount) break;
        const costValue = Number(row.cost) || 0;
        runningSum += costValue;
        orderIdsToMark.push(row.id);
      }

      if (orderIdsToMark.length) {
        await trx.raw(
          `
          UPDATE ${TABLES.orderList}
          SET status = 'Da Thanh Toan',
              check_flag = TRUE
          WHERE id = ANY($1::int[]);
        `,
          [orderIdsToMark]
        );
      }

      const totalUnpaidImport = unpaidRows.reduce(
        (acc, row) => acc + (Number(row.cost) || 0),
        0
      );
      const remainingImport = Math.max(0, totalUnpaidImport - normalizedPaidAmount);

      let hasUnpaidCycle = false;
      if (sourceId) {
        const unpaidCycleResult = await trx.raw(
          `
          SELECT 1
          FROM ${TABLES.paymentSupply} ps
          WHERE ps.${QUOTED_COLS.paymentSupply.sourceId} = $1
            AND ${createVietnameseStatusKey(`ps.${QUOTED_COLS.paymentSupply.status}`)} = 'chua thanh toan'
          LIMIT 1;
        `,
          [sourceId]
        );
        hasUnpaidCycle = unpaidCycleResult.rows?.length > 0;
      }

      if (remainingImport > 0 && sourceId && !hasUnpaidCycle) {
        await trx.raw(
          `
          INSERT INTO ${TABLES.paymentSupply} (${QUOTED_COLS.paymentSupply.sourceId}, ${QUOTED_COLS.paymentSupply.importValue}, ${QUOTED_COLS.paymentSupply.paid}, ${QUOTED_COLS.paymentSupply.round}, ${QUOTED_COLS.paymentSupply.status})
          VALUES ($1, $2, 0, $3, 'Chua Thanh Toan');
        `,
          [sourceId, remainingImport, todayDMY]
        );
      }

      const updateResult = await trx.raw(
        `
      UPDATE ${TABLES.paymentSupply}
      SET ${QUOTED_COLS.paymentSupply.status} = 'Da Thanh Toan',
          ${QUOTED_COLS.paymentSupply.paid} = $2,
          ${QUOTED_COLS.paymentSupply.round} = TRIM(BOTH ' ' FROM CONCAT(COALESCE(${QUOTED_COLS.paymentSupply.round}::text, ''), ' - ', $3::text))
      WHERE ${QUOTED_COLS.paymentSupply.id} = $1
      RETURNING ${QUOTED_COLS.paymentSupply.id} AS id, ${QUOTED_COLS.paymentSupply.sourceId} AS source_id, ${QUOTED_COLS.paymentSupply.importValue} AS import, ${QUOTED_COLS.paymentSupply.paid} AS paid, ${QUOTED_COLS.paymentSupply.status} AS status, ${QUOTED_COLS.paymentSupply.round} AS round;
    `,
        [parsedPaymentId, normalizedPaidAmount, todayDMY]
      );

      return updateResult.rows?.[0] || null;
    });

    if (!updatedRow) {
      return res.status(404).json({ error: "Payment record not found." });
    }
    res.json(updatedRow);
  } catch (error) {
    console.error(
      `[payments] Mutation failed (POST /api/payment-supply/${paymentId}/confirm):`,
      error
    );
    res.status(500).json({
      error: "Unable to confirm payment.",
    });
  }
};

module.exports = {
  listPaymentReceipts,
  confirmPaymentSupply,
};
