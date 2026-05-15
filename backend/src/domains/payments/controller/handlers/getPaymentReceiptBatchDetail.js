const { db } = require("../../../../db");
const logger = require("../../../../utils/logger");
const {
  TABLES,
  PAYMENT_RECEIPT_BATCH_COLS,
  PAYMENT_RECEIPT_BATCH_ITEM_COLS,
  BATCH_CODE_REGEX_STRICT,
} = require("../shared/constants");
const { isMissingBatchTablesError } = require("../shared/helpers");

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

module.exports = { getPaymentReceiptBatchDetail };
