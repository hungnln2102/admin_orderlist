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

  // 7. Lắng nghe event PACKAGE_CATEGORY_CREATED
  eventBus.on(EVENTS.PACKAGE_CATEGORY_CREATED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận PACKAGE_CATEGORY_CREATED:`, data.name);
    await recordEvent({
      eventName: EVENTS.PACKAGE_CATEGORY_CREATED,
      aggregateType: "PACKAGE_CATEGORY",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 8. Lắng nghe event PACKAGE_CATEGORY_UPDATED
  eventBus.on(EVENTS.PACKAGE_CATEGORY_UPDATED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận PACKAGE_CATEGORY_UPDATED:`, data.name);
    await recordEvent({
      eventName: EVENTS.PACKAGE_CATEGORY_UPDATED,
      aggregateType: "PACKAGE_CATEGORY",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 9. Lắng nghe event PACKAGE_CATEGORY_DELETED
  eventBus.on(EVENTS.PACKAGE_CATEGORY_DELETED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận PACKAGE_CATEGORY_DELETED:`, data.name);
    await recordEvent({
      eventName: EVENTS.PACKAGE_CATEGORY_DELETED,
      aggregateType: "PACKAGE_CATEGORY",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 10. Lắng nghe event PACKAGE_PRODUCT_CREATED
  eventBus.on(EVENTS.PACKAGE_PRODUCT_CREATED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận PACKAGE_PRODUCT_CREATED (Package #${data.id}):`, data.name || data.accountInfo);
    await recordEvent({
      eventName: EVENTS.PACKAGE_PRODUCT_CREATED,
      aggregateType: "PACKAGE_PRODUCT",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 11. Lắng nghe event PACKAGE_PRODUCT_UPDATED
  eventBus.on(EVENTS.PACKAGE_PRODUCT_UPDATED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận PACKAGE_PRODUCT_UPDATED (Package #${data.id}):`, data.name || data.accountInfo);
    await recordEvent({
      eventName: EVENTS.PACKAGE_PRODUCT_UPDATED,
      aggregateType: "PACKAGE_PRODUCT",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 12. Lắng nghe event PACKAGE_PRODUCT_DELETED
  eventBus.on(EVENTS.PACKAGE_PRODUCT_DELETED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận PACKAGE_PRODUCT_DELETED (Package #${data.id})`);
    await recordEvent({
      eventName: EVENTS.PACKAGE_PRODUCT_DELETED,
      aggregateType: "PACKAGE_PRODUCT",
      aggregateId: data.id,
      payload: data,
    });
  });

  console.log("✅ [EventBus] Đăng ký thành công Product & Package Event Subscribers");
}

module.exports = {
  registerProductEventSubscribers,
};

