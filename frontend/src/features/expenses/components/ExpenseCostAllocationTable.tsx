import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { apiFetch } from "@/shared/api/client";
import {
  getAllocatedTotal,
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
import { computeAugmentationForPackage } from "@/features/package-product/utils/packageMatchUtils";

type ViewMode = "day" | "month";
type FixedColumnKey =
  | "orderCode"
  | "productCode"
  | "term"
  | "startDate"
  | "amount"
  | "slot";

type FixedColumn = {
  key: FixedColumnKey;
  label: string;
  width: number;
  left: number;
};

type PeriodColumn = AllocPeriodColumn;

type OrderListRow = {
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

type ExpenseFormRow = {
  key: string;
  orderCode: string;
  productCode: string;
  term: string;
  startDate: string;
  slotLabel: string;
  totalCost: number;
  termDays: number;
  startDateYmd: string;
};

const START_DATE = new Date(2026, 3, 22);
const DATE_COLUMN_WIDTH = 102;
const MONTH_COLUMN_WIDTH = 124;
const REMAINING_COLUMN_WIDTH = 136;
const DATA_ROW_HEIGHT = 37;
const DATA_VISIBLE_ROWS = 10;

const FIXED_COLUMNS: FixedColumn[] = [
  { key: "orderCode", label: "Mã đơn hàng", width: 154, left: 0 },
  { key: "productCode", label: "Mã sản phẩm", width: 154, left: 154 },
  { key: "term", label: "Thời hạn", width: 116, left: 308 },
  { key: "startDate", label: "Ngày bắt đầu", width: 136, left: 424 },
  { key: "amount", label: "Số tiền", width: 142, left: 560 },
  { key: "slot", label: "Slot", width: 96, left: 702 },
];

const LAST_FIXED_COLUMN_KEY: FixedColumnKey = "slot";
const FIXED_COLUMNS_WIDTH = FIXED_COLUMNS.reduce(
  (total, column) => total + column.width,
  0,
);

const moneyFormatter = new Intl.NumberFormat("vi-VN");

const formatMoney = (value: number) =>
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

const buildDateColumns = (): PeriodColumn[] => {
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

const buildMonthColumns = (): PeriodColumn[] => {
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

const getImportOrderProductId = (order: OrderListRow) => {
  const raw = order.line_product_id ?? order.lineProductId;
  const value = raw != null && raw !== "" ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
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
  const productId = getImportOrderProductId(order);
  const productCandidates =
    productId != null
      ? packages.filter((pkg) => Number(pkg.productId) === productId)
      : packages;
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

  return productCandidates[0] ?? null;
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
    return [
      {
        key: `ol-${order.id ?? 0}-${orderCode}-slot-1`,
        ...baseRow,
        slotLabel: toCleanString(order.slot),
        totalCost,
      },
    ];
  }

  return Array.from({ length: slotLimit }, (_, index) => {
    const assignment = slotAssignments[index] ?? null;
    return {
      key: `ol-${order.id ?? 0}-${orderCode}-slot-${index + 1}`,
      ...baseRow,
      slotLabel: assignment?.slotLabel ? String(assignment.slotLabel).trim() : "",
      totalCost: slotCost,
    };
  });
};

const ordersFromOrderList = (
  rows: OrderListRow[],
  packages: AugmentedRow[],
): ExpenseFormRow[] =>
  rows.flatMap((order) => {
    const orderCode = String(order.id_order || "").trim();
    if (!orderCode) return [];
    return buildSlotRowsForImportOrder(order, packages);
  });

const remainderLabel = (
  row: ExpenseFormRow,
  columns: AllocPeriodColumn[],
): string => {
  const allocation = row.totalCost || 0;
  if (!(allocation > 0)) return "";
  const allocated = getAllocatedTotal(row, columns);
  return formatMoney(Math.max(0, allocation - allocated));
};

export const ExpenseCostAllocationTable: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<ExpenseFormRow[]>([]);

  const dayColumns = useMemo(() => buildDateColumns(), []);
  const monthColumns = useMemo(() => buildMonthColumns(), []);
  const periodColumns = viewMode === "day" ? dayColumns : monthColumns;

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [importOrdersRes, packagesRes, packageOrdersRes] = await Promise.all([
        apiFetch("/api/orders?scope=mavn_paid"),
        apiFetch("/api/package-products"),
        apiFetch("/api/orders?scope=package_match"),
      ]);

      if (!importOrdersRes.ok || !packagesRes.ok || !packageOrdersRes.ok) {
        const failed =
          !importOrdersRes.ok
            ? importOrdersRes
            : !packagesRes.ok
              ? packagesRes
              : packageOrdersRes;
        const err = await failed.json().catch(() => ({}));
        throw new Error(
          (err && (err.error as string)) ||
            failed.statusText ||
            "Không thể tải dữ liệu chi phí.",
        );
      }

      const [importOrdersData, packagesData, packageOrdersData] = await Promise.all([
        importOrdersRes.json(),
        packagesRes.json(),
        packageOrdersRes.json(),
      ]);
      const importRows = (
        Array.isArray(importOrdersData) ? importOrdersData : []
      ) as OrderListRow[];
      const packageRows = (
        Array.isArray(packagesData) ? packagesData : []
      ) as PackageRow[];
      const packageOrders = (
        Array.isArray(packageOrdersData) ? packageOrdersData : []
      ) as OrderListItem[];
      const computedPackages = buildComputedPackages(packageRows, packageOrders);

      setOrders(ordersFromOrderList(importRows, computedPackages));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const periodColumnWidth =
    viewMode === "day" ? DATE_COLUMN_WIDTH : MONTH_COLUMN_WIDTH;
  const yearLabel = useMemo(() => {
    const years = Array.from(
      new Set(periodColumns.map((column) => column.year)),
    );
    return years.length > 0 ? years.join(" - ") : "2026";
  }, [periodColumns]);
  const tableMinWidth =
    FIXED_COLUMNS_WIDTH +
    periodColumns.length * periodColumnWidth +
    REMAINING_COLUMN_WIDTH;
  const columnKeys = periodColumns.map((column) => column.key).join("|");
  const fixedDisplayRows = useMemo(() => orders.slice(0, 120), [orders]);

  return (
    <section className="rounded-2xl border border-indigo-500/25 bg-slate-950/58 shadow-[0_24px_70px_-26px_rgba(79,70,229,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-white/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300/80">
            {viewMode === "day"
              ? "Bảng chi phí theo ngày"
              : "Bảng chi phí theo tháng"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            Form phân bổ chi phí - đơn nhập MAVN (Đã TT)
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadRows()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-400/12 px-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/45 hover:bg-emerald-400/18"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Tải lại
          </button>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "day" ? "month" : "day")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-300/25 bg-sky-400/12 px-4 text-sm font-semibold text-sky-100 transition hover:border-sky-200/45 hover:bg-sky-400/18"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {viewMode === "day" ? "Theo tháng" : "Theo ngày"}
          </button>
        </div>
      </div>

      {loading && (
        <p className="px-6 pb-2 text-sm text-slate-400">
          Đang tải đơn MAVN từ danh sách đơn...
        </p>
      )}
      {error && <p className="px-6 pb-2 text-sm text-rose-300">{error}</p>}

      <div className="overflow-hidden">
        <div
          className="relative isolate overflow-auto"
          style={{
            maxHeight: 84 + DATA_ROW_HEIGHT * DATA_VISIBLE_ROWS + 54,
          }}
          key={`${viewMode}:${columnKeys}:${orders.length}`}
        >
          <table
            className="relative z-0 min-w-full table-fixed border-separate border-spacing-0 text-sm"
            style={{ width: tableMinWidth, minWidth: tableMinWidth }}
          >
            <colgroup>
              {FIXED_COLUMNS.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
              {periodColumns.map((column) => (
                <col key={column.key} style={{ width: periodColumnWidth }} />
              ))}
              <col style={{ width: REMAINING_COLUMN_WIDTH }} />
            </colgroup>

            <thead className="text-slate-100">
              <tr>
                {FIXED_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    rowSpan={2}
                    scope="col"
                    className={`sticky top-0 z-[80] border-b border-r border-indigo-300/25 bg-[#020617] px-3 py-4 text-left align-middle text-xs font-bold uppercase tracking-[0.08em] ${
                      column.key === LAST_FIXED_COLUMN_KEY
                        ? "shadow-[18px_0_30px_-24px_rgba(148,163,184,0.95)]"
                        : ""
                    }`}
                    style={{
                      left: column.left,
                      width: column.width,
                      minWidth: column.width,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
                <th
                  scope="col"
                  colSpan={periodColumns.length + 1}
                  className="sticky top-0 z-[10] border-b border-r border-indigo-300/25 bg-slate-950 px-3 py-3 text-center text-xs font-bold uppercase tracking-[0.1em]"
                >
                  {yearLabel}
                </th>
              </tr>
              <tr>
                {periodColumns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="sticky top-[45px] z-[10] border-b border-r border-indigo-300/25 bg-slate-950 px-3 py-3 text-center text-xs font-semibold"
                    style={{
                      width: periodColumnWidth,
                      minWidth: periodColumnWidth,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
                <th
                  scope="col"
                  className="sticky top-[45px] z-[10] border-b border-r border-indigo-300/25 bg-slate-950 px-3 py-3 text-center text-xs font-semibold"
                  style={{
                    width: REMAINING_COLUMN_WIDTH,
                    minWidth: REMAINING_COLUMN_WIDTH,
                  }}
                >
                  Còn lại
                </th>
              </tr>
            </thead>

            <tbody>
              {fixedDisplayRows.map((order) => (
                <tr
                  key={order.key}
                  className="group"
                  style={{ height: DATA_ROW_HEIGHT }}
                >
                  {FIXED_COLUMNS.map((column) => (
                    <td
                      key={column.key}
                      className={`sticky z-[60] border-b border-r border-indigo-300/15 bg-[#020617] px-2 py-2 transition-colors group-hover:bg-slate-900 focus-within:z-[75] ${
                        column.key === LAST_FIXED_COLUMN_KEY
                          ? "shadow-[18px_0_30px_-24px_rgba(148,163,184,0.8)]"
                          : ""
                      }`}
                      style={{
                        left: column.left,
                        width: column.width,
                        minWidth: column.width,
                      }}
                    >
                      <span className="block h-5 truncate px-1 text-sm font-semibold text-white">
                        {column.key === "orderCode" && order.orderCode}
                        {column.key === "productCode" && order.productCode}
                        {column.key === "term" && order.term}
                        {column.key === "startDate" && order.startDate}
                        {column.key === "amount" && formatMoney(order.totalCost)}
                        {column.key === "slot" && order.slotLabel}
                      </span>
                    </td>
                  ))}

                  {periodColumns.map((column) => {
                    const value = getCostPeriodAmount(order, column);
                    return (
                      <td
                        key={column.key}
                        className="relative z-0 border-b border-r border-indigo-300/15 bg-slate-950 px-3 py-2 text-right text-sm font-semibold text-cyan-100 transition-colors group-hover:bg-slate-900"
                        style={{
                          width: periodColumnWidth,
                          minWidth: periodColumnWidth,
                        }}
                      >
                        {value != null ? formatMoney(value) : ""}
                      </td>
                    );
                  })}

                  <td
                    className="relative z-0 border-b border-r border-indigo-300/15 bg-slate-950 px-3 py-2 text-right text-sm font-semibold text-emerald-200 transition-colors group-hover:bg-slate-900"
                    style={{
                      width: REMAINING_COLUMN_WIDTH,
                      minWidth: REMAINING_COLUMN_WIDTH,
                    }}
                  >
                    {remainderLabel(order, periodColumns)}
                  </td>
                </tr>
              ))}

              {!fixedDisplayRows.length && !loading && (
                <tr>
                  <td
                    className="border-b border-indigo-300/15 bg-[#020617] px-3 py-4 text-sm text-slate-400"
                    colSpan={FIXED_COLUMNS.length + periodColumns.length + 1}
                  >
                    Chưa có đơn MAVN trạng thái Đã Thanh Toán trong order_list.
                    Thêm đơn nhập hoặc kiểm tra trạng thái đơn.
                  </td>
                </tr>
              )}

              {fixedDisplayRows.length > 0 &&
                Array.from(
                  {
                    length: Math.max(0, DATA_VISIBLE_ROWS - fixedDisplayRows.length),
                  },
                  (_, idx) => (
                    <tr
                      key={`empty-${idx}`}
                      className="group"
                      style={{ height: DATA_ROW_HEIGHT }}
                    >
                      {FIXED_COLUMNS.map((column) => (
                        <td
                          key={column.key}
                          className="sticky z-[60] border-b border-r border-indigo-300/15 bg-[#020617] px-2 py-2 transition-colors group-hover:bg-slate-900"
                          style={{
                            left: column.left,
                            width: column.width,
                            minWidth: column.width,
                          }}
                        />
                      ))}
                      {periodColumns.map((column) => (
                        <td
                          key={column.key}
                          className="relative z-0 border-b border-r border-indigo-300/15 bg-slate-950 px-3 py-2"
                          style={{
                            width: periodColumnWidth,
                            minWidth: periodColumnWidth,
                          }}
                        />
                      ))}
                      <td
                        className="relative z-0 border-b border-r border-indigo-300/15 bg-slate-950 px-3 py-2"
                        style={{
                          width: REMAINING_COLUMN_WIDTH,
                          minWidth: REMAINING_COLUMN_WIDTH,
                        }}
                      />
                    </tr>
                  ),
                )}
            </tbody>

            <tfoot>
              <tr>
                {FIXED_COLUMNS.map((column, index) => (
                  <td
                    key={column.key}
                    className={`sticky bottom-0 z-[70] border-t border-r border-indigo-300/25 bg-[#020617] px-3 py-4 text-sm font-black text-white ${
                      column.key === LAST_FIXED_COLUMN_KEY
                        ? "shadow-[18px_0_30px_-24px_rgba(148,163,184,0.95)]"
                        : ""
                    }`}
                    style={{
                      left: column.left,
                      width: column.width,
                      minWidth: column.width,
                    }}
                  >
                    {index === 0 ? "Tổng cộng" : ""}
                    {column.key === "amount" &&
                      formatMoney(
                        fixedDisplayRows.reduce(
                          (sum, row) => sum + row.totalCost,
                          0,
                        ),
                      )}
                  </td>
                ))}

                {periodColumns.map((column) => {
                  const sumCol = fixedDisplayRows.reduce((sum, order) => {
                    const piece = getCostPeriodAmount(order, column);
                    return sum + (piece ?? 0);
                  }, 0);

                  return (
                    <td
                      key={column.key}
                      className="sticky bottom-0 z-[20] border-t border-r border-indigo-300/25 bg-slate-950 px-3 py-4 text-right text-sm font-black text-cyan-100"
                      style={{
                        width: periodColumnWidth,
                        minWidth: periodColumnWidth,
                      }}
                    >
                      {sumCol > 0 ? formatMoney(sumCol) : ""}
                    </td>
                  );
                })}

                <td className="sticky bottom-0 z-[20] border-t border-r border-indigo-300/25 bg-slate-950 px-3 py-4 text-right text-sm font-black text-emerald-200" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
};
