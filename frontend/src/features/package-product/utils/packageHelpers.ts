import { ORDER_COLS } from "@/lib/tableSql";
import * as Helpers from "@/lib/helpers";

export type PackageField =
  | "supplier"
  | "import";
export type SlotLinkMode = "information" | "slot";
export type PackageRow = {
  id: number;
  productId?: number | null;
  package: string;
  information: string | null;
  informationUser?: string | null;
  informationPass?: string | null;
  informationMail?: string | null;
  informationTwoFa?: string | null;
  informationNote?: string | null;
  note: string | null;
  storageId?: number | null;
  storageTotal?: number | null;
  accountUser?: string | null;
  accountPass?: string | null;
  accountMail?: string | null;
  accountTwoFa?: string | null;
  accountNote?: string | null;
  supplier: string | null;
  import: number | string | null;
  expired: string | null;
  capacityUsed?: string | number | null;
  slot?: string | number | null;
  slotUsed?: string | number | null;
  slotLinkMode?: SlotLinkMode;
  hasCapacityField?: boolean;
  match?: string | null;
  productCodes?: string[] | null;
  normalizedProductCodes?: string[];
  matchModeValue?: string | null;
  stockId?: number | null;
};
export type OrderListItem = {
  id?: number | string | null;
  id_order?: string | number | null;
  id_product?: string | null;
  information_order?: string | null;
  slot?: string | null;
  customer?: string | null;
  [key: string]: unknown;
};
export type PackageSlotAssignment = {
  slotLabel: string;
  matchValue?: string | null;
  sourceOrderId?: number | string | null;
  sourceOrderCode?: string | number | null;
  sourceOrderStartYmd?: string | null;
  /** Giá trị cột thông tin đối nghĩa với chế độ match: hiển thị trên thẻ vị trí. */
  displayColumn: "slot" | "information";
  matchColumn: "slot" | "information";
  capacityUnits?: number | null;
  /** Tên/định danh khách từ đơn (customer) khi đã gắn. */
  customerLabel?: string | null;
};
export type AugmentedRow = PackageRow & {
  slotUsed: number;
  slotLimit: number;
  remainingSlots: number;
  capacityLimit: number;
  capacityUsed: number;
  remainingCapacity: number;
  slotAssignments: PackageSlotAssignment[];
  matchedOrders: OrderListItem[];
  packageCode: string;
  hasCapacityField: boolean;
  productCodes: string[];
  normalizedProductCodes: string[];
  matchModeValue?: string | null;
};
export type NormalizedOrderRecord = {
  base: OrderListItem;
  productKey: string;
  productLettersKey: string;
  infoKey: string;
  infoLettersKey: string;
  slotDisplay: string;
  slotKey: string;
  slotMatchKey: string;
  informationDisplay: string;
  informationKey: string;
  informationMatchKey: string;
  customerDisplay: string;
  productCodeNormalized: string;
  registrationDateYmd?: string | null;
  /** product.id từ variant; khớp với packageRow.productId để gán đơn cùng dòng sản phẩm. */
  lineProductId: number | null;
};
export type PackageTemplate = {
  name: string;
  productId?: number | null;
  fields: PackageField[];
  isCustom?: boolean;
};
export type ManualWarehouseEntry = {
  product_type: string;
  account: string;
  password: string;
  backup_email: string;
  two_fa: string;
  note: string;
  /** DD/MM/YYYY — lưu vào kho `expires_at`, hiển thị trên gói */
  expires_at: string;
};

export const EMPTY_MANUAL_ENTRY: ManualWarehouseEntry = {
  product_type: "",
  account: "",
  password: "",
  backup_email: "",
  two_fa: "",
  note: "",
  expires_at: "",
};

export type PackageFormValues = {
  supplier: string;
  import: string;
  slot: string;
  slotLinkMode: SlotLinkMode;
  stockId: number | null;
  storageId: number | null;
  storageTotal: string;
  manualStock: ManualWarehouseEntry;
  manualStorage: ManualWarehouseEntry;
};
export type AccountInfo = {
  account?: string | null;
  password?: string | null;
  backup_email?: string | null;
  two_fa?: string | null;
  note?: string | null;
  expires_at?: string | null;
};

export type EditContext = {
  rowId: number;
  template: PackageTemplate;
  initialValues: PackageFormValues;
  stockInfo?: AccountInfo | null;
  storageInfo?: AccountInfo | null;
};
export type AvailabilityState = "ok" | "low" | "out";
export type SlotLinkPreferenceMap = Record<string, SlotLinkMode>;

export const EMPTY_FORM_VALUES: PackageFormValues = {
  supplier: "",
  import: "",
  slot: "",
  slotLinkMode: "information",
  stockId: null,
  storageId: null,
  storageTotal: "",
  manualStock: { ...EMPTY_MANUAL_ENTRY },
  manualStorage: { ...EMPTY_MANUAL_ENTRY },
};

export const PACKAGE_FIELD_OPTIONS: Array<{ value: PackageField; label: string }> =
  [
    { value: "supplier", label: "Nhà cung cấp" },
    { value: "import", label: "Giá nhập (VND)" },
  ];

export const DEFAULT_SLOT_LIMIT = 5;
export const DEFAULT_CAPACITY_LIMIT = 2000;
export const DEFAULT_SLOT_CAPACITY_UNIT = 100;
export const LOW_THRESHOLD_RATIO = 0.2;
export const LOW_SLOT_THRESHOLD = 2;

export const SLOT_LINK_OPTIONS: Array<{
  value: SlotLinkMode;
  label: string;
  helper: string;
}> = [
  {
    value: "information",
    label: "Liên kết theo thông tin đơn hàng",
    helper:
      "So cột information_order với username kho lưu trữ (kích hoạt) hoặc kho gói chính (cùng cột «Thông tin gói»); nhãn vị trí lấy từ cột slot trên đơn.",
  },
  {
    value: "slot",
    label: "Liên kết theo vị trí",
    helper:
      "So username tài khoản gốc (kho chính) với cột slot trên đơn; nội dung hiển thị bổ sung từ information_order khi cần.",
  },
];

export type StatusFilter = "all" | "full" | "low" | "out";

export const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "full", label: "Còn nhiều" },
  { value: "low", label: "Sắp hết" },
  { value: "out", label: "Đã hết" },
];

export const MATCH_COLUMN_INFORMATION = ORDER_COLS.informationOrder;
export const MATCH_COLUMN_SLOT = ORDER_COLS.slot;

export const SLOT_LINK_PREFS_KEY = "package_slot_link_prefs";

export const getCapacityAvailabilityState = (
  remaining: number,
  limit: number
): AvailabilityState => {
  if (limit <= 0) return "out";
  if (remaining <= 0) return "out";
  const ratio = remaining / limit;
  return ratio <= LOW_THRESHOLD_RATIO ? "low" : "ok";
};

export const getSlotAvailabilityState = (remaining: number): AvailabilityState => {
  if (remaining <= 0) return "out";
  if (remaining < LOW_SLOT_THRESHOLD) return "low";
  return "ok";
};

export const normalizeIdentifier = (value: string | null | undefined): string => {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
};

export const buildIdentifierKeys = (value: string | null | undefined) => {
  const normalized = normalizeIdentifier(value);
  return {
    normalized,
    lettersOnly: normalized.replace(/[0-9]/g, ""),
  };
};

export const toCleanString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  return str.trim();
};

export const formatDisplayDate = (value?: string | null): string => {
  const normalized = Helpers.formatDateToDMY(value ?? "");
  if (normalized) return normalized;

  const trimmed = (value || "").trim();
  if (!trimmed) return "";

  // Accept flexible D/M/YYYY (with or without leading zero) and normalize.
  const looseMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (looseMatch) {
    const [, d, m, y] = looseMatch;
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }

  return trimmed;
};

export const normalizeSlotKey = (value: unknown): string => {
  const cleaned = toCleanString(value);
  return cleaned ? cleaned.replace(/\s+/g, " ").trim().toLowerCase() : "";
};

export const normalizeMatchKey = (value: string | null | undefined): string => {
  const trimmed = toCleanString(value);
  return trimmed ? trimmed.toLowerCase().replace(/\s+/g, "") : "";
};

/**
 * Một chuỗi duy nhất tùy chế độ ghép:
 * - `slot` (theo vị trí): **tài khoản gốc** `informationUser` ↔ cột `slot` trên đơn.
 * - `information` (theo thông tin đơn): cột `information_order` trên đơn so với tài khoản kho lưu trữ
 *   `accountUser` (nếu có) **và** tài khoản kho gói chính `informationUser` (cùng cột «Thông tin gói» trên bảng).
 *   Cả hai nguồn để tránh mất match khi chỉ một trong hai dòng kho có username.
 */
export const buildPackageLinkKeys = (
  row: PackageRow,
  mode: SlotLinkMode = "information"
): string[] => {
  if (mode === "slot") {
    const n = normalizeMatchKey(row.informationUser);
    return n ? [n] : [];
  }
  const keys = new Set<string>();
  const a = normalizeMatchKey(row.accountUser);
  const u = normalizeMatchKey(row.informationUser);
  if (a) keys.add(a);
  if (u) keys.add(u);
  return Array.from(keys);
};

export const resolveOrderDisplayValue = (
  record: NormalizedOrderRecord,
  column: "slot" | "information"
): string => {
  if (column === "slot") {
    return (
      record.slotDisplay ||
      record.customerDisplay ||
      record.informationDisplay ||
      ""
    );
  }
  return (
    record.informationDisplay ||
    record.customerDisplay ||
    record.slotDisplay ||
    ""
  );
};

export const buildSlotLabelVariants = (
  record: NormalizedOrderRecord,
  displayColumn: "slot" | "information",
  fallbackLabel: string
): string[] => {
  const cleanedFallback = toCleanString(fallbackLabel);
  if (displayColumn !== "slot") {
    return cleanedFallback ? [cleanedFallback] : [];
  }
  const rawSlotText = record.slotDisplay ?? "";
  const slotPieces = rawSlotText
    .split("|")
    .map((piece) => toCleanString(piece))
    .filter(Boolean);
  if (slotPieces.length >= 1) {
    return slotPieces;
  }
  const customerLabel = toCleanString(record.customerDisplay);
  if (customerLabel) {
    return [customerLabel, `${customerLabel} (2)`];
  }
  return cleanedFallback ? [cleanedFallback] : [];
};

const extractDigitsValue = (text: string | null | undefined): number | null => {
  if (!text) return null;
  const match = text.match(/(\d{2,4})/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

export const extractCapacityUnitsFromOrder = (
  packageCode: string,
  record: NormalizedOrderRecord
): number | null => {
  const normalizedProduct = record.productKey;
  let remainder = normalizedProduct;
  if (packageCode) {
    const idx = remainder.indexOf(packageCode);
    if (idx >= 0) {
      remainder = remainder.slice(idx + packageCode.length);
    }
  }
  const normalizedValue = extractDigitsValue(remainder);
  if (normalizedValue) return normalizedValue;
  const fallbackNormalized = normalizeIdentifier(record.base?.id_product ?? "");
  return extractDigitsValue(fallbackNormalized);
};

export const formatCapacityLabel = (units?: number | null): string => {
  const value =
    units && Number.isFinite(units) && units > 0
      ? Math.round(units)
      : DEFAULT_SLOT_CAPACITY_UNIT;
  return `${value} GB`;
};

/** Giá trị cột `match` trên DB: `slot` | `information_order` (bỏ qua hoa thường, khoảng trắng). */
export const normalizeMatchModeDbValue = (value?: string | null): string | null => {
  const s = (value == null ? "" : String(value)).trim().toLowerCase();
  if (!s) return null;
  if (s === "slot") return MATCH_COLUMN_SLOT;
  if (s === "information_order" || s === "informationorder" || s === "information")
    return MATCH_COLUMN_INFORMATION;
  return s;
};

export const toSlotLinkModeFromMatch = (value?: string | null): SlotLinkMode => {
  const n = normalizeMatchModeDbValue(value);
  if (n === MATCH_COLUMN_SLOT) return "slot";
  return "information";
};

export const toMatchColumnValue = (mode: SlotLinkMode): string =>
  mode === "slot" ? MATCH_COLUMN_SLOT : MATCH_COLUMN_INFORMATION;

export const normalizeProductCodeValue = (value?: string | null): string => {
  return normalizeIdentifier(value);
};

export const parseNumericValue = (input: unknown): number | null => {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }
  if (typeof input === "string") {
    const cleaned = input.replace(/[^0-9]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const toInputString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
};

export const buildInformationSummary = (
  user?: string | null,
  pass?: string | null,
  mail?: string | null
): string => {
  return (
    [
      user && `Tài khoản: ${user}`,
      pass && `Mật khẩu: ${pass}`,
      mail && `Mail 2FA: ${mail}`,
    ]
      .filter(Boolean)
      .join(" | ") || ""
  );
};

export const buildFormValuesFromRow = (
  row: PackageRow | AugmentedRow
): PackageFormValues => {
  const slotValue =
    "slotLimit" in row && typeof row.slotLimit === "number"
      ? String(row.slotLimit)
      : toInputString(row.slot);
  return {
    supplier: row.supplier ?? "",
    import: toInputString(row.import),
    slot: slotValue,
    slotLinkMode: row.slotLinkMode ?? "information",
    stockId: row.stockId ?? null,
    storageId: row.storageId ?? null,
    storageTotal: row.storageTotal != null ? String(row.storageTotal) : "",
    manualStock: { ...EMPTY_MANUAL_ENTRY },
    manualStorage: { ...EMPTY_MANUAL_ENTRY },
  };
};

export const readSlotLinkPrefs = (): SlotLinkPreferenceMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SLOT_LINK_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
};

export const writeSlotLinkPrefs = (prefs: SlotLinkPreferenceMap) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SLOT_LINK_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
};

export const enhancePackageRow = (
  row: PackageRow,
  slotLinkPrefs: SlotLinkPreferenceMap
) => {
  const normalizedHasCapacity =
    row.hasCapacityField === undefined
      ? row.storageId != null || row.storageTotal != null
      : Boolean(row.hasCapacityField);
  const rRow = row as Record<string, unknown>;
  const matchRaw =
    row.match ?? row.matchModeValue ?? (rRow.package_match as string | null | undefined) ?? null;
  const matchValue =
    matchRaw != null ? normalizeMatchModeDbValue(String(matchRaw)) : null;
  const prefKey =
    row.id !== undefined && row.id !== null
      ? slotLinkPrefs[String(row.id)]
      : undefined;
  const slotLinkMode: SlotLinkMode =
    matchRaw != null && String(matchRaw).trim() !== ""
      ? toSlotLinkModeFromMatch(matchRaw)
      : (row.slotLinkMode as SlotLinkMode | undefined) ??
        (prefKey === "slot" ? "slot" : "information");
  const rawProductId = rRow.productId ?? rRow.product_id;
  const resolvedProductId =
    rawProductId != null && String(rawProductId).trim() !== "" && Number.isFinite(Number(rawProductId))
      ? Number(rawProductId)
      : row.productId ?? null;
  const productCodes = Array.isArray(row.productCodes)
    ? row.productCodes
        .map((code) => (typeof code === "string" ? code.trim() : ""))
        .filter((code) => Boolean(code))
    : [];
  const normalizedProductCodes = Array.from(
    new Set(
      productCodes.map((code) => normalizeProductCodeValue(code)).filter(Boolean)
    )
  );
  return {
    ...row,
    match: matchValue ?? row.match ?? (rRow.package_match as string | null) ?? null,
    productId: resolvedProductId,
    slot: row.slot ?? DEFAULT_SLOT_LIMIT,
    slotUsed: row.slotUsed ?? 0,
    hasCapacityField: normalizedHasCapacity,
    slotLinkMode,
    matchModeValue: matchValue ?? (matchRaw != null ? String(matchRaw).trim() || null : null),
    productCodes,
    normalizedProductCodes,
  } as PackageRow;
};
