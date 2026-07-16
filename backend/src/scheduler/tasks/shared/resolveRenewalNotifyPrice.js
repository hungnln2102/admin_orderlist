/**
 * Giá hiển thị Telegram gia hạn (4 ngày): ưu tiên payment slot pending
 * (base + suffix). Không dùng giá recompute tròn nghìn nếu slot đã mở.
 */

const logger = require("../../../utils/logger");
const {
  findLatestPendingSlotByOrder,
} = require("../../../domains/payment-slots/repositories/paymentSlotRepository");
const { hasPaymentSuffix } = require("../../../domains/payment-slots/helpers/paymentSuffix");
const { resolveDefaultShopBankAccount } = require("../../../services/shopBankAccountResolver");
const { openSingleRenewalSlot } = require("./openRenewalSlots");

/**
 * @param {import('pg').PoolClient} client
 * @param {object} row - row từ buildRenewalQuery
 * @param {{ price: number, cost?: number }} computed - từ computeOrderCurrentPrice
 * @returns {Promise<number>}
 */
async function resolveRenewalNotifyPrice(client, row, computed) {
  const orderCode = String(row?.id_order || row?.idOrder || "").trim();
  const basePrice = Number(computed?.price) || 0;
  const storedPrice = Number(row?.price) || 0;

  if (orderCode) {
    const slot = await findLatestPendingSlotByOrder(client, orderCode);
    const expected = Number(slot?.expected_amount);
    if (Number.isFinite(expected) && expected > 0) {
      const suffix = Number(slot?.amount_suffix) || 0;
      const expectedNew = basePrice + suffix;
      if (expectedNew !== expected && basePrice > 0) {
        await client.query(
          `UPDATE orders.order_payment_slots
           SET expected_amount = $1, base_amount = $2
           WHERE id = $3`,
          [expectedNew, basePrice, slot.id]
        );
        await client.query(
          `UPDATE orders.order_list
           SET price = $1
           WHERE id_order = $2`,
          [expectedNew, orderCode]
        );
        logger.info(`[CRON][Renewal] Updated stale renewal slot price for order ${orderCode}: ${expected} -> ${expectedNew} (base ${basePrice} + suffix ${suffix})`);
        return expectedNew;
      }
      return expected;
    }
  }

  if (hasPaymentSuffix(storedPrice, basePrice)) {
    return storedPrice;
  }

  if (storedPrice > 0 && basePrice <= 0) {
    return storedPrice;
  }

  if (orderCode && basePrice > 0) {
    try {
      const bank = await resolveDefaultShopBankAccount();
      const receiverAccount = String(bank?.accountNumber || "").trim();
      if (receiverAccount) {
        const opened = await openSingleRenewalSlot(
          client,
          {
            ...row,
            id_order: orderCode,
            supply_id: row.supply_id ?? row.id_supply,
          },
          receiverAccount
        );
        if (opened.ok && Number(opened.expectedAmount) > 0) {
          return Number(opened.expectedAmount);
        }
        logger.warn("[CRON] notifyFourDays: không mở được renewal slot", {
          orderCode,
          reason: opened.reason,
        });
      } else {
        logger.warn(
          "[CRON] notifyFourDays: chưa có STK shop mặc định — giữ giá base không suffix",
          { orderCode, basePrice }
        );
      }
    } catch (err) {
      logger.warn("[CRON] notifyFourDays: lỗi mở renewal slot", {
        orderCode,
        error: err.message,
      });
    }
  }

  return basePrice > 0 ? basePrice : storedPrice;
}

module.exports = {
  resolveRenewalNotifyPrice,
};
