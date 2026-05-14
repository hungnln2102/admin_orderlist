import type { LicenseStatus } from "@/features/renew-adobe/types";
import type { DisplayStatus } from "@/features/renew-adobe/user-orders/types";

export const STATUS_LABELS: Record<LicenseStatus, string> = {
  paid: "Còn gói",
  active: "Còn gói",
  expired: "Hết gói",
  unknown: "Chờ gia hạn",
};

/** no_product = chưa cấp quyền Adobe; not_added = chưa gán admin */
export const DISPLAY_LABELS: Record<DisplayStatus, string> = {
  ...STATUS_LABELS,
  no_product: "Chưa cấp quyền",
  not_added: "Chưa add",
};

export const PAGE_SIZE = 10;
