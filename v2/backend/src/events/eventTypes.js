/**
 * eventTypes.js (V2)
 * Danh sách tập trung các tên Sự kiện (Domain Events) trong hệ thống
 */
module.exports = {
  // Order Domain Events
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_UPDATED: "ORDER_UPDATED",
  ORDER_DELETED: "ORDER_DELETED",
  ORDER_PAID: "ORDER_PAID",
  ORDER_RENEWED: "ORDER_RENEWED",

  // Product & Pricing Domain Events
  PRODUCT_CREATED: "PRODUCT_CREATED",
  PRODUCT_UPDATED: "PRODUCT_UPDATED",
  PRODUCT_DELETED: "PRODUCT_DELETED",
};
