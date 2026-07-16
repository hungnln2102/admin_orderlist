const { db } = require("../../db");
const logger = require("../../utils/logger");
const { TABLES } = require("../../domains/orders/controller/constants");
const { ORDERS_SCHEMA } = require("../../config/dbSchema");
const { calculateOrderPricing } = require("./orderPricingService");
const { SLOTS_TABLE, SLOT_COLS, SLOT_STATUS } = require("../../domains/payment-slots/constants");

/**
 * Đồng bộ lại giá của toàn bộ các đơn hàng RENEWAL (Cần Gia Hạn) của variant được chỉ định.
 * Được gọi khi bảng giá (variantMargin) thay đổi.
 * @param {number} variantId
 * @param {import('knex').Knex | import('knex').Knex.Transaction} [trxOrDb]
 */
async function syncRenewalOrdersPriceForVariant(variantId, trxOrDb = db) {
  const idProductCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT;
  const statusCol = ORDERS_SCHEMA.ORDER_LIST.COLS.STATUS;
  const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;
  const priceCol = ORDERS_SCHEMA.ORDER_LIST.COLS.PRICE;
  const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;

  try {
    // 1. Tìm tất cả đơn hàng RENEWAL có variant_id này
    const renewalOrders = await trxOrDb(TABLES.orderList)
      .where(idProductCol, variantId)
      .where(statusCol, 'Cần Gia Hạn');

    if (renewalOrders.length === 0) {
      return;
    }

    logger.info(`[Pricing][Sync] Bắt đầu đồng bộ giá gia hạn cho ${renewalOrders.length} đơn của variant ${variantId}`);

    for (const order of renewalOrders) {
      const orderCode = order[idOrderCol];

      // 2. Tính toán giá mới dựa trên bảng giá hiện hành
      const pricingResult = await calculateOrderPricing({
        supplyId: order[supplyIdCol],
        productKey: String(variantId),
        orderId: orderCode,
      });

      const newBasePrice = Number(pricingResult.price) || 0;
      if (newBasePrice <= 0) {
        continue;
      }

      // 3. Tìm slot pending của đơn này
      const pendingSlot = await trxOrDb(SLOTS_TABLE)
        .where(SLOT_COLS.ID_ORDER, orderCode)
        .where(SLOT_COLS.STATUS, SLOT_STATUS.PENDING)
        .orderBy(SLOT_COLS.CYCLE_INDEX, 'desc')
        .first();

      if (pendingSlot) {
        const suffix = Number(pendingSlot[SLOT_COLS.AMOUNT_SUFFIX]) || 0;
        const expectedNew = newBasePrice + suffix;

        // Cập nhật expected_amount và base_amount của slot
        await trxOrDb(SLOTS_TABLE)
          .where(SLOT_COLS.ID, pendingSlot[SLOT_COLS.ID])
          .update({
            [SLOT_COLS.BASE_AMOUNT]: newBasePrice,
            [SLOT_COLS.EXPECTED_AMOUNT]: expectedNew,
          });

        // Cập nhật price trong order_list
        await trxOrDb(TABLES.orderList)
          .where(idOrderCol, orderCode)
          .update({
            [priceCol]: expectedNew,
          });

        logger.info(`[Pricing][Sync] Đơn ${orderCode}: Cập nhật giá gia hạn ${order[priceCol]} -> ${expectedNew} (base ${newBasePrice} + suffix ${suffix})`);
      }
    }
  } catch (err) {
    logger.error(`[Pricing][Sync] Lỗi khi đồng bộ giá cho variant ${variantId}`, {
      error: err.message,
      stack: err.stack,
    });
  }
}

module.exports = {
  syncRenewalOrdersPriceForVariant,
};
