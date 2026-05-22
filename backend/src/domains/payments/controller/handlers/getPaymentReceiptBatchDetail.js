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

    const items = await db({ bi: TABLES.paymentReceiptBatchItem })
      .leftJoin({ o: TABLES.orderList }, function joinOrder() {
        this.on(
          `bi.${PAYMENT_RECEIPT_BATCH_ITEM_COLS.ORDER_LIST_ID}`,
          `o.${ORDER_COLS.id}`
        );
      })
      .select({
        id: `bi.${PAYMENT_RECEIPT_BATCH_ITEM_COLS.ID}`,
        orderCode: `bi.${PAYMENT_RECEIPT_BATCH_ITEM_COLS.ORDER_CODE}`,
        orderListId: `bi.${PAYMENT_RECEIPT_BATCH_ITEM_COLS.ORDER_LIST_ID}`,
        amount: `bi.${PAYMENT_RECEIPT_BATCH_ITEM_COLS.AMOUNT}`,
        status: `bi.${PAYMENT_RECEIPT_BATCH_ITEM_COLS.STATUS}`,
        createdAt: `bi.${PAYMENT_RECEIPT_BATCH_ITEM_COLS.CREATED_AT}`,
        transaction: `o.${ORDER_COLS.transaction}`,
      })
      .whereRaw(`UPPER(bi.${PAYMENT_RECEIPT_BATCH_ITEM_COLS.BATCH_CODE}::text) = ?`, [batchCode])
      .orderBy(`bi.${PAYMENT_RECEIPT_BATCH_ITEM_COLS.ID}`, "asc");

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
        id: Number(row?.id) || 0,
        orderCode: String(row?.orderCode || "").trim().toUpperCase(),
        transaction: String(row?.transaction || "").trim().toUpperCase(),
        orderListId: Number(row?.orderListId) || null,
        amount: Number(row?.amount) || 0,
        status: String(row?.status || "pending"),
        createdAt: row?.createdAt || null,
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
