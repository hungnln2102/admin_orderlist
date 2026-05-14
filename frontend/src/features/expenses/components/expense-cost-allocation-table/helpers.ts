import {
  addDaysUtc,
  getCostPeriodAmount,
  type PeriodColumn as AllocPeriodColumn,
} from "@/features/dashboard/utils/spreadCostAcrossPeriod";
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

export type ViewMode = "day" | "month";
export type FixedColumnKey =
  | "orderCode"
  | "productCode"
  | "term"
  | "startDate"
  | "amount"
  | "slot";

export type FixedColumn = {
  key: FixedColumnKey;
  label: string;
  width: number;
  left: number;
};

export type PeriodColumn = AllocPeriodColumn;

export type OrderListRow = {
  id?: number;
  id_order?: string;
  id_product?: string | number | null;
  product_display_name?: string;
  information_order?: string | null;
  customer?: string | null;
  line_product_id?: number | string | null;
  lineProductId?: number | string | null;
  days?: number | string | null;
  registration_date?: string | null;
  registration_date_str?: string;
  registration_date_display?: string;
  cost?: number | string | null;
  created_at?: string | null;
  created_at_raw?: string | null;
  slot?: string | number | null;
};

export type ExpenseFormRow = {
  key: string;
  orderCode: string;
  productCode: string;
  term: string;
  startDate: string;
  slotLabel: string;
  slotStartYmd?: string | null;
  slotEndYmd?: string | null;
  totalCost: number;
  termDays: number;
  startDateYmd: string;
  endDateYmd?: string | null;
};

export const START_DATE = new Date(2026, 3, 23);
export const DATE_COLUMN_WIDTH = 102;
export const MONTH_COLUMN_WIDTH = 124;
export const TOTAL_COLUMN_WIDTH = 118;
export const DATA_ROW_HEIGHT = 37;
export const DATA_VISIBLE_ROWS = 10;

export const FIXED_COLUMNS: FixedColumn[] = [
  { key: "orderCode", label: "Mã đơn hàng", width: 154, left: 0 },
  { key: "productCode", label: "Mã sản phẩm", width: 154, left: 154 },
  { key: "term", label: "Thời hạn", width: 116, left: 308 },
  { key: "startDate", label: "Ngày bắt đầu", width: 136, left: 424 },
  { key: "amount", label: "Số tiền", width: 142, left: 560 },
  { key: "slot", label: "Slot", width: 96, left: 702 },
];

export const LAST_FIXED_COLUMN_KEY: FixedColumnKey = "slot";
export const FIXED_COLUMNS_WIDTH = FIXED_COLUMNS.reduce(
  (total, column) => total + column.width,
  0,
);

export const SLOT_COLUMN = FIXED_COLUMNS.find((c) => c.key === "slot")!;
export const FIXED_MERGE_COLUMNS = FIXED_COLUMNS.filter((c) => c.key !== "slot");

export const totalColCell =
  "sticky right-0 z-[45] border-l-2 border-sky-500/35 bg-[#020617] text-sky-100 shadow-[-12px_0_24px_-12px_rgba(56,189,248,0.12)] transition-colors group-hover:bg-slate-900";
export const totalColHead =
  "sticky right-0 z-[100] border-l-2 border-sky-400/40 bg-[#020617] text-sky-100 shadow-[-12px_0_28px_-12px_rgba(56,189,248,0.18)]";
export const totalColFoot =
  "sticky right-0 z-[78] border-l-2 border-sky-400/40 bg-[#020617] text-sky-50 shadow-[-12px_0_28px_-12px_rgba(56,189,248,0.15)]";

const moneyFormatter = new Intl.NumberFormat("vi-VN");
export const formatMoney = (value: number) =>
  `${moneyFormatter.format(Math.round(value))} đ`;

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeYmd = (value: string | null | undefined) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : String(value);
};

const doesRangeOverlapColumn = (
  startYmd: string | null | undefined,
  endYmd: string | null | undefined,
  column: PeriodColumn,
) => {
  if (!startYmd) return false;
  const end = endYmd || startYmd;
  if (end < startYmd) return false;
  return startYmd <= column.endKey && end >= column.startKey;
};

export const hasSlotInPeriod = (row: ExpenseFormRow, column: PeriodColumn) =>
  Boolean(row.slotLabel) &&
  doesRangeOverlapColumn(
    row.slotStartYmd || row.startDateYmd,
    row.slotEndYmd,
    column,
  );

export const amountForTotals = (
  row: ExpenseFormRow,
  column: PeriodColumn,
): number => {
  if (hasSlotInPeriod(row, column)) return 0;
  return getCostPeriodAmount(row, column) ?? 0;
};

export const rowTotalDisplayed = (row: ExpenseFormRow, columns: PeriodColumn[]) =>
  columns.reduce((s, col) => s + amountForTotals(row, col), 0);

export const buildDateColumns = (): PeriodColumn[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(START_DATE);
  start.setHours(0, 0, 0, 0);
  if (today < start) return [];

  const columns: PeriodColumn[] = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const key = getDateKey(cursor);
    columns.push({
      key,
      label: `${cursor.getDate()}/${cursor.getMonth() + 1}`,
      year: cursor.getFullYear(),
      startKey: key,
      endKey: key,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return columns;
};

export const buildMonthColumns = (): PeriodColumn[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(START_DATE);
  start.setHours(0, 0, 0, 0);
  if (today < start) return [];

  const columns: PeriodColumn[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= today) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const effectiveStart = monthStart < start ? start : monthStart;
    const effectiveEnd = monthEnd > today ? today : monthEnd;

    columns.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: `${month + 1}/${year}`,
      year,
      startKey: getDateKey(effectiveStart),
      endKey: getDateKey(effectiveEnd),
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return columns;
};

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

const buildComputedPackages = (
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

const mergeKeyForExpenseRow = (row: ExpenseFormRow) =>
  [
    row.orderCode,
    row.productCode,
    row.term,
    row.startDate,
    String(row.totalCost),
    row.startDateYmd,
    String(row.termDays),
  ].join("\0");

export const computeFixedPrefixMergeRowSpans = (rows: ExpenseFormRow[]): number[] => {
  const spans = rows.map(() => 0);
  let i = 0;
  while (i < rows.length) {
    const key = mergeKeyForExpenseRow(rows[i]);
    let j = i + 1;
    while (j < rows.length && mergeKeyForExpenseRow(rows[j]) === key) {
      j += 1;
    }
    spans[i] = j - i;
    i = j;
  }
  return spans;
};

export const computeExpenseRows = (
  importRows: OrderListRow[],
  packageRows: PackageRow[],
  packageOrders: OrderListItem[],
) => {
  const computedPackages = buildComputedPackages(packageRows, packageOrders);
  return ordersFromOrderList(importRows, computedPackages);
};
