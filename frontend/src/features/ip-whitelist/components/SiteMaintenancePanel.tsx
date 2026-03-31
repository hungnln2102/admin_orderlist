import {
  BoltIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  PowerIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";
import type { SiteMaintenanceStatus } from "../types";

type SiteMaintenancePanelProps = {
  status: SiteMaintenanceStatus | null;
  loading: boolean;
  updating: boolean;
  error: string | null;
  whitelistCount: number;
  onToggle: (enabled: boolean) => Promise<void> | void;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "Chưa có";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export function SiteMaintenancePanel({
  status,
  loading,
  updating,
  error,
  whitelistCount,
  onToggle,
}: SiteMaintenancePanelProps) {
  const enabled = status?.enabled ?? false;

  return (
    <section className="rounded-[32px] border border-white/15 bg-gradient-to-br from-slate-900 via-slate-900/95 to-indigo-950/75 p-5 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.95)] backdrop-blur-sm lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
            <BoltIcon className="h-4 w-4" />
            Website Maintenance
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                enabled
                  ? "border-amber-400/35 bg-amber-500/12 text-amber-100"
                  : "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
              }`}
            >
              <GlobeAltIcon className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {enabled ? "Website đang bảo trì" : "Website đang hoạt động"}
                </h2>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                    enabled
                      ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
                      : "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      enabled ? "bg-amber-300" : "bg-emerald-300"
                    }`}
                  />
                  {enabled ? "Maintenance ON" : "Maintenance OFF"}
                </span>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-white/60">
                Khi bật bảo trì, website công khai sẽ trả về trạng thái bảo trì.
                Chỉ các IP có trong whitelist mới truy cập bình thường.
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-3 sm:min-w-[220px]">
          <GradientButton
            icon={PowerIcon}
            onClick={() => onToggle(!enabled)}
            disabled={loading || updating || !status}
            className={`!justify-center !rounded-2xl !px-5 !py-3 ${
              enabled
                ? "!bg-none !bg-rose-500/90 !shadow-[0_18px_40px_-20px_rgba(244,63,94,0.85)]"
                : ""
            }`}
          >
            {loading
              ? "Đang tải trạng thái..."
              : updating
                ? "Đang cập nhật..."
                : enabled
                  ? "Tắt bảo trì"
                  : "Bật bảo trì"}
          </GradientButton>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
              Cập nhật gần nhất
            </p>
            <p className="mt-2 font-medium text-white/85">
              {loading ? "Đang tải..." : formatDateTime(status?.updatedAt ?? null)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div
          className={`rounded-[26px] border px-4 py-4 ${
            enabled
              ? "border-amber-400/20 bg-amber-500/8"
              : "border-emerald-400/15 bg-emerald-500/7"
          }`}
        >
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon
              className={`mt-0.5 h-5 w-5 shrink-0 ${
                enabled ? "text-amber-200" : "text-emerald-200"
              }`}
            />
            <div className="space-y-1 text-sm leading-6">
              <p className="font-semibold text-white">
                {enabled
                  ? "Hãy chắc chắn IP của bạn đã nằm trong whitelist trước khi bật bảo trì."
                  : "Website đang mở bình thường cho mọi người dùng."}
              </p>
              <p className="text-white/60">
                {enabled
                  ? "Nếu IP hiện tại không nằm trong danh sách bên dưới, bạn sẽ bị chặn khi truy cập website công khai."
                  : "Bạn vẫn có thể chuẩn bị sẵn danh sách IP an toàn trước khi cần bảo trì đột xuất."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] px-4 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
            IP whitelist
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{whitelistCount}</p>
          <p className="mt-1 text-sm text-white/55">
            Số IP đang được quản lý trên trang này.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}
    </section>
  );
}
