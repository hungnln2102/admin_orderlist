const eventBus = require("../eventBus");
const EVENTS = require("../eventTypes");
const { recordEvent } = require("../eventStoreService");

/**
 * Đăng ký Event Subscribers cho toàn bộ nghiệp vụ Kho & Quản lý Key/Slot
 */
function registerWarehouseEventSubscribers() {
  // 1. WAREHOUSE_STOCK_CREATED
  eventBus.on(EVENTS.WAREHOUSE_STOCK_CREATED, async (data) => {
    console.log(`📦 [EventBus] Tiếp nhận WAREHOUSE_STOCK_CREATED (Account #${data.id}):`, data.account);
    await recordEvent({
      eventName: EVENTS.WAREHOUSE_STOCK_CREATED,
      aggregateType: "WAREHOUSE_STOCK",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 2. WAREHOUSE_STOCK_UPDATED
  eventBus.on(EVENTS.WAREHOUSE_STOCK_UPDATED, async (data) => {
    console.log(`📦 [EventBus] Tiếp nhận WAREHOUSE_STOCK_UPDATED (Slot #${data.slotId}, Account #${data.accountId})`);
    await recordEvent({
      eventName: EVENTS.WAREHOUSE_STOCK_UPDATED,
      aggregateType: "WAREHOUSE_STOCK",
      aggregateId: data.slotId || data.accountId,
      payload: data,
    });
  });

  // 3. WAREHOUSE_STOCK_DELETED
  eventBus.on(EVENTS.WAREHOUSE_STOCK_DELETED, async (data) => {
    console.log(`📦 [EventBus] Tiếp nhận WAREHOUSE_STOCK_DELETED (Account #${data.id})`);
    await recordEvent({
      eventName: EVENTS.WAREHOUSE_STOCK_DELETED,
      aggregateType: "WAREHOUSE_STOCK",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 4. WAREHOUSE_CATALOG_CREATED
  eventBus.on(EVENTS.WAREHOUSE_CATALOG_CREATED, async (data) => {
    console.log(`📦 [EventBus] Tiếp nhận WAREHOUSE_CATALOG_CREATED:`, data.name);
    await recordEvent({
      eventName: EVENTS.WAREHOUSE_CATALOG_CREATED,
      aggregateType: "WAREHOUSE_CATALOG",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 5. WAREHOUSE_CATALOG_DELETED
  eventBus.on(EVENTS.WAREHOUSE_CATALOG_DELETED, async (data) => {
    console.log(`📦 [EventBus] Tiếp nhận WAREHOUSE_CATALOG_DELETED:`, data.name);
    await recordEvent({
      eventName: EVENTS.WAREHOUSE_CATALOG_DELETED,
      aggregateType: "WAREHOUSE_CATALOG",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 6. WAREHOUSE_ACCOUNT_BROWSER_OPENED
  eventBus.on(EVENTS.WAREHOUSE_ACCOUNT_BROWSER_OPENED, async (data) => {
    console.log(`🌐 [EventBus] Tiếp nhận WAREHOUSE_ACCOUNT_BROWSER_OPENED (Account #${data.accountId}):`, data.targetUrl);
    await recordEvent({
      eventName: EVENTS.WAREHOUSE_ACCOUNT_BROWSER_OPENED,
      aggregateType: "WAREHOUSE_BROWSER",
      aggregateId: data.accountId,
      payload: data,
    });
  });

  console.log("✅ [EventBus] Đăng ký thành công Warehouse Event Subscribers");
}

module.exports = {
  registerWarehouseEventSubscribers,
};
