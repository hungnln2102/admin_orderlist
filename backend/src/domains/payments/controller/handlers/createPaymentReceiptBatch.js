const { withTransaction } = require("../../../../db");
const { STATUS } = require("../../../../utils/statuses");
const logger = require("../../../../utils/logger");
const { ensureOrderTransaction } = require("../../../orders/use-cases/ensureOrderTransaction");
const {
  TABLES,
  ORDER_COLS,
  PAYMENT_RECEIPT_BATCH_COLS,
  PAYMENT_RECEIPT_BATCH_ITEM_COLS,
} = require("../shared/constants");
const {
  parseOrderCodesInput,
  parseTransactionCodesInput,
  isMissingBatchTablesError,
  createHttpError,
  normalizeMoney,
} = require("../shared/helpers");
const {
  generateUniqueBatchTransferCode,
} = require("../shared/batchTransferCode");

const resolveOrdersForBatch = async (trx, { transactionCodes, legacyOrderCodes }) => {
  if (transactionCodes.length > 0) {
    const rows = await trx(TABLES.orderList)
      .select(
        ORDER_COLS.id,
        ORDER_COLS.idOrder,
        ORDER_COLS.status,
        ORDER_COLS.price,
        ORDER_COLS.transaction
      )
      .whereRaw(
        `UPPER(TRIM(${ORDER_COLS.transaction}::text)) IN (${transactionCodes.map(() => "?").join(",")})`,
        transactionCodes
      );

    const byTransaction = new Map(
      (rows || []).map((row) => [
        String(row?.[ORDER_COLS.transaction] || "").trim().toUpperCase(),
        row,
      ])
    );
    const missingTransactionCodes = transactionCodes.filter((code) => !byTransaction.has(code));
    if (missingTransactionCodes.length > 0) {
      throw createHttpError(
        400,
        `Không tìm thấy ${missingTransactionCodes.length} mã giao dịch: ${missingTransactionCodes.join(", ")}`
      );
    }

    return {
      rows: transactionCodes.map((code) => byTransaction.get(code)).filter(Boolean),
      transactionCodes,
    };
  }

  if (legacyOrderCodes.length > 0) {
    const rows = await trx(TABLES.orderList)
      .select(
        ORDER_COLS.id,
        ORDER_COLS.idOrder,
        ORDER_COLS.status,
        ORDER_COLS.price,
        ORDER_COLS.transaction
      )
      .whereRaw(
        `UPPER(TRIM(${ORDER_COLS.idOrder}::text)) IN (${legacyOrderCodes.map(() => "?").join(",")})`,
        legacyOrderCodes
      );

    const byOrderCode = new Map(
      (rows || []).map((row) => [
        String(row?.[ORDER_COLS.idOrder] || "").trim().toUpperCase(),
        row,
      ])
    );
    const missingOrderCodes = legacyOrderCodes.filter((code) => !byOrderCode.has(code));
    if (missingOrderCodes.length > 0) {
      throw createHttpError(
        400,
        `Không tìm thấy ${missingOrderCodes.length} mã đơn: ${missingOrderCodes.join(", ")}`
      );
    }

    const resolvedRows = [];
    const resolvedTransactionCodes = [];
    for (const code of legacyOrderCodes) {
      const row = byOrderCode.get(code);
      const ensured = await ensureOrderTransaction({ order: row, trx });
      resolvedRows.push({
        ...row,
        [ORDER_COLS.transaction]: ensured.transaction,
      });
      resolvedTransactionCodes.push(ensured.transaction);
    }

    return {
      rows: resolvedRows,
      transactionCodes: resolvedTransactionCodes,
    };
  }

  return { rows: [], transactionCodes: [] };
};

const createPaymentReceiptBatch = async (req, res) => {
  const rawTransactionCodes =
    req.body?.transactionCodes ??
    req.body?.transactionCode ??
    req.body?.transactions ??
    null;
  const rawOrderCodes =
    req.body?.orderCodes ?? req.body?.orders ?? req.body?.orderCode ?? "";
  const note = String(req.body?.note || "").trim();

  let transactionCodes = parseTransactionCodesInput(rawTransactionCodes);
  if (transactionCodes.length === 0) {
    transactionCodes = parseTransactionCodesInput(rawOrderCodes);
  }
  const legacyOrderCodes =
    transactionCodes.length > 0 ? [] : parseOrderCodesInput(rawOrderCodes);

  if (transactionCodes.length === 0 && legacyOrderCodes.length === 0) {
    return res.status(400).json({
      error: "Thiếu danh sách mã giao dịch 8 ký tự hợp lệ.",
    });
  }

  try {
    const result = await withTransaction(async (trx) => {
      const { rows, transactionCodes: resolvedTransactionCodes } =
        await resolveOrdersForBatch(trx, { transactionCodes, legacyOrderCodes });

      const disallowed = rows.filter((row) => {
        const status = String(row?.[ORDER_COLS.status] || "").trim();
        return status !== STATUS.UNPAID && status !== STATUS.RENEWAL;
      });
      if (disallowed.length > 0) {
        const preview = disallowed
          .slice(0, 5)
          .map((row) => String(row?.[ORDER_COLS.transaction] || row?.[ORDER_COLS.idOrder] || "").trim().toUpperCase())
          .join(", ");
        throw createHttpError(
          409,
          `Chỉ tạo biên lai nhóm cho đơn Chưa Thanh Toán/Cần Gia Hạn. Không hợp lệ: ${preview}`
        );
      }

      const batchCode = await generateUniqueBatchTransferCode(trx);

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
        transactionCodes: resolvedTransactionCodes,
        orderCodes: rows.map((row) =>
          String(row?.[ORDER_COLS.idOrder] || "").trim().toUpperCase()
        ),
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
          "Tính năng mã gộp CK chưa sẵn sàng trên database. Vui lòng chạy migration backend rồi thử lại.",
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

module.exports = { createPaymentReceiptBatch };
