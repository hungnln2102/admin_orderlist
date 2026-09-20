const eventBus = require("../eventBus");
const EVENTS = require("../eventTypes");
const { recordEvent } = require("../eventStoreService");

function registerSupplierEventSubscribers() {
  // 1. Lắng nghe SUPPLIER_CREATED
  eventBus.on(EVENTS.SUPPLIER_CREATED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận SUPPLIER_CREATED (Supplier #${data.id}):`, data.supplier_name);
    await recordEvent({
      eventName: EVENTS.SUPPLIER_CREATED,
      aggregateType: "SUPPLIER",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 2. Lắng nghe SUPPLIER_UPDATED
  eventBus.on(EVENTS.SUPPLIER_UPDATED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận SUPPLIER_UPDATED (Supplier #${data.id}):`, data.supplier_name);
    await recordEvent({
      eventName: EVENTS.SUPPLIER_UPDATED,
      aggregateType: "SUPPLIER",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 3. Lắng nghe SUPPLIER_DELETED
  eventBus.on(EVENTS.SUPPLIER_DELETED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận SUPPLIER_DELETED (Supplier #${data.id}):`, data.supplier_name);
    await recordEvent({
      eventName: EVENTS.SUPPLIER_DELETED,
      aggregateType: "SUPPLIER",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 4. Lắng nghe SUPPLIER_STATUS_TOGGLED
  eventBus.on(EVENTS.SUPPLIER_STATUS_TOGGLED, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận SUPPLIER_STATUS_TOGGLED (Supplier #${data.id}):`, data.supplier_name, "-> Active:", data.new_status);
    await recordEvent({
      eventName: EVENTS.SUPPLIER_STATUS_TOGGLED,
      aggregateType: "SUPPLIER",
      aggregateId: data.id,
      payload: data,
    });
  });

  // 5. Lắng nghe SUPPLIER_DEBT_PAID
  eventBus.on(EVENTS.SUPPLIER_DEBT_PAID, async (data) => {
    console.log(`📌 [EventBus] Tiếp nhận SUPPLIER_DEBT_PAID (Supplier #${data.id}):`, data.supplier_name);
    await recordEvent({
      eventName: EVENTS.SUPPLIER_DEBT_PAID,
      aggregateType: "SUPPLIER",
      aggregateId: data.id,
      payload: data,
    });
  });

  console.log("✅ [EventBus] Đăng ký thành công Supplier Event Subscribers (CREATED, UPDATED, DELETED, STATUS_TOGGLED, DEBT_PAID)");
}

module.exports = {
  registerSupplierEventSubscribers,
};
