const {
  findLatestPendingSlotByOrder,
  findPendingSlotByAmount,
  fetchNextSuffix,
} = require("@/domains/payment-slots/repositories/paymentSlotRepository");
const { MAX_SUFFIX_ATTEMPTS, SUFFIX_MAX } = require("@/domains/payment-slots/constants");
const { createHttpError, normalizeMoney } = require("@/domains/payments/controller/shared/helpers");
const { TABLES, PAYMENT_RECEIPT_BATCH_COLS } = require("@/domains/payments/controller/shared/constants");

const resolveOrderBaseAmount = async (trx, orderRow, idOrderCol) => {
  const orderCode = String(orderRow?.[idOrderCol] || "").trim().toUpperCase();
  if (!orderCode) {
    throw createHttpError(400, "Thiếu mã đơn khi tính batch.");
  }

  const slot = await findLatestPendingSlotByOrder(trx, orderCode);
  if (!slot) {
    throw createHttpError(
      409,
      `Đơn ${orderCode} chưa có payment slot pending — không thể gộp batch.`
    );
  }

  const baseAmount = normalizeMoney(slot.base_amount);
  if (!(baseAmount > 0)) {
    throw createHttpError(
      409,
      `Đơn ${orderCode} có base_amount không hợp lệ trên slot pending.`
    );
  }

  return {
    orderCode,
    baseAmount,
    amountSuffix: Number(slot.amount_suffix) || 0,
    expectedAmount: normalizeMoney(slot.expected_amount),
  };
};

const hasPendingBatchWithTotal = async (trx, totalAmount) => {
  const row = await trx(TABLES.paymentReceiptBatch)
    .select(PAYMENT_RECEIPT_BATCH_COLS.ID)
    .where(PAYMENT_RECEIPT_BATCH_COLS.TOTAL_AMOUNT, totalAmount)
    .where(PAYMENT_RECEIPT_BATCH_COLS.STATUS, "pending")
    .first();
  return Boolean(row);
};

/**
 * Tổng CK batch = sum(base_amount các đơn) + suffix kế tiếp (cùng sequence đơn lẻ).
 * MAVG chỉ đối chiếu nội bộ — không ghi nội dung CK.
 */
const computeBatchPaymentTotal = async (trx, { orderRows, idOrderCol, receiverAccount }) => {
  const receiver = String(receiverAccount || "").replace(/\s+/g, "").trim();
  if (!receiver) {
    throw createHttpError(400, "Chưa cấu hình STK shop mặc định — không thể gộp batch.");
  }

  const lineItems = [];
  for (const row of orderRows) {
    lineItems.push(await resolveOrderBaseAmount(trx, row, idOrderCol));
  }

  const baseTotal = lineItems.reduce((sum, item) => sum + item.baseAmount, 0);
  if (!(baseTotal > 0)) {
    throw createHttpError(400, "Tổng base_amount batch phải lớn hơn 0.");
  }

  for (let attempt = 0; attempt < MAX_SUFFIX_ATTEMPTS; attempt += 1) {
    const amountSuffix = await fetchNextSuffix(trx);
    if (!(amountSuffix >= 1 && amountSuffix <= SUFFIX_MAX)) {
      throw createHttpError(
        503,
        `Suffix batch ngoài range 1..${SUFFIX_MAX}. Kiểm tra sequence payment_amount_suffix_seq.`
      );
    }

    const totalAmount = baseTotal + amountSuffix;

    const slotCollision = await findPendingSlotByAmount(trx, {
      receiverAccount: receiver,
      expectedAmount: totalAmount,
    });
    if (slotCollision) continue;

    const batchCollision = await hasPendingBatchWithTotal(trx, totalAmount);
    if (batchCollision) continue;

    return {
      baseTotal,
      amountSuffix,
      totalAmount,
      lineItems,
    };
  }

  throw createHttpError(
    503,
    `Không cấp được suffix batch duy nhất sau ${MAX_SUFFIX_ATTEMPTS} lần thử.`
  );
};

module.exports = {
  computeBatchPaymentTotal,
  resolveOrderBaseAmount,
};
