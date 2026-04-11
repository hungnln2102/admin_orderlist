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

  const aliasRaw = row.alias;
  const rawOtpSource = String(row.otp_source ?? "imap").trim().toLowerCase();
  const otpSource: "imap" | "tinyhost" | "hdsd" =
    rawOtpSource === "tinyhost" || rawOtpSource === "hdsd"
      ? rawOtpSource
      : "imap";
  return {
    id: Number(row.id) || 0,
    email: String(row.email ?? ""),
    password_encrypted: String(row.password_encrypted ?? row.password_enc ?? ""),
    otp_source: otpSource,
    alias:
      aliasRaw != null && String(aliasRaw).trim() !== ""
        ? String(aliasRaw).trim()
        : null,
    org_name: row.org_name != null ? String(row.org_name) : null,
    user_count: Number(row.user_count) ?? 0,
    license_status: licenseStatus,
    users_snapshot:
      row.users_snapshot != null ? String(row.users_snapshot) : null,
    order_code: row.order_code != null ? String(row.order_code) : null,
    last_checked_at: row.last_checked_at != null ? String(row.last_checked_at) : null,
    access_url: row.access_url != null ? String(row.access_url) : null,
  };
}
