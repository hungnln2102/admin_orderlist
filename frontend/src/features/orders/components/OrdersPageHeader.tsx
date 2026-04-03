type OrdersPageHeaderProps = {
  fetchError: string | null;
  onRetry: () => void;
};

export function OrdersPageHeader({
  fetchError,
  onRetry,
}: OrdersPageHeaderProps) {
  return (
    <>
      {fetchError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></div>
            <span className="font-medium">{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-rose-500/30 bg-rose-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-rose-100 transition hover:bg-rose-500/30 active:scale-95"
          >
            Thử Lại
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Quản Lý <span className="text-indigo-400">Đơn Hàng</span>
          </h1>
          <p className="text-sm font-medium text-white/50 tracking-wide">
            Control and monitor all customer transactions
          </p>
        </div>
      </div>
    </>
  );
}
