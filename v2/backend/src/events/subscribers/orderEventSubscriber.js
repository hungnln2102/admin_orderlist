const eventBus = require("../eventBus");
const EVENTS = require("../eventTypes");
const { recordEvent } = require("../eventStoreService");

function registerOrderEventSubscribers() {
  // Lắng nghe sự kiện Tạo đơn hàng
  eventBus.on(EVENTS.ORDER_CREATED, async (data) => {
    console.log(`📌 [EventSubscriber] Tiếp nhận event ORDER_CREATED cho đơn #${data.orderId}`);
    await recordEvent({
      eventName: EVENTS.ORDER_CREATED,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.id_order,
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Sửa đơn hàng
  eventBus.on(EVENTS.ORDER_UPDATED, async (data) => {
    console.log(`📌 [EventSubscriber] Tiếp nhận event ORDER_UPDATED cho đơn #${data.orderId}`);
    await recordEvent({
      eventName: EVENTS.ORDER_UPDATED,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.id_order,
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Xóa đơn hàng
  eventBus.on(EVENTS.ORDER_DELETED, async (data) => {
    console.log(`📌 [EventSubscriber] Tiếp nhận event ORDER_DELETED cho đơn #${data.orderId}`);
    await recordEvent({
      eventName: EVENTS.ORDER_DELETED,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.id_order,
      payload: data,
      status: "PROCESSED",
    });
  });
  console.log("✅ [EventBus] Đăng ký thành công Order Event Subscribers (CREATED, UPDATED, DELETED)");
}

module.exports = { registerOrderEventSubscribers };
