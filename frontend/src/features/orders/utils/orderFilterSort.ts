import { isRegisteredToday } from "@/shared/date";
import { ORDER_FIELDS, ORDER_STATUSES, VIRTUAL_FIELDS, Order, OrderDatasetKey } from "@/constants";
import { getStatusPriority } from "../status";
import {
  parseCanceledAtToMs,
  parseExpiryTime,
  sanitizeDateLike,
} from "./ordersHelpers";
import { normalizeSearchText, normalizeCompactCode as normalizeOrderCode } from "@/shared/text";

export type FilterSortParams = {
  searchTerm: string;
  searchField: string;
  statusFilter: string;
  dataset: OrderDatasetKey;
};

const isUnpaidStatus = (statusText: string) =>
  statusText === ORDER_STATUSES.CHUA_THANH_TOAN ||
  statusText === ORDER_STATUSES.CHO_HOAN;

const getSearchableFields = (searchField: string) =>
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

const matchesOrderSearch = (
  order: Order,
  searchableFields: string[],
  normalizedSearchTerm: string,
  normalizedOrderSearchTerm: string
) => {
  if (!normalizedSearchTerm) return true;

  return searchableFields.some((field) => {
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
};

const matchesOrderStatus = (order: Order, statusFilter: string) => {
  const statusFilterValue =
    statusFilter === "all" ? "" : String(statusFilter || "").trim();
  const orderStatusText = String(
    order[VIRTUAL_FIELDS.TRANG_THAI_TEXT] || ""
  ).trim();

  if (statusFilter === "all") return true;

  if (statusFilter === "today") {
    const regSrc = sanitizeDateLike(
      order.registration_date ||
        order.registration_date_display ||
        order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] ||
        order[ORDER_FIELDS.ORDER_DATE]
    );
    return isRegisteredToday(regSrc);
  }

  if (statusFilter === ORDER_STATUSES.CAN_GIA_HAN) {
    const remaining = Number(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);
    return Number.isFinite(remaining) && remaining > 0 && remaining <= 4;
  }

  if (statusFilter === ORDER_STATUSES.ORDER_EXPIRED) {
    const remaining = Number(order[VIRTUAL_FIELDS.SO_NGAY_CON_LAI] ?? 0);
    return Number.isFinite(remaining) && remaining <= 0;
  }

  return !!(statusFilterValue && orderStatusText === statusFilterValue);
};

const compareOrders = (dataset: OrderDatasetKey) => (a: Order, b: Order) => {
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
};

export function filterAndSortOrders(
  ordersWithVirtual: Order[],
  params: FilterSortParams
): Order[] {
  const { searchTerm, searchField, statusFilter, dataset } = params;
  const normalizedSearchTerm = normalizeSearchText(searchTerm);
  const normalizedOrderSearchTerm = normalizeOrderCode(searchTerm);
  const searchableFields = getSearchableFields(searchField);

  const filtered = ordersWithVirtual.filter((order) => {
    const matchesSearch = matchesOrderSearch(
      order,
      searchableFields,
      normalizedSearchTerm,
      normalizedOrderSearchTerm
    );
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

    return (
      (matchesSearch || orderCodeFallbackMatch || productFallbackMatch) &&
      matchesOrderStatus(order, statusFilter)
    );
  });

  return [...filtered].sort(compareOrders(dataset));
}
