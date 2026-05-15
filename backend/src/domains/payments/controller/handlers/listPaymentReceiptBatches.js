const { db } = require("../../../../db");
const logger = require("../../../../utils/logger");
const {
  TABLES,
  PAYMENT_RECEIPT_BATCH_COLS,
} = require("../shared/constants");
const { isMissingBatchTablesError } = require("../shared/helpers");

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

module.exports = { listPaymentReceiptBatches };
