import type {
  AccountInfo,
  ManualWarehouseEntry,
} from "../../../utils/packageHelpers";
import { formatDisplayDate } from "../../../utils/packageHelpers";
import type { WarehouseItem } from "../../../../../Personal/Storage/types";

export const labelCls =
  "block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5";

export const inputCls =
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all";

export const manualFieldCls =
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all";

export const MANUAL_FIELDS: Array<{
  key: keyof ManualWarehouseEntry;
  label: string;
  placeholder: string;
}> = [
  {
    key: "product_type",
    label: "Loại sản phẩm",
    placeholder: "VD: Google Drive, Netflix, Adobe...",
  },
  {
    key: "account",
    label: "Tài khoản",
    placeholder: "Email hoặc username...",
  },
  {
    key: "password",
    label: "Mật khẩu",
    placeholder: "Mật khẩu tài khoản...",
  },
  {
    key: "backup_email",
    label: "Email dự phòng",
    placeholder: "Email khôi phục...",
  },
  {
    key: "two_fa",
    label: "Mã 2FA",
    placeholder: "Mã xác thực hai lớp...",
  },
  {
    key: "note",
    label: "Ghi chú",
    placeholder: "Ghi chú thêm...",
  },
  {
    key: "expires_at",
    label: "Ngày hết hạn",
    placeholder: "DD/MM/YYYY (tuỳ chọn)",
  },
];

export type EditableWarehouseFields = {
  account: string;
  password: string;
  backup_email: string;
  two_fa: string;
  note: string;
  expires_at: string;
};

type InfoEntry = {
  key: keyof EditableWarehouseFields;
  label: string;
  value?: string | null;
  placeholder: string;
};

export type AccountDisplayInfo = AccountInfo & { expires_at?: string | null };

const INLINE_EDIT_FIELDS: Array<{
  key: keyof EditableWarehouseFields;
  label: string;
  placeholder: string;
}> = [
  {
    key: "account",
    label: "Tài khoản",
    placeholder: "Email hoặc username...",
  },
  {
    key: "password",
    label: "Mật khẩu",
    placeholder: "Mật khẩu tài khoản...",
  },
  {
    key: "backup_email",
    label: "Email dự phòng",
    placeholder: "Email khôi phục...",
  },
  {
    key: "two_fa",
    label: "Mã 2FA",
    placeholder: "Mã xác thực hai lớp...",
  },
  {
    key: "note",
    label: "Ghi chú",
    placeholder: "Ghi chú thêm...",
  },
  {
    key: "expires_at",
    label: "Ngày hết hạn",
    placeholder: "DD/MM/YYYY",
  },
];

export const normalizeWarehouseId = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const buildInfoEntries = (
  item: WarehouseItem | AccountDisplayInfo
): InfoEntry[] => {
  return INLINE_EDIT_FIELDS.map((field) => {
    if (field.key === "expires_at") {
      const expiryValue =
        (item as WarehouseItem).expires_at ??
        (item as AccountDisplayInfo).expires_at ??
        null;
      return {
        key: field.key,
        label: field.label,
        placeholder: field.placeholder,
        value: formatDisplayDate(expiryValue),
      };
    }
    return {
      key: field.key,
      label: field.label,
      placeholder: field.placeholder,
      value:
        ((item as WarehouseItem)[field.key] as string | null | undefined) ??
        ((item as AccountDisplayInfo)[field.key] as string | null | undefined) ??
        "",
    };
  });
};

export const toEditableWarehouseFields = (
  item: WarehouseItem | AccountInfo | null | undefined
): EditableWarehouseFields => ({
  account: item?.account ? String(item.account) : "",
  password: item?.password ? String(item.password) : "",
  backup_email: item?.backup_email ? String(item.backup_email) : "",
  two_fa: item?.two_fa ? String(item.two_fa) : "",
  note: item?.note ? String(item.note) : "",
  expires_at: formatDisplayDate(
    (item as WarehouseItem | null | undefined)?.expires_at ?? null
  ),
});

export const mergeDisplayInfo = (
  selectedItem: WarehouseItem | null,
  fallbackInfo?: AccountInfo | null
): (WarehouseItem & AccountDisplayInfo) | AccountDisplayInfo | null => {
  if (!selectedItem && !fallbackInfo) return null;
  if (!selectedItem) return fallbackInfo ?? null;
  if (!fallbackInfo) return selectedItem;

  return {
    ...fallbackInfo,
    ...selectedItem,
    account: selectedItem.account ?? fallbackInfo.account ?? null,
    password: selectedItem.password ?? fallbackInfo.password ?? null,
    backup_email: selectedItem.backup_email ?? fallbackInfo.backup_email ?? null,
    two_fa: selectedItem.two_fa ?? fallbackInfo.two_fa ?? null,
    note: selectedItem.note ?? fallbackInfo.note ?? null,
    expires_at: selectedItem.expires_at ?? fallbackInfo.expires_at ?? null,
  };
};
