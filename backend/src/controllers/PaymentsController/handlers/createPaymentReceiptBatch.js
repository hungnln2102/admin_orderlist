const { withTransaction } = require("../../../db");
const { STATUS } = require("../../../utils/statuses");
const logger = require("../../../utils/logger");
const {
  TABLES,
  ORDER_COLS,
  PAYMENT_RECEIPT_BATCH_COLS,
  PAYMENT_RECEIPT_BATCH_ITEM_COLS,
} = require("../shared/constants");
const {
  parseOrderCodesInput,
  generateCandidateBatchCode,
  isMissingBatchTablesError,
  createHttpError,
  normalizeMoney,
} = require("../shared/helpers");

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

module.exports = { createPaymentReceiptBatch };
