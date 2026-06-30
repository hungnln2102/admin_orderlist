import { isRegisteredToday } from "@/shared/date";
import { ORDER_FIELDS, ORDER_STATUSES, VIRTUAL_FIELDS, Order, OrderDatasetKey } from "@/constants";
import { BASE_REFUND_STATS, BASE_STOCK_STATS, type BaseStat } from "../constants";
import { sanitizeDateLike } from "./ordersHelpers";

/** Tính thống kê từ danh sách đơn đã có trường ảo (dùng toàn bộ orders, không phải filtered). */
export function computeOrderStats(
  ordersWithVirtual: Order[],
  dataset: OrderDatasetKey
): {
  updatedStats: BaseStat[];
  totalRecords: number;
} {
  const totalOrders = ordersWithVirtual.length;

  if (dataset === "canceled") {
    const refundedOrders = ordersWithVirtual.filter((order) => {
      const status = String(order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "").trim();
      return status === ORDER_STATUSES.DA_HOAN;
    }).length;
    const pendingRefundOrders = ordersWithVirtual.filter((order) => {
      const status = String(order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "").trim();
      return status === ORDER_STATUSES.CHO_HOAN;
    }).length;
    const convertedCreditOrders = ordersWithVirtual.filter((order) => {
      const status = String(order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "").trim();
      return status === ORDER_STATUSES.CHUYEN_DOI_CREDIT;
    }).length;

    const updatedStats = [
      { ...BASE_REFUND_STATS[0], value: String(totalOrders) },
      { ...BASE_REFUND_STATS[1], value: String(refundedOrders) },
      { ...BASE_REFUND_STATS[2], value: String(pendingRefundOrders) },
      { ...BASE_REFUND_STATS[3], value: String(convertedCreditOrders) },
    ];

    return { updatedStats, totalRecords: totalOrders };
  }

  const needsRenewal = ordersWithVirtual.filter((order) => {
    const remaining = Number(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);
    return Number.isFinite(remaining) && remaining > 0 && remaining <= 4;
  }).length;
  const processingOrders = ordersWithVirtual.filter((order) => {
    const status = String(order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "").trim();
    return status === ORDER_STATUSES.DANG_XU_LY;
  }).length;

  const registeredTodayCount = ordersWithVirtual.filter((order) => {
    const registrationSource = sanitizeDateLike(
      order.registration_date ||
        order.registration_date_display ||
        order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] ||
        order[ORDER_FIELDS.ORDER_DATE]
    );
    return isRegisteredToday(registrationSource);
  }).length;

  const updatedStats = [
    { ...BASE_STOCK_STATS[0], value: String(totalOrders) },
    { ...BASE_STOCK_STATS[1], value: String(needsRenewal) },
    { ...BASE_STOCK_STATS[2], value: String(processingOrders) },
    { ...BASE_STOCK_STATS[3], value: String(registeredTodayCount) },
  ];

  return { updatedStats, totalRecords: totalOrders };
}
