import type { MouseEventHandler } from "react";

export type RenewAdobeHeaderProps = {
  isCheckingAll: boolean;
  loading: boolean;
  accountCount: number;
  checkingId: number | null;
  cronTestLoading: boolean;
  onCheckAll: MouseEventHandler<HTMLButtonElement>;
  onCancelCheckAll: MouseEventHandler<HTMLButtonElement>;
  onTestCronJob: MouseEventHandler<HTMLButtonElement>;
  onAddAdmin?: MouseEventHandler<HTMLButtonElement>;
};

export function RenewAdobeHeader({
  isCheckingAll,
  loading,
  accountCount,
  checkingId,
  cronTestLoading,
  onCheckAll,
  onCancelCheckAll,
  onTestCronJob,
  onAddAdmin,
}: RenewAdobeHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-5">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Renew Adobe
          </span>
        </h1>
        <p className="text-sm font-medium text-white/40 tracking-wide">
          Danh sách tài khoản admin dùng cho Renew Adobe
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {onAddAdmin && (
          <button
            type="button"
            onClick={onAddAdmin}
            disabled={loading || checkingId !== null || cronTestLoading}
            className="rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] px-4.5 py-2 text-sm font-semibold transition-all duration-300"
          >
            + Thêm tài khoản admin
          </button>
        )}
        {isCheckingAll ? (
          <button
            type="button"
            onClick={onCancelCheckAll}
            className="rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.05)] hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] px-4.5 py-2 text-sm font-semibold transition-all duration-300"
          >
            Hủy Check All
          </button>
        ) : (
          <button
            type="button"
            onClick={onCheckAll}
            disabled={
              loading ||
              accountCount === 0 ||
              checkingId !== null ||
              cronTestLoading
            }
            className="rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(99,102,241,0.05)] hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] px-4.5 py-2 text-sm font-semibold transition-all duration-300"
          >
            Check All
          </button>
        )}
        <button
          type="button"
          onClick={onTestCronJob}
          disabled={
            loading ||
            checkingId !== null ||
            isCheckingAll ||
            cronTestLoading
          }
          title="Gọi cùng job với cron hàng giờ (check all + auto-assign), chạy trong process API. Process scheduler riêng (`node scheduler.js`) xem log server."
          className="rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(245,158,11,0.02)] hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] px-4.5 py-2 text-sm font-semibold transition-all duration-300"
        >
          {cronTestLoading ? "Đang chạy job…" : "Test job cron"}
        </button>
      </div>
    </div>
  );
}
