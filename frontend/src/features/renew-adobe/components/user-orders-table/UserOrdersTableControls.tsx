type Props = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddOrder: () => void;
  canInteract: boolean;
  onFixAllUsers?: (emails: string[]) => void;
  fixableEmailsInView: string[];
  fixAllProgress?: { current: number; total: number } | null;
};

export function UserOrdersTableControls({
  searchTerm,
  onSearchChange,
  onAddOrder,
  canInteract,
  onFixAllUsers,
  fixableEmailsInView,
  fixAllProgress,
}: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
      <input
        type="text"
        placeholder="Tìm theo mã đơn, tên, email..."
        className="w-full max-w-md px-4 py-2 border border-white/5 rounded-xl bg-slate-950/40 text-sm text-white placeholder:text-white/30 focus:ring-1 focus:ring-violet-500/50 focus:border-violet-400 outline-none transition-all"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAddOrder}
          disabled={!canInteract}
          className="shrink-0 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/20 px-4 py-2 text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.03)] hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
        >
          + Thêm đơn
        </button>
        {onFixAllUsers && fixableEmailsInView.length > 0 ? (
          <button
            type="button"
            onClick={() => onFixAllUsers(fixableEmailsInView)}
            disabled={!canInteract}
            className={`shrink-0 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/20 px-4 py-2 text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.03)] hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer ${
              fixAllProgress ? "animate-pulse border-amber-500 text-amber-400 bg-amber-500/20" : ""
            }`}
          >
            {fixAllProgress
              ? `Đang fix ${fixAllProgress.current}/${fixAllProgress.total}...`
              : `Fix all (${fixableEmailsInView.length})`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
