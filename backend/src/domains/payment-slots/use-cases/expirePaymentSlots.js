/**
 * Cron: đẩy slot pending lâu quá ngưỡng sang 'expired' để giải phóng suffix.
 * Chạy hàng giờ; mặc định dọn pending > 30 ngày.
 */

const repo = require("../repositories/paymentSlotRepository");
const logger = require("../../../utils/logger");

/**
 * @param {import('pg').Pool|import('pg').PoolClient} executor
 * @param {string} [olderThanInterval] - Postgres interval string, mặc định '30 days'
 * @returns {Promise<{expired: number}>}
 */
async function expirePaymentSlots(executor, olderThanInterval) {
  const interval = String(olderThanInterval || "30 days");
  const expired = await repo.expireStaleSlots(executor, {
    olderThanInterval: interval,
  });
  if (expired > 0) {
    logger.info("[PaymentSlot] expired stale slots", {
      expired,
      olderThanInterval: interval,
    });
  }
  return { expired };
}

module.exports = { expirePaymentSlots };
