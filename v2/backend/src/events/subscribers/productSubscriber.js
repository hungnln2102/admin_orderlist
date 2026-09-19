const eventBus = require("../eventBus");
const EVENTS = require("../eventTypes");
const { recordEvent } = require("../eventStoreService");

function registerProductEventSubscribers() {
  // 1. Lắng nghe event PRODUCT_CREATED
  eventBus.on(EVENTS.PRODUCT_CREATED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận PRODUCT_CREATED (Product #${data.id || data.productId}):`, data.san_pham);
    await recordEvent({
      eventName: EVENTS.PRODUCT_CREATED,
      aggregateType: "PRODUCT",
      aggregateId: data.id || data.productId,
      payload: data,
    });
  });

  // 2. Lắng nghe event PRODUCT_UPDATED
  eventBus.on(EVENTS.PRODUCT_UPDATED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận PRODUCT_UPDATED (Product #${data.id || data.productId}):`, data.san_pham);
    await recordEvent({
      eventName: EVENTS.PRODUCT_UPDATED,
      aggregateType: "PRODUCT",
      aggregateId: data.id || data.productId,
      payload: data,
    });
  });

  // 3. Lắng nghe event PRODUCT_DELETED
  eventBus.on(EVENTS.PRODUCT_DELETED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận PRODUCT_DELETED (Product #${data.id || data.productId}):`, data.san_pham);
    await recordEvent({
      eventName: EVENTS.PRODUCT_DELETED,
      aggregateType: "PRODUCT",
      aggregateId: data.id || data.productId,
      payload: data,
    });
  });

  console.log("✅ [EventBus] Đăng ký thành công Product Event Subscribers (CREATED, UPDATED, DELETED)");
}

module.exports = {
  registerProductEventSubscribers,
};
