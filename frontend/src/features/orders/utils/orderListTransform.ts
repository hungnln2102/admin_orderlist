import { daysUntilDate, isRegisteredToday } from "@/shared/date";
import { roundGiaBanValue } from "@/shared/money";
import {
  ORDER_FIELDS,
  ORDER_STATUSES,
  VIRTUAL_FIELDS,
  Order,
  OrderDatasetKey,
} from "@/constants";
import { getStatusPriority } from "../status";
import {
  isGiftOrderCode,
  normalizeOrderCode,
  normalizeSearchText,
  parseCanceledAtToMs,
  parseExpiryTime,
  parseNumeric,
  resolveDateDisplay,
  resolveTotalOrderDaysForProration,
  sanitizeDateLike,
  sanitizeNumberLike,
} from "./ordersHelpers";

export type { OrderFinancialStats } from "./orderFinancialStats";
export { computeOrderFinancialStats } from "./orderFinancialStats";

/** Gắn các trường ảo (số ngày còn lại, giá trị còn lại, trạng thái, ngày hiển thị) vào từng đơn. */
export function enrichOrdersWithVirtualFields(
  orders: Order[],
  dataset: OrderDatasetKey
): Order[] {
  return orders.map((order) => {
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
    const fallbackRemaining = daysUntilDate(
      expirySource || formattedExpiryDate
    );
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
    /** Quà tặng: không có giá bán với khách — giá trị còn lại theo doanh thu = 0 (vẫn giữ giá gốc trong DB cho suy luận hoàn tiền). */
    const giaBan = giftOrder ? 0 : giaBanRaw;
    const giaVon = roundGiaBanValue(
      Number.parseFloat(String(order[ORDER_FIELDS.COST] ?? 0)) || 0
    );
    const soNgayDangKy = Number(order[ORDER_FIELDS.DAYS]) || 0;
    const daysForValue = Math.max(0, effectiveRemaining);
    /** Giá trị còn lại theo doanh thu = giá bán × (ngày còn lại) ÷ tổng ngày (trùng calcRemainingRefund phía server). */
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
        // Cột `refund` khi hủy đơn lưu theo giá vốn/NCC (calcRemainingImport), không dùng để hiển thị "giá trị còn lại" theo giá bán.
        canHoanValue = Math.abs(refundFromDb);
      }
    }

    /** Hoàn từ NCC = giá nhập × (ngày còn lại) ÷ tổng ngày gói (days hoặc tháng trong slot × 30). */
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
  });
}

export type FilterSortParams = {
  searchTerm: string;
  searchField: string;
  statusFilter: string;
  dataset: OrderDatasetKey;
};

const isUnpaidStatus = (statusText: string) =>
  statusText === ORDER_STATUSES.CHUA_THANH_TOAN ||
  statusText === ORDER_STATUSES.CHO_HOAN;

/** Lọc theo tìm kiếm + trạng thái, rồi sắp xếp. Trả về bản sao đã sắp xếp, không đột biến mảng gốc. */
export function filterAndSortOrders(
  ordersWithVirtual: Order[],
  params: FilterSortParams
): Order[] {
  const {
    searchTerm,
    searchField,
    statusFilter,
    dataset,
  } = params;

  const normalizedSearchTerm = normalizeSearchText(searchTerm);
  const normalizedOrderSearchTerm = normalizeOrderCode(searchTerm);
  const searchableFields =
    searchField === "all"
      ? [
          ORDER_FIELDS.CUSTOMER,
          ORDER_FIELDS.ID_ORDER,
          ORDER_FIELDS.ID_PRODUCT,
          ORDER_FIELDS.INFORMATION_ORDER,
          ORDER_FIELDS.SLOT,
          ORDER_FIELDS.SUPPLY,
          ORDER_FIELDS.CONTACT,
        ]
      : [searchField];
  const statusFilterValue =
    statusFilter === "all" ? "" : String(statusFilter || "").trim();

  const filtered = ordersWithVirtual.filter((order) => {
    const matchesSearch =
      !normalizedSearchTerm ||
      searchableFields.some((field) => {
        const rawValue = (order as Record<string, unknown>)[field];
        const normalizedFieldValue = normalizeSearchText(rawValue);
        if (!normalizedFieldValue) return false;

        if (field === ORDER_FIELDS.ID_ORDER) {
          const normalizedOrderValue = normalizeOrderCode(rawValue);
          return (
            (!!normalizedOrderSearchTerm &&
              normalizedOrderValue.includes(normalizedOrderSearchTerm)) ||
            normalizedFieldValue.includes(normalizedSearchTerm)
          );
        }

        return normalizedFieldValue.includes(normalizedSearchTerm);
      });

    const orderCodeFallbackMatch =
      !!normalizedOrderSearchTerm &&
      normalizeOrderCode(order[ORDER_FIELDS.ID_ORDER]).includes(
        normalizedOrderSearchTerm
      );
    const productFallbackMatch =
      !!normalizedSearchTerm &&
      normalizeSearchText(order[ORDER_FIELDS.ID_PRODUCT]).includes(
        normalizedSearchTerm
      );

    const orderStatusText = String(
      order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || ""
    ).trim();

    let matchesStatus: boolean;
    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "today") {
      const regSrc = sanitizeDateLike(
        order.registration_date ||
          order.registration_date_display ||
          order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] ||
          order[ORDER_FIELDS.ORDER_DATE]
      );
      matchesStatus = isRegisteredToday(regSrc);
    } else if (statusFilter === ORDER_STATUSES.CAN_GIA_HAN) {
      const remaining = Number(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);
      matchesStatus = Number.isFinite(remaining) && remaining > 0 && remaining <= 4;
    } else if (statusFilter === ORDER_STATUSES.ORDER_EXPIRED) {
      const remaining = Number(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);
      matchesStatus = Number.isFinite(remaining) && remaining <= 0;
    } else {
      matchesStatus = !!(statusFilterValue && orderStatusText === statusFilterValue);
    }

    return (
      (matchesSearch || orderCodeFallbackMatch || productFallbackMatch) &&
      matchesStatus
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (dataset === "canceled") {
      const canceledA = parseCanceledAtToMs(a.canceled_at);
      const canceledB = parseCanceledAtToMs(b.canceled_at);
      if (canceledA !== canceledB) {
        return canceledB - canceledA;
      }
    }

    const statusA = String(a[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "").trim();
    const statusB = String(b[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || "").trim();
    const unpaidA = isUnpaidStatus(statusA);
    const unpaidB = isUnpaidStatus(statusB);

    if (unpaidA !== unpaidB) {
      return unpaidA ? -1 : 1;
    }

    if (dataset === "expired") {
      const timeA = parseExpiryTime(a);
      const timeB = parseExpiryTime(b);
      if (timeA !== timeB) {
        return timeB - timeA;
      }
    }

    const priorityA = getStatusPriority(statusA);
    const priorityB = getStatusPriority(statusB);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const remainingA = Number(a[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);
    const remainingB = Number(b[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);

    if (remainingA !== remainingB) {
      return remainingA - remainingB;
    }

    const idA = a[ORDER_FIELDS.ID_ORDER] || "";
    const idB = b[ORDER_FIELDS.ID_ORDER] || "";

    if (idA < idB) return -1;
    if (idA > idB) return 1;
    return 0;
  });

  return sorted;
}

export { computeOrderStats } from "./orderStatsTransform";
