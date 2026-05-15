import { ORDER_COLS } from "@/lib/tableSql";

import type { PackageField, SlotLinkMode, StatusFilter } from "./types";

export const PACKAGE_FIELD_OPTIONS: Array<{ value: PackageField; label: string }> = [
  { value: "supplier", label: "Nhà cung cấp" },
  { value: "import", label: "Giá nhập (VND)" },
  { value: "activation", label: "Tài khoản kích hoạt" },
];

/** Dong bo co activation trong `fields` template voi DB (`productRequiresActivation`). */
export function syncActivationFieldInTemplateFields(
  fields: PackageField[],
  serverRequiresActivation: boolean
): PackageField[] {
  const set = new Set(fields);
  if (serverRequiresActivation) set.add("activation");
  else set.delete("activation");
  return PACKAGE_FIELD_OPTIONS.map((option) => option.value).filter((value) =>
    set.has(value)
  );
}

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

export const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "full", label: "Còn nhiều" },
  { value: "low", label: "Sắp hết" },
  { value: "out", label: "Đã hết" },
];

export const MATCH_COLUMN_INFORMATION = ORDER_COLS.informationOrder;
export const MATCH_COLUMN_SLOT = ORDER_COLS.slot;

export const SLOT_LINK_PREFS_KEY = "package_slot_link_prefs";
