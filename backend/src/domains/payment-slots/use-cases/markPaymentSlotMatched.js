/**
 * Đánh dấu slot đã match webhook receipt — gọi trong webhook sau khi
 * payment_receipt được INSERT (hoặc dedupe) thành công.
 */

const repo = require("../repositories/paymentSlotRepository");
const logger = require("../../../utils/logger");

/**
 * @param {import('pg').PoolClient | import('knex').Knex.Transaction} executor
 * @param {object} params
 * @param {number|string} params.slotId
 * @param {number|string|null} [params.paymentReceiptId]
 * @returns {Promise<object|null>} slot row sau khi update, null nếu slot đã không còn pending
 */
async function markPaymentSlotMatched(executor, params) {
  const slotId = Number(params?.slotId);
  if (!Number.isFinite(slotId) || slotId <= 0) {
    throw new Error("markPaymentSlotMatched: slotId is required");
  }
  const paymentReceiptId =
    params?.paymentReceiptId == null ? null : Number(params.paymentReceiptId);

  const updated = await repo.markSlotMatched(executor, {
    slotId,
    paymentReceiptId,
  });

  if (!updated) {
    logger.warn("[PaymentSlot] markPaymentSlotMatched: slot không còn pending", {
      slotId,
      paymentReceiptId,
    });
    return null;
  }

  logger.info("[PaymentSlot] matched", {
    slotId: updated.id,
    orderCode: updated.id_order,
    cycleIndex: updated.cycle_index,
    paymentReceiptId,
  });

  return updated;
}

module.exports = { markPaymentSlotMatched };
