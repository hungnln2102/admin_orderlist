/**
 * Package–Order match logic (rule: match column chosen at create/edit;
 * compare package account with exactly one order column: slot or information).
 */
import type {
  AugmentedRow,
  NormalizedOrderRecord,
  PackageRow,
  PackageSlotAssignment,
} from "./packageHelpers";
import {
  buildPackageLinkKeys,
  buildSlotLabelVariants,
  DEFAULT_CAPACITY_LIMIT,
  DEFAULT_SLOT_CAPACITY_UNIT,
  DEFAULT_SLOT_LIMIT,
  extractCapacityUnitsFromOrder,
  normalizeIdentifier,
  parseNumericValue,
  resolveOrderDisplayValue,
} from "./packageHelpers";

import {
  buildOrderLookupKey,
  collectOrdersByProductCodes,
  getDisplayColumn,
  getMatchColumn,
} from "./packageMatchKeys";

export { orderBelongsToPackageByProduct, orderMatchesPackageLink } from "./packageOrderMatchers";
import { orderBelongsToPackageByProduct, orderMatchesPackageLink } from "./packageOrderMatchers";

export type ComputeAugmentationInput = {
  item: PackageRow & {
    normalizedProductCodes?: string[];
    productCodes?: string[] | null;
    matchModeValue?: string | null;
    match?: string | null;
  };
  orderMatchers: NormalizedOrderRecord[];
  ordersByProductCode: Map<string, NormalizedOrderRecord[]>;
  ordersReady: boolean;
};

/**
 * Computes slotAssignments, slotUsed, capacity, and related fields for one package row.
 */
export function computeAugmentationForPackage(input: ComputeAugmentationInput) {
  const { item, orderMatchers, ordersByProductCode, ordersReady } = input;
  const includeCapacity = Boolean(item.hasCapacityField);
  const slotLimitRaw = parseNumericValue(item.slot);
  const slotLimit =
    slotLimitRaw && slotLimitRaw > 0
      ? Math.floor(slotLimitRaw)
      : DEFAULT_SLOT_LIMIT;
  const slotUsedRaw = parseNumericValue((item as PackageRow).slotUsed);
  const packageCode = normalizeIdentifier(item.package ?? "");
  const slotMode = item.slotLinkMode ?? "information";
  const displayColumn = getDisplayColumn(slotMode);
  const matchColumn = getMatchColumn(slotMode);
  const packageLinkKeys = buildPackageLinkKeys(item, slotMode);
  const hasRootAccountForLink = packageLinkKeys.length > 0;
  const normalizedProductCodes = item.normalizedProductCodes ?? [];
  const productCodeSet =
    normalizedProductCodes.length > 0 ? new Set(normalizedProductCodes) : null;
  // Phải bật match khi có productId dòng gói (dù tên gói/variant rỗng) để nhánh
  // lineProductId = variant.product_id vẫn chạy; trước đây thiếu tên=chuỗi rỗng + không có mã → tắt cả bước.
  const hasProductIdForScope =
    item.productId != null &&
    Number.isFinite(Number(item.productId)) &&
    Number(item.productId) > 0;
  const hasProductScope =
    (productCodeSet != null && productCodeSet.size > 0) ||
    packageCode.length > 0 ||
    hasProductIdForScope;
  const shouldMatchOrders =
    ordersReady && orderMatchers.length > 0 && hasProductScope;

  const matchesProductRecord = (record: NormalizedOrderRecord) =>
    orderBelongsToPackageByProduct(record, { ...item, normalizedProductCodes });
  const matchesLinkRecord = (record: NormalizedOrderRecord) =>
    orderMatchesPackageLink(record, { ...item, slotLinkMode: slotMode });

  const candidateOrders =
    shouldMatchOrders && productCodeSet?.size
      ? collectOrdersByProductCodes(productCodeSet, ordersByProductCode)
      : null;

  const relevantOrders = shouldMatchOrders
    ? (() => {
        const combined = new Map<string, NormalizedOrderRecord>();
        const addOrder = (record: NormalizedOrderRecord) => {
          const key = buildOrderLookupKey(record, combined.size);
          if (!combined.has(key)) combined.set(key, record);
        };
        candidateOrders?.forEach(addOrder);
        orderMatchers.forEach((record) => {
          if (matchesProductRecord(record)) addOrder(record);
        });
        return Array.from(combined.values()).filter(matchesLinkRecord);
      })()
    : [];

  const seenOrderIds = new Set<string>();
  const slotAssignments: PackageSlotAssignment[] = [];
  if (shouldMatchOrders) {
    relevantOrders.forEach((orderRecord) => {
      const displayValue = resolveOrderDisplayValue(orderRecord, displayColumn);
      const matchValueRaw =
        matchColumn === "slot"
          ? orderRecord.slotDisplay
          : orderRecord.informationDisplay;
      const matchValue =
        matchValueRaw || orderRecord.customerDisplay || "";
      const uniqueKey =
        orderRecord.base?.id !== undefined && orderRecord.base?.id !== null
          ? `id:${orderRecord.base.id}`
          : orderRecord.base?.id_order !== undefined &&
              orderRecord.base?.id_order !== null
            ? `code:${orderRecord.base.id_order}`
            : `${matchValue}-${slotAssignments.length}`;
      if (seenOrderIds.has(uniqueKey)) return;
      seenOrderIds.add(uniqueKey);
      const label = displayValue || matchValue;
      const labelVariants = buildSlotLabelVariants(
        orderRecord,
        displayColumn,
        label
      );
      if (labelVariants.length === 0) return;
      const capacityUnits = includeCapacity
        ? extractCapacityUnitsFromOrder(packageCode, orderRecord)
        : null;
      labelVariants.forEach((slotLabel) => {
        const resolvedLabel = slotLabel || label || "";
        if (!resolvedLabel) return;
        slotAssignments.push({
          slotLabel: resolvedLabel,
          matchValue: matchValue || resolvedLabel,
          sourceOrderId: orderRecord.base?.id ?? null,
          sourceOrderCode:
            (orderRecord.base?.id_order as string | number | null) ?? null,
          sourceOrderStartYmd: orderRecord.registrationDateYmd ?? null,
          displayColumn,
          matchColumn,
          capacityUnits,
          customerLabel: orderRecord.customerDisplay
            ? String(orderRecord.customerDisplay).trim() || null
            : null,
        });
      });
    });
  }

  const slotUsageCount =
    slotAssignments.length > 0
      ? slotAssignments.length
      : hasRootAccountForLink && slotUsedRaw !== null
        ? Math.max(Math.floor(slotUsedRaw), 0)
        : 0;
  const slotUsed = Math.min(slotUsageCount, slotLimit);
  const remainingSlots = Math.max(slotLimit - slotUsed, 0);

  let capacityLimit = 0;
  let capacityUsed = 0;
  let remainingCapacity = 0;
  if (includeCapacity) {
    const capacityLimitRaw = parseNumericValue(item.storageTotal);
    capacityLimit =
      capacityLimitRaw && capacityLimitRaw > 0
        ? Math.floor(capacityLimitRaw)
        : DEFAULT_CAPACITY_LIMIT;
    const capacityUsedRaw = parseNumericValue(
      (item as PackageRow).capacityUsed
    );
    const derivedCapacityUnits =
      slotAssignments.length > 0
        ? slotAssignments.reduce(
            (total, assignment) =>
              total +
              (assignment.capacityUnits ?? DEFAULT_SLOT_CAPACITY_UNIT),
            0
          )
        : slotUsageCount * DEFAULT_SLOT_CAPACITY_UNIT;
    const fallbackCapacityUsed = Math.min(derivedCapacityUnits, capacityLimit);
    capacityUsed = Math.min(
      Math.max(
        capacityUsedRaw !== null ? Math.floor(capacityUsedRaw) : fallbackCapacityUsed,
        0
      ),
      capacityLimit
    );
    remainingCapacity = Math.max(capacityLimit - capacityUsed, 0);
  }

  const matchedOrders = shouldMatchOrders
    ? relevantOrders.map((entry) => entry.base)
    : [];

  return {
    slotUsed,
    slotLimit,
    remainingSlots,
    capacityLimit,
    capacityUsed,
    remainingCapacity,
    slotAssignments,
    matchedOrders,
    packageCode,
    hasCapacityField: includeCapacity,
    productCodes: item.productCodes ?? [],
    normalizedProductCodes,
    matchModeValue: item.matchModeValue ?? item.match ?? null,
  };
}
