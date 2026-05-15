import {
  DEFAULT_SLOT_CAPACITY_UNIT,
  MATCH_COLUMN_INFORMATION,
  MATCH_COLUMN_SLOT,
} from "./constants";
import { normalizeIdentifier, normalizeMatchKey, toCleanString } from "./normalizers";
import type { NormalizedOrderRecord, PackageRow, SlotLinkMode } from "./types";

/**
 * Mot chuoi duy nhat tuy che do ghep:
 * - `slot` (theo vi tri): tai khoan goc `informationUser` <-> cot `slot` tren don.
 * - `information` (theo thong tin don): cot `information_order` tren don so voi tai khoan
 *   kho luu tru `accountUser` (neu co) va tai khoan kho goi chinh `informationUser`.
 */
export const buildPackageLinkKeys = (
  row: PackageRow,
  mode: SlotLinkMode = "information"
): string[] => {
  if (mode === "slot") {
    const normalized = normalizeMatchKey(row.informationUser);
    return normalized ? [normalized] : [];
  }

  const keys = new Set<string>();
  const accountKey = normalizeMatchKey(row.accountUser);
  const infoKey = normalizeMatchKey(row.informationUser);
  if (accountKey) keys.add(accountKey);
  if (infoKey) keys.add(infoKey);
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

/** Gia tri cot `match` tren DB: `slot` | `information_order` (bo qua hoa thuong, khoang trang). */
export const normalizeMatchModeDbValue = (value?: string | null): string | null => {
  const normalized = (value == null ? "" : String(value)).trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "slot") return MATCH_COLUMN_SLOT;
  if (
    normalized === "information_order" ||
    normalized === "informationorder" ||
    normalized === "information"
  ) {
    return MATCH_COLUMN_INFORMATION;
  }
  return normalized;
};

export const toSlotLinkModeFromMatch = (value?: string | null): SlotLinkMode => {
  const normalized = normalizeMatchModeDbValue(value);
  if (normalized === MATCH_COLUMN_SLOT) return "slot";
  return "information";
};

export const toMatchColumnValue = (mode: SlotLinkMode): string =>
  mode === "slot" ? MATCH_COLUMN_SLOT : MATCH_COLUMN_INFORMATION;
