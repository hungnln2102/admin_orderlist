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
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="text"
        placeholder="Tìm theo mã đơn, tên, email..."
        className="w-full max-w-md px-4 py-2 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-white placeholder:text-slate-400/70 focus:ring-2 focus:ring-indigo-500/50 outline-none"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAddOrder}
          disabled={!canInteract}
          className="shrink-0 rounded-xl bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 px-4 py-2 text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          + Thêm đơn
        </button>
        {onFixAllUsers && fixableEmailsInView.length > 0 ? (
          <button
            type="button"
            onClick={() => onFixAllUsers(fixableEmailsInView)}
            disabled={!canInteract}
            className="shrink-0 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 px-4 py-2 text-sm font-semibold hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
