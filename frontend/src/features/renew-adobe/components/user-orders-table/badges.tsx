import { getAdobeSystemOption } from "@/features/renew-adobe/user-orders/system-options";
import type { DisplayStatus } from "@/features/renew-adobe/user-orders/types";
import { DISPLAY_LABELS } from "./constants";

export function SystemBadge({ code }: { code: string | null | undefined }) {
  const opt = getAdobeSystemOption(code);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${opt.badge}`}
    >
      {opt.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const label = DISPLAY_LABELS[status];
  const colorClasses =
    status === "paid" || status === "active"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/40"
      : status === "expired"
        ? "bg-rose-500/15 text-rose-300 border-rose-400/40"
      : status === "no_product"
        ? "bg-amber-500/15 text-amber-300 border-amber-400/40"
      : status === "not_added"
        ? "bg-slate-500/20 text-slate-300 border-slate-400/35"
        : "bg-amber-500/15 text-amber-300 border-amber-400/40";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${colorClasses}`}
    >
      {label}
    </span>
  );
}
