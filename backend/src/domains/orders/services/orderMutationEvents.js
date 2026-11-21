const { publishEventInTrx, EVENTS } = require("@/events");

async function emitOrderEvent(trx, eventName, payload) {
  const aggregateId = payload.orderId || payload.order_id || payload.id || payload.id_order || "";
  const aggregateType = eventName.startsWith("WAREHOUSE_")
    ? "WAREHOUSE"
    : eventName.startsWith("SUPPLIER_")
      ? "SUPPLIER"
      : "ORDER";

  return publishEventInTrx(trx, {
    eventName,
    aggregateType,
    aggregateId,
    action: payload.action || eventName,
    beforeState: payload.old_values || payload.beforeState || null,
    afterState: payload.new_values || payload.afterState || (eventName === EVENTS.ORDER_CREATED ? payload : null),
    changedFields: payload.changes || payload.changed_fields || {},
    source: "ORDER_SERVICE",
    payload,
  });
}

const isCustomerMavryk = (c) => String(c || "").trim().toLowerCase() === "mavryk";

module.exports = { emitOrderEvent, isCustomerMavryk };
