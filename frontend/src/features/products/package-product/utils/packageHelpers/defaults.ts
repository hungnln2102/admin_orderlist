import type { ManualWarehouseEntry, PackageFormValues } from "./types";

export const EMPTY_MANUAL_ENTRY: ManualWarehouseEntry = {
  product_type: "",
  account: "",
  password: "",
  backup_email: "",
  two_fa: "",
  note: "",
  expires_at: "",
};

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
