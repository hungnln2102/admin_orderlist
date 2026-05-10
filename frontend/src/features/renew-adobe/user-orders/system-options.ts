/**
 * Đồng bộ với `backend/src/services/renew-adobe/adobeSystemConstants.js`.
 * Khi thêm hệ thống mới: bổ sung `code` ở đây + cùng list ở backend.
 */

export type AdobeSystemCode = "renew_adobe" | "fix_adobe_edu" | "fix_ades";

export type AdobeSystemOption = {
  code: AdobeSystemCode;
  label: string;
  /** className hiển thị badge */
  badge: string;
};

export const ADOBE_SYSTEM_OPTIONS: ReadonlyArray<AdobeSystemOption> = [
  {
    code: "renew_adobe",
    label: "Renew Adobe",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
  },
  {
    code: "fix_adobe_edu",
    label: "Fix Adobe EDU",
    badge: "bg-sky-500/15 text-sky-300 border-sky-400/40",
  },
  {
    code: "fix_ades",
    label: "Fix Ades",
    badge: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/40",
  },
];

export const DEFAULT_ADOBE_SYSTEM_CODE: AdobeSystemCode = "renew_adobe";

export function isAdobeSystemCode(value: unknown): value is AdobeSystemCode {
  return ADOBE_SYSTEM_OPTIONS.some((opt) => opt.code === value);
}

export function getAdobeSystemOption(
  value: string | null | undefined
): AdobeSystemOption {
  const code = String(value || "").trim().toLowerCase();
  return (
    ADOBE_SYSTEM_OPTIONS.find((opt) => opt.code === code) ||
    ADOBE_SYSTEM_OPTIONS[0]
  );
}
