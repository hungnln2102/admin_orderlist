import { hasNoAccountInfo } from "../utils/accountUtils";
import type { AdobeAdminAccount, LicenseStatus } from "../types";

const STATUS_LABELS: Record<LicenseStatus, string> = {
  paid: "Còn gói",
  active: "Đang hoạt động",
  expired: "Hết hạn",
  unknown: "Chờ gia hạn",
};

export type StatusBadgeProps = {
  status: LicenseStatus;
  account?: AdobeAdminAccount | null;
};

export function StatusBadge({ status, account }: StatusBadgeProps) {
  const label =
    account && status === "unknown" && hasNoAccountInfo(account)
      ? "Chờ check"
      : STATUS_LABELS[status];

  const colorClasses =
    status === "paid" || status === "active"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
      : status === "expired"
        ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
        : "bg-amber-500/10 text-amber-300 border-amber-500/30";

  const dotClasses =
    status === "paid" || status === "active"
      ? "bg-emerald-400"
      : status === "expired"
        ? "bg-rose-400"
        : "bg-amber-400";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${colorClasses}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClasses}`}></span>
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotClasses}`}></span>
      </span>
      {label}
    </span>
  );
}
