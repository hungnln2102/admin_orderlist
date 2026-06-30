import { addDaysUtc } from "@/features/dashboard/utils/spreadCostAcrossPeriod";
import {
  buildIdentifierKeys,
  enhancePackageRow,
  normalizeMatchKey,
  normalizeProductCodeValue,
  normalizeSlotKey,
  parseNumericValue,
  readSlotLinkPrefs,
  toCleanString,
  type AugmentedRow,
  type NormalizedOrderRecord,
  type OrderListItem,
  type PackageRow,
} from "@/features/package-product/utils/packageHelpers";
import {
  computeAugmentationForPackage,
  orderBelongsToPackageByProduct,
} from "@/features/package-product/utils/packageMatchUtils";
import type { ExpenseFormRow, OrderListRow } from "../types";
import { normalizeYmd } from "./periodColumns";

const buildPackageOrderRecord = (order: OrderListItem): NormalizedOrderRecord => {
  const o = order as Record<string, unknown>;
  const idProduct = (order.id_product ?? o.idProduct ?? "") as string;
  const informationOrder =
    (order.information_order ?? o.informationOrder ?? "") as string;
  const registrationDateYmd = normalizeYmd(
    (o.registration_date as string | null | undefined) ??
      (o.order_date_raw as string | null | undefined) ??
      (o.order_date as string | null | undefined) ??
      (o.created_at_raw as string | null | undefined) ??
      (o.created_at as string | null | undefined) ??
      "",
  );
  const rawLinePid = o.line_product_id ?? o.lineProductId;
  const parsedLineProductId =
    rawLinePid != null && rawLinePid !== "" ? Number(rawLinePid) : NaN;
  const lineProductId =
    Number.isFinite(parsedLineProductId) && parsedLineProductId > 0
      ? parsedLineProductId
      : null;
  const productKeys = buildIdentifierKeys(idProduct);
  const infoKeys = buildIdentifierKeys(informationOrder);

  return {
    base: order,
    productKey: productKeys.normalized,
    productLettersKey: productKeys.lettersOnly,
    infoKey: infoKeys.normalized,
    infoLettersKey: infoKeys.lettersOnly,
    slotDisplay: toCleanString(order.slot),
    slotKey: normalizeSlotKey(order.slot),
    slotMatchKey: normalizeMatchKey(order.slot),
    informationDisplay: toCleanString(informationOrder),
    informationKey: normalizeSlotKey(informationOrder),
    informationMatchKey: normalizeMatchKey(informationOrder),
    customerDisplay: toCleanString(order.customer as string | null),
    productCodeNormalized: normalizeProductCodeValue(idProduct),
    registrationDateYmd: registrationDateYmd || null,
    lineProductId,
  };
};

const buildOrdersByProductCode = (records: NormalizedOrderRecord[]) => {
  const map = new Map<string, NormalizedOrderRecord[]>();
  records.forEach((record) => {
    if (!record.productCodeNormalized) return;
    if (!map.has(record.productCodeNormalized)) {
      map.set(record.productCodeNormalized, []);
    }
    map.get(record.productCodeNormalized)!.push(record);
  });
  return map;
};

export const buildComputedPackages = (
  packageRows: PackageRow[],
  packageOrders: OrderListItem[],
): AugmentedRow[] => {
  const prefs = readSlotLinkPrefs();
  const normalizedPackages = packageRows.map((row) =>
    enhancePackageRow(row, prefs),
  );
  const orderRecords = packageOrders.map(buildPackageOrderRecord);
  const ordersByProductCode = buildOrdersByProductCode(orderRecords);

  return normalizedPackages.map((item) => ({
    ...item,
    ...computeAugmentationForPackage({
      item,
      orderMatchers: orderRecords,
      ordersByProductCode,
      ordersReady: true,
    }),
  }));
};

const getImportOrderAccountKeys = (order: OrderListRow) =>
  [
    normalizeMatchKey(order.slot == null ? "" : String(order.slot)),
    normalizeMatchKey(order.information_order ?? ""),
    normalizeMatchKey(order.customer ?? ""),
  ].filter(Boolean);

const getPackageAccountKeys = (pkg: AugmentedRow) =>
  [
    normalizeMatchKey(pkg.informationUser ?? ""),
    normalizeMatchKey(pkg.accountUser ?? ""),
  ].filter(Boolean);

const keysMatch = (a: string, b: string) =>
  Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));

const findPackageForImportOrder = (
  order: OrderListRow,
  packages: AugmentedRow[],
) => {
  const orderRecord = buildPackageOrderRecord(order as OrderListItem);
  const productCandidates = packages.filter((pkg) =>
    orderBelongsToPackageByProduct(orderRecord, pkg),
  );
  if (productCandidates.length === 0) return null;

  const accountKeys = getImportOrderAccountKeys(order);

  if (accountKeys.length > 0) {
    const accountMatched = productCandidates.find((pkg) => {
      const packageKeys = getPackageAccountKeys(pkg);
      return accountKeys.some((orderKey) =>
        packageKeys.some((packageKey) => keysMatch(orderKey, packageKey)),
      );
    });
    if (accountMatched) return accountMatched;
  }

  return null;
};

const buildSlotRowsForImportOrder = (
  order: OrderListRow,
  packages: AugmentedRow[],
): ExpenseFormRow[] => {
  const orderCode = String(order.id_order || "").trim();
  const rawDays = Number(order.days);
  const termDays =
    Number.isFinite(rawDays) && rawDays > 0 ? Math.floor(rawDays) : 0;

  const regYmd = normalizeYmd(order.registration_date ?? undefined);
  const paidFallback = normalizeYmd(order.created_at_raw ?? order.created_at ?? "");
  const product =
    String(order.product_display_name ?? order.id_product ?? "").trim();
  const costNum = Number(order.cost);
  const totalCost = Number.isFinite(costNum) && costNum >= 0 ? costNum : 0;
  const displayStart =
    (order.registration_date_display &&
      String(order.registration_date_display).trim()) ||
    (order.registration_date_str && String(order.registration_date_str).trim()) ||
    (regYmd ? regYmd.split("-").reverse().join("/") : "");

  const matchedPackage = findPackageForImportOrder(order, packages);
  const slotLimitRaw =
    matchedPackage != null ? parseNumericValue(matchedPackage.slotLimit) : null;
  const slotLimit = slotLimitRaw && slotLimitRaw > 0 ? Math.floor(slotLimitRaw) : 1;
  const slotCost = slotLimit > 0 ? totalCost / slotLimit : totalCost;
  const slotAssignments = matchedPackage?.slotAssignments ?? [];
  const baseRow = {
    orderCode,
    productCode: product,
    term: termDays > 0 ? `${termDays} ngày` : "—",
    startDate: displayStart,
    termDays,
    startDateYmd: termDays > 0 ? regYmd : paidFallback || regYmd,
  };

  if (!matchedPackage) {
    return [];
  }

  return Array.from({ length: slotLimit }, (_, index) => {
    const assignment = slotAssignments[index] ?? null;
    const assignedStartYmd = normalizeYmd(assignment?.sourceOrderStartYmd ?? "");
    const scheduledSlotEndYmd =
      baseRow.startDateYmd && baseRow.termDays > 0
        ? addDaysUtc(baseRow.startDateYmd, baseRow.termDays - 1)
        : null;
    const endDateYmd = assignment
      ? assignedStartYmd
        ? addDaysUtc(assignedStartYmd, -1)
        : addDaysUtc(baseRow.startDateYmd, -1)
      : null;
    return {
      key: `ol-${order.id ?? 0}-${orderCode}-slot-${index + 1}`,
      ...baseRow,
      slotLabel: assignment?.slotLabel ? String(assignment.slotLabel).trim() : "",
      slotStartYmd: assignment ? assignedStartYmd || baseRow.startDateYmd : null,
      slotEndYmd: assignment ? scheduledSlotEndYmd : null,
      totalCost: slotCost,
      endDateYmd,
    };
  });
};

export const ordersFromOrderList = (
  rows: OrderListRow[],
  packages: AugmentedRow[],
): ExpenseFormRow[] =>
  rows.flatMap((order) => {
    const orderCode = String(order.id_order || "").trim();
    if (!orderCode) return [];
    return buildSlotRowsForImportOrder(order, packages);
  });


export const computeExpenseRows = (
  importRows: OrderListRow[],
  packageRows: PackageRow[],
  packageOrders: OrderListItem[],
) => {
  const computedPackages = buildComputedPackages(packageRows, packageOrders);
  return ordersFromOrderList(importRows, computedPackages);
};
