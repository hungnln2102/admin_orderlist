import { EMPTY_MANUAL_ENTRY } from "./defaults";
import { toInputString } from "./normalizers";
import type { AugmentedRow, PackageFormValues, PackageRow } from "./types";

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
