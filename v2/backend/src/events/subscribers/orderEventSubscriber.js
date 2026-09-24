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

  // Lắng nghe sự kiện Xóa đơn hàng (Hard Delete)
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

  // Lắng nghe sự kiện Thanh toán đơn hàng thành công (Webhook khớp)
  eventBus.on(EVENTS.ORDER_PAID, async (data) => {
    console.log(`💰 [EventSubscriber] Tiếp nhận event ORDER_PAID cho đơn #${data.orderId} (${data.id_order})`);
    await recordEvent({
      eventName: EVENTS.ORDER_PAID,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.id_order,
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Gia hạn hoàn tất (Webhook khớp gia hạn)
  eventBus.on(EVENTS.ORDER_RENEWED, async (data) => {
    console.log(`🔄 [EventSubscriber] Tiếp nhận event ORDER_RENEWED cho đơn #${data.orderId} (${data.id_order})`);
    await recordEvent({
      eventName: EVENTS.ORDER_RENEWED,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.id_order,
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Hủy đơn Đã Thanh Toán → Chờ Hoàn Tiền
  eventBus.on(EVENTS.ORDER_PENDING_REFUND, async (data) => {
    console.log(`⏳ [EventSubscriber] Tiếp nhận event ORDER_PENDING_REFUND cho đơn #${data.orderId} (${data.orderCode})`);
    await recordEvent({
      eventName: EVENTS.ORDER_PENDING_REFUND,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.orderCode,
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Ngừng gia hạn → Hết Hạn
  eventBus.on(EVENTS.ORDER_EXPIRED, async (data) => {
    console.log(`📅 [EventSubscriber] Tiếp nhận event ORDER_EXPIRED cho đơn #${data.orderId} (${data.orderCode})`);
    await recordEvent({
      eventName: EVENTS.ORDER_EXPIRED,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.orderCode,
      payload: data,
      status: "PROCESSED",
    });
  });

  console.log("✅ [EventBus] Đăng ký thành công Order Event Subscribers (CREATED, UPDATED, DELETED, PAID, RENEWED, PENDING_REFUND, EXPIRED)");
}

module.exports = { registerOrderEventSubscribers };

