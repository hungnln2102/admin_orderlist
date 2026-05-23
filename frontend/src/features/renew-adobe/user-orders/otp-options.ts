/**
 * Đồng bộ với `backend/src/services/otpProviderService.js` (OTP_SOURCES).
 */

import type { OtpSource } from "../types";

export type OtpSourceOption = {
  code: OtpSource;
  label: string;
  badge: string;
};

export const OTP_SOURCE_OPTIONS: ReadonlyArray<OtpSourceOption> = [
  {
    code: "imap",
    label: "IMAP",
    badge: "bg-slate-500/20 text-slate-200 border-slate-400/35",
  },
  {
    code: "tinyhost",
    label: "TinyHost",
    badge: "bg-indigo-500/15 text-indigo-300 border-indigo-400/40",
  },
  {
    code: "hdsd",
    label: "otp.hdsd.net",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-400/40",
  },
  {
    code: "ades",
    label: "OTP Ades",
    badge: "bg-violet-500/15 text-violet-300 border-violet-400/40",
  },
];

export const DEFAULT_OTP_SOURCE: OtpSource = "imap";

export function isOtpSource(value: unknown): value is OtpSource {
  return OTP_SOURCE_OPTIONS.some((opt) => opt.code === value);
}

export function getOtpSourceOption(
  value: string | null | undefined
): OtpSourceOption {
  const code = String(value || "").trim().toLowerCase();
  return (
    OTP_SOURCE_OPTIONS.find((opt) => opt.code === code) || OTP_SOURCE_OPTIONS[0]
  );
}
