import { DEFAULT_SLOT_LIMIT } from "./constants";
import {
  normalizeMatchModeDbValue,
  normalizeProductCodeValue,
  toSlotLinkModeFromMatch,
} from "./matching";
import type { PackageRow, SlotLinkMode, SlotLinkPreferenceMap } from "./types";

export const enhancePackageRow = (
  row: PackageRow,
  slotLinkPrefs: SlotLinkPreferenceMap
): PackageRow => {
  const normalizedHasCapacity =
    row.hasCapacityField === undefined
      ? row.storageId != null || row.storageTotal != null
      : Boolean(row.hasCapacityField);

  const rowRecord = row as Record<string, unknown>;
  const matchRaw =
    row.match ??
    row.matchModeValue ??
    (rowRecord.package_match as string | null | undefined) ??
    null;
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

  const rawProductId = rowRecord.productId ?? rowRecord.product_id;
  const resolvedProductId =
    rawProductId != null &&
    String(rawProductId).trim() !== "" &&
    Number.isFinite(Number(rawProductId))
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
    match: matchValue ?? row.match ?? (rowRecord.package_match as string | null) ?? null,
    productId: resolvedProductId,
    slot: row.slot ?? DEFAULT_SLOT_LIMIT,
    slotUsed: row.slotUsed ?? 0,
    hasCapacityField: normalizedHasCapacity,
    slotLinkMode,
    matchModeValue: matchValue ?? (matchRaw != null ? String(matchRaw).trim() || null : null),
    productCodes,
    normalizedProductCodes,
  };
};
