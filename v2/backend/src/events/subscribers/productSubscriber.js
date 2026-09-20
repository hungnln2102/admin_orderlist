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

  // 4. Lắng nghe event SUPPLIER_COST_ADDED
  eventBus.on(EVENTS.SUPPLIER_COST_ADDED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận SUPPLIER_COST_ADDED (SupplierCost #${data.id}):`, data.summary);
    await recordEvent({
      eventName: EVENTS.SUPPLIER_COST_ADDED,
      aggregateType: "SUPPLIER_COST",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 5. Lắng nghe event SUPPLIER_COST_UPDATED
  eventBus.on(EVENTS.SUPPLIER_COST_UPDATED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận SUPPLIER_COST_UPDATED (SupplierCost #${data.id}):`, data.summary);
    await recordEvent({
      eventName: EVENTS.SUPPLIER_COST_UPDATED,
      aggregateType: "SUPPLIER_COST",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 6. Lắng nghe event SUPPLIER_COST_DELETED
  eventBus.on(EVENTS.SUPPLIER_COST_DELETED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận SUPPLIER_COST_DELETED (SupplierCost #${data.id}):`, data.summary);
    await recordEvent({
      eventName: EVENTS.SUPPLIER_COST_DELETED,
      aggregateType: "SUPPLIER_COST",
      aggregateId: data.id,
      payload: data,
    });
  });

  console.log("✅ [EventBus] Đăng ký thành công Product & Supplier Cost Event Subscribers");
}

module.exports = {
  registerProductEventSubscribers,
};

