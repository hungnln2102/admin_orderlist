export type LicenseStatus = "paid" | "active" | "expired" | "unknown";

export type AdobeAdminAccount = {
  id: number;
  email: string;
  password_enc: string;
  /** mail_backup.alias_prefix (OTP / Gmail +alias) */
  alias?: string | null;
  org_name: string | null;
  user_count: number;
  license_status: LicenseStatus;
  users_snapshot?: string | null;
  order_code?: string | null;
  last_checked?: string | null;
  url_access?: string | null;
};

export type SnapshotUser = {
  name: string | null;
  email: string;
  role?: string;
  access?: string | boolean;
  product?: boolean | string | number;
};
