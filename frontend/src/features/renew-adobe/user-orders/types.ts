import type { LicenseStatus } from "../types";

/** not_added = email chưa có trong users_snapshot; no_product = đã add nhưng chưa gán product Adobe */
export type DisplayStatus = LicenseStatus | "no_product" | "not_added";

export type UserOrderRow = {
  id: string;
  order_code: string;
  customer_name: string;
  email: string;
  profile: string;
  display_status: DisplayStatus;
  expiry: string;
  accountId: number;
};

export type OrderInfo = {
  order_code: string;
  information_order: string;
  customer: string;
  contact: string;
  expiry_date: string | null;
  status: string;
};
