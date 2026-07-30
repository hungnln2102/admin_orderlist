import { getAdobeSystemOption } from "@/features/renew-adobe/user-orders/system-options";
import { getTrackingOtpSourceOption } from "@/features/renew-adobe/user-orders/otp-options";
import type { DisplayStatus } from "@/features/renew-adobe/user-orders/types";
import { DISPLAY_LABELS } from "./constants";

export function SystemBadge({ code }: { code: string | null | undefined }) {
  const opt = getAdobeSystemOption(code);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-xl border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${opt.badge}`}
    >
      {opt.label}
    </span>
  );
}

export function OtpSourceBadge({ code }: { code: string | null | undefined }) {
  const opt = getTrackingOtpSourceOption(code);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-xl border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${opt.badge}`}
    >
      {opt.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const label = DISPLAY_LABELS[status];
  const colorClasses =
    status === "paid" || status === "active"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
      : status === "expired"
        ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
      : status === "no_product"
        ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
      : status === "not_added"
        ? "bg-slate-500/10 text-slate-300 border-slate-500/30"
        : "bg-amber-500/10 text-amber-300 border-amber-500/30";

  const dotClasses =
    status === "paid" || status === "active"
      ? "bg-emerald-400"
      : status === "expired"
        ? "bg-rose-400"
      : status === "no_product"
        ? "bg-amber-400"
      : status === "not_added"
        ? "bg-slate-400"
        : "bg-amber-400";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${colorClasses}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClasses}`}></span>
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotClasses}`}></span>
      </span>
      {label}
    </span>
  );
}
