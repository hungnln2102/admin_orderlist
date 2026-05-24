const { withTransaction } = require("../../../../db");
const { STATUS } = require("../../../../utils/statuses");
const logger = require("../../../../utils/logger");
const { resolveDefaultShopBankAccount } = require("../../../../services/shopBankAccountResolver");
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
const { generateUniqueMavgBatchCode } = require("../shared/batchTransferCode");
const { computeBatchPaymentTotal } = require("../batch/computeBatchPaymentTotal");

const resolveOrdersForBatch = async (trx, { transactionCodes, orderCodes }) => {
  if (orderCodes.length > 0) {
    const rows = await trx(TABLES.orderList)
      .select(
        ORDER_COLS.id,
        ORDER_COLS.idOrder,
        ORDER_COLS.status,
        ORDER_COLS.price,
        ORDER_COLS.transaction
      )
      .whereRaw(
        `UPPER(TRIM(${ORDER_COLS.idOrder}::text)) IN (${orderCodes.map(() => "?").join(",")})`,
        orderCodes
      );

    const byOrderCode = new Map(
      (rows || []).map((row) => [
        String(row?.[ORDER_COLS.idOrder] || "").trim().toUpperCase(),
        row,
      ])
    );
    const missingOrderCodes = orderCodes.filter((code) => !byOrderCode.has(code));
    if (missingOrderCodes.length > 0) {
      throw createHttpError(
        400,
        `Không tìm thấy ${missingOrderCodes.length} mã đơn: ${missingOrderCodes.join(", ")}`
      );
    }

    return {
      rows: orderCodes.map((code) => byOrderCode.get(code)).filter(Boolean),
      orderCodes,
    };
  }

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
      orderCodes: transactionCodes
        .map((code) =>
          String(byTransaction.get(code)?.[ORDER_COLS.idOrder] || "").trim().toUpperCase()
        )
        .filter(Boolean),
    };
  }

  return { rows: [], orderCodes: [] };
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

  const orderCodes = parseOrderCodesInput(rawOrderCodes);
  const transactionCodes =
    orderCodes.length > 0 ? [] : parseTransactionCodesInput(rawTransactionCodes);

  if (orderCodes.length === 0 && transactionCodes.length === 0) {
    return res.status(400).json({
      error: "Thiếu danh sách mã đơn (MAVC, MAVL, …) hợp lệ.",
    });
  }

  try {
    const result = await withTransaction(async (trx) => {
      const { rows, orderCodes: resolvedOrderCodes } = await resolveOrdersForBatch(trx, {
        transactionCodes,
        orderCodes,
      });

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

      const defaultBank = await resolveDefaultShopBankAccount();
      const receiverAccount = String(defaultBank?.accountNumber || "").trim();

      let batchCode;
      let totalAmount;
      let baseTotal;
      let amountSuffix;

      if (orderCodes.length > 0) {
        const batchPricing = await computeBatchPaymentTotal(trx, {
          orderRows: rows,
          idOrderCol: ORDER_COLS.idOrder,
          receiverAccount,
        });
        baseTotal = batchPricing.baseTotal;
        amountSuffix = batchPricing.amountSuffix;
        totalAmount = batchPricing.totalAmount;
        batchCode = await generateUniqueMavgBatchCode(trx);
      } else {
        batchCode = await generateUniqueMavgBatchCode(trx);
        totalAmount = rows.reduce(
          (sum, row) => sum + normalizeMoney(row?.[ORDER_COLS.price]),
          0
        );
        baseTotal = totalAmount;
        amountSuffix = null;
      }

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
        orderCodes: resolvedOrderCodes,
        orderCount: rows.length,
        baseTotal,
        amountSuffix,
        totalAmount,
      };
    });

    return res.json({
      success: true,
      ...result,
      noteForTransfer: "",
    });
  } catch (error) {
    if (isMissingBatchTablesError(error)) {
      logger.warn("[payments] Create receipt batch skipped: missing batch tables");
      return res.status(503).json({
        error:
          "Tính năng gộp đơn chưa sẵn sàng trên database. Vui lòng chạy migration backend rồi thử lại.",
      });
    }
    const statusCode = Number(error?.status) || 500;
    logger.error("[payments] Create receipt batch failed", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(statusCode).json({
      error: error.message || "Không thể tạo batch gộp đơn.",
    });
  }
};

module.exports = { createPaymentReceiptBatch };
