import { daysUntilDate } from "@/shared/date";
import { roundGiaBanValue } from "@/shared/money";
import {
  ORDER_FIELDS,
  ORDER_STATUSES,
  VIRTUAL_FIELDS,
  Order,
  OrderDatasetKey,
} from "@/constants";
import {
  isGiftOrderCode,
  parseNumeric,
  resolveDateDisplay,
  resolveTotalOrderDaysForProration,
  sanitizeDateLike,
  sanitizeNumberLike,
} from "./ordersHelpers";

export function mapOrderDtoToListViewModel(
  order: Order,
  dataset: OrderDatasetKey
): Order {
  const registrationSource = sanitizeDateLike(
    order.registration_date ?? order[ORDER_FIELDS.ORDER_DATE]
  );
  const expirySource = sanitizeDateLike(
    order.expiry_date ?? order[ORDER_FIELDS.EXPIRY_DATE]
  );

  const formattedOrderDate = resolveDateDisplay(
    sanitizeDateLike(order.registration_date_display),
    registrationSource
  );
  const formattedExpiryDate = resolveDateDisplay(
    sanitizeDateLike(order.expiry_date_display),
    expirySource
  );

  const backendRemaining = parseNumeric(
    sanitizeNumberLike(order.so_ngay_con_lai)
  );
  const fallbackRemaining = daysUntilDate(expirySource || formattedExpiryDate);
  const effectiveRemaining =
    backendRemaining !== null && backendRemaining !== undefined
      ? backendRemaining
      : fallbackRemaining ?? 0;

  const rawStatus =
    (order[ORDER_FIELDS.STATUS] as string | null) ||
    ORDER_STATUSES.CHUA_THANH_TOAN;
  const trangThaiText = String(rawStatus || "").trim();

  const giaBanRaw = roundGiaBanValue(
    Number.parseFloat(String(order[ORDER_FIELDS.PRICE] ?? 0)) || 0
  );
  const giftOrder = isGiftOrderCode(order[ORDER_FIELDS.ID_ORDER]);
  const giaBan = giftOrder ? 0 : giaBanRaw;
  const giaVon = roundGiaBanValue(
    Number.parseFloat(String(order[ORDER_FIELDS.COST] ?? 0)) || 0
  );
  const soNgayDangKy = Number(order[ORDER_FIELDS.DAYS]) || 0;
  const daysForValue = Math.max(0, effectiveRemaining);
  const giaTriConLai =
    soNgayDangKy > 0
      ? Math.max(0, Math.round((giaBan * daysForValue) / soNgayDangKy))
      : 0;

  const rawRefund =
    order.can_hoan ??
    (order as Record<string, unknown>)[ORDER_FIELDS.REFUND] ??
    (order as Record<string, unknown>)["refund"];
  let canHoanValue =
    parseNumeric(rawRefund) ??
    (Number.isFinite(giaTriConLai) ? giaTriConLai : null);

  let refundFromDb: number | null = null;
  if (dataset === "canceled") {
    refundFromDb = parseNumeric((order as Record<string, unknown>)["refund"]);
    if (refundFromDb !== null) {
      canHoanValue = Math.abs(refundFromDb);
    }
  }

  const totalDaysNcc = resolveTotalOrderDaysForProration(order);
  let remainingDaysForNcc = daysForValue;
  if (
    dataset === "canceled" &&
    totalDaysNcc > 0 &&
    giaBanRaw > 0 &&
    remainingDaysForNcc === 0 &&
    refundFromDb !== null &&
    refundFromDb > 0
  ) {
    remainingDaysForNcc = Math.min(
      totalDaysNcc,
      Math.max(0, Math.round((refundFromDb * totalDaysNcc) / giaBanRaw))
    );
  }

  const hoanTuNcc =
    totalDaysNcc > 0
      ? Math.round((giaVon * remainingDaysForNcc) / totalDaysNcc)
      : 0;

  return {
    ...order,
    [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: effectiveRemaining,
    [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: giaTriConLai,
    [VIRTUAL_FIELDS.HOAN_TU_NCC]: hoanTuNcc,
    [VIRTUAL_FIELDS.TRANG_THAI_TEXT]: trangThaiText,
    [VIRTUAL_FIELDS.ORDER_DATE_DISPLAY]: formattedOrderDate,
    [VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY]: formattedExpiryDate,
    can_hoan: canHoanValue,
  } as Order;
}

export const buildOrderListViewModels = (
  orders: Order[],
  dataset: OrderDatasetKey
): Order[] => orders.map((order) => mapOrderDtoToListViewModel(order, dataset));

