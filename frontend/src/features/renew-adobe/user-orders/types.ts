import type { LicenseStatus } from "../types";

export type DisplayStatus = LicenseStatus | "no_product";

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
