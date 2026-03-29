import type { AdobeAdminAccount, LicenseStatus } from "../types";

export function maskPassword(_raw: string): string {
  return "••••••••";
}

export function hasNoAccountInfo(account: AdobeAdminAccount): boolean {
  const orgName = (account.org_name ?? "").toString().trim();
  return orgName === "" || orgName === "—" || orgName === "-";
}

export function normalizeAdobeAdminAccount(
  row: Record<string, unknown>
): AdobeAdminAccount {
  const status = String(row.license_status ?? "unknown").toLowerCase();
  const licenseStatus: LicenseStatus =
    status === "paid"
      ? "paid"
      : status === "active"
        ? "active"
        : status === "expired"
          ? "expired"
          : "unknown";

  return {
    id: Number(row.id) || 0,
    email: String(row.email ?? ""),
    password_enc: String(row.password_enc ?? ""),
    org_name: row.org_name != null ? String(row.org_name) : null,
    user_count: Number(row.user_count) ?? 0,
    license_status: licenseStatus,
    users_snapshot:
      row.users_snapshot != null ? String(row.users_snapshot) : null,
    order_code: row.order_code != null ? String(row.order_code) : null,
    last_checked: row.last_checked != null ? String(row.last_checked) : null,
    url_access: row.url_access != null ? String(row.url_access) : null,
  };
}
