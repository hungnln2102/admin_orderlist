/**
 * Danh mục Provider Cổng OTP cho Dịch Vụ Kho Hàng (warehouse.account_slots)
 * Đồng bộ chuẩn hóa với backend registry (system_automation.product_api_configs)
 */

export interface OtpProviderOption {
  value: string;
  label: string;
  shortLabel: string;
  badgeClass: string;
  category: "OTP" | "2FA" | "TOOL" | "EMAIL";
}

export const AVAILABLE_OTP_PROVIDERS: OtpProviderOption[] = [
  {
    value: "tinyhost",
    label: "TinyHost OTP (tinyhost)",
    shortLabel: "TinyHost",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    category: "OTP",
  },
  {
    value: "ades",
    label: "Ades OTP (ades)",
    shortLabel: "Ades",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    category: "OTP",
  },
  {
    value: "fix_ades_status",
    label: "Fix Ades Status (fix_ades_status)",
    shortLabel: "Fix Ades",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    category: "TOOL",
  },
  {
    value: "yuna_mail",
    label: "Yuna Mail (yuna_mail)",
    shortLabel: "Yuna Mail",
    badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    category: "EMAIL",
  },
  {
    value: "yuna_2fa",
    label: "Yuna 2FA (yuna_2fa)",
    shortLabel: "Yuna 2FA",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    category: "2FA",
  },
  {
    value: "vivarocky_household",
    label: "VivaRocky Household (vivarocky_household)",
    shortLabel: "VivaRocky HH",
    badgeClass: "bg-red-500/15 text-red-300 border-red-500/30",
    category: "OTP",
  },
  {
    value: "vivarocky_six_digit",
    label: "VivaRocky 6-Digit (vivarocky_six_digit)",
    shortLabel: "VivaRocky 6D",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    category: "OTP",
  },
  {
    value: "vivarocky_signin",
    label: "VivaRocky Sign-in (vivarocky_signin)",
    shortLabel: "VivaRocky Signin",
    badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    category: "OTP",
  },
  {
    value: "totp",
    label: "TOTP Tự Sinh (totp)",
    shortLabel: "TOTP",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    category: "2FA",
  },
  {
    value: "warehouse_2fa",
    label: "Kho 2FA Nội Bộ (warehouse_2fa)",
    shortLabel: "Kho 2FA",
    badgeClass: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    category: "2FA",
  },
  {
    value: "imap",
    label: "Hòm Thư IMAP (imap)",
    shortLabel: "IMAP",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    category: "EMAIL",
  },
];

export const getProviderDetails = (key?: string | null): OtpProviderOption | null => {
  if (!key) return null;
  const clean = String(key).trim().toLowerCase();
  return AVAILABLE_OTP_PROVIDERS.find((p) => p.value.toLowerCase() === clean) || null;
};
