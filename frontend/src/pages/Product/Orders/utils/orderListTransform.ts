import {
  ORDER_FIELDS,
  ORDER_STATUSES,
  VIRTUAL_FIELDS,
  Order,
  OrderDatasetKey,
} from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import {
  normalizeOrderCode,
  normalizeSearchText,
  parseExpiryTime,
  parseNumeric,
  resolveDateDisplay,
  sanitizeDateLike,
  sanitizeNumberLike,
} from "./ordersHelpers";
import { BASE_STOCK_STATS, type BaseStat } from "../constants";

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
      order.expiry_date ?? order[ORDER_FIELDS.ORDER_EXPIRED]
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
    const fallbackRemaining = Helpers.daysUntilDate(
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

    const giaBan = Helpers.roundGiaBanValue(
      Number.parseFloat(String(order[ORDER_FIELDS.PRICE] ?? 0)) || 0
    );
    const soNgayDangKy = Number(order[ORDER_FIELDS.DAYS]) || 0;
    const daysForValue = Math.max(0, effectiveRemaining);
    let giaTriConLai =
      soNgayDangKy > 0 ? (giaBan * daysForValue) / soNgayDangKy : 0;

    const rawRefund =
      order.can_hoan ??
      (order as Record<string, unknown>)[ORDER_FIELDS.REFUND] ??
      (order as Record<string, unknown>)["refund"];
    let canHoanValue =
      parseNumeric(rawRefund) ??
      (Number.isFinite(giaTriConLai) ? giaTriConLai : null);

    if (dataset === "canceled") {
      const refundFromDb = parseNumeric(
        (order as Record<string, unknown>)["refund"]
      );
      if (refundFromDb !== null) {
        giaTriConLai = refundFromDb;
        canHoanValue = refundFromDb;
      }
    }

    return {
      ...order,
      [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: effectiveRemaining,
      [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: giaTriConLai,
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
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilterValue && orderStatusText === statusFilterValue);

    return (
      (matchesSearch || orderCodeFallbackMatch || productFallbackMatch) &&
      matchesStatus
    );
  });

  const sorted = [...filtered].sort((a, b) => {
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

    const priorityA = Helpers.getStatusPriority(statusA);
    const priorityB = Helpers.getStatusPriority(statusB);

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

/** Tính thống kê từ danh sách đơn đã có trường ảo (dùng toàn bộ orders, không phải filtered). */
export function computeOrderStats(ordersWithVirtual: Order[]): {
  updatedStats: BaseStat[];
  totalRecords: number;
} {
  const totalOrders = ordersWithVirtual.length;
  const needsRenewal = ordersWithVirtual.filter((order) => {
    const remaining = Number(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);
    return Number.isFinite(remaining) && remaining > 0 && remaining <= 4;
  }).length;
  const expiredOrders = ordersWithVirtual.filter((order) => {
    const remaining = Number(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);
    return Number.isFinite(remaining) && remaining <= 0;
  }).length;

  const registeredTodayCount = ordersWithVirtual.filter((order) => {
    const registrationSource = sanitizeDateLike(
      order.registration_date ||
        order.registration_date_display ||
        order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] ||
        order[ORDER_FIELDS.ORDER_DATE]
    );
    return Helpers.isRegisteredToday(registrationSource);
  }).length;

  const updatedStats = [
    { ...BASE_STOCK_STATS[0], value: String(totalOrders) },
    { ...BASE_STOCK_STATS[1], value: String(needsRenewal) },
    { ...BASE_STOCK_STATS[2], value: String(expiredOrders) },
    { ...BASE_STOCK_STATS[3], value: String(registeredTodayCount) },
  ];

  return { updatedStats, totalRecords: totalOrders };
}

/** Cắt trang từ danh sách đã lọc. */
export function getPaginated(
  filteredOrders: Order[],
  currentPage: number,
  rowsPerPage: number
): { currentOrders: Order[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstRow, indexOfLastRow);
  return { currentOrders, totalPages };
}

/** Sinh danh sách số trang + dấu "..." cho UI phân trang. */
export function buildPaginationPages(
  currentPage: number,
  totalPages: number
): (number | "...")[] {
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);
  const start = clamp(currentPage - 1, 2, totalPages - 3);
  const end = clamp(currentPage + 1, 4, totalPages - 1);
  pages.push(1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
}
