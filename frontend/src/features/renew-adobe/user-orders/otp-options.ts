/**
 * Nguồn OTP cho `order_user_tracking` — gồm `none` (mail chính chủ, khách tự lấy OTP).
 */

import type { TrackingOtpSource } from "./types";

export type TrackingOtpSourceOption = {
  code: TrackingOtpSource;
  label: string;
  badge: string;
};

export const TRACKING_OTP_SOURCE_OPTIONS: ReadonlyArray<TrackingOtpSourceOption> = [
  {
    code: "none",
    label: "Không cần OTP",
    badge: "bg-slate-600/20 text-slate-300 border-slate-500/30",
  },
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

export const DEFAULT_TRACKING_OTP_SOURCE: TrackingOtpSource = "imap";

export function isTrackingOtpSource(value: unknown): value is TrackingOtpSource {
  return TRACKING_OTP_SOURCE_OPTIONS.some((opt) => opt.code === value);
}

export function getTrackingOtpSourceOption(
  value: string | null | undefined
): TrackingOtpSourceOption {
  const code = String(value || "").trim().toLowerCase();
  return (
    TRACKING_OTP_SOURCE_OPTIONS.find((opt) => opt.code === code) ||
    TRACKING_OTP_SOURCE_OPTIONS.find((opt) => opt.code === "imap")!
  );
}
