export type PaginationItem = number | "ellipsis";

type InvoicesPaginationProps = {
  activePage: number;
  totalPages: number;
  totalItems: number;
  paginationItems: PaginationItem[];
  onSetPage: (updater: (current: number) => number) => void;
};

export function InvoicesPagination({
  activePage,
  totalPages,
  totalItems,
  paginationItems,
  onSetPage,
}: InvoicesPaginationProps) {
  return (
    <div className="flex flex-col gap-3 px-1 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
      <div>
        Trang {activePage}/{totalPages} ? {totalItems} d?ng
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="h-10 min-w-10 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-indigo-100/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          disabled={activePage <= 1}
          onClick={() => onSetPage(() => 1)}
        >
          &lt;&lt;
        </button>
        <button
          type="button"
          className="h-10 min-w-10 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-indigo-100/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          disabled={activePage <= 1}
          onClick={() => onSetPage((current) => Math.max(1, current - 1))}
        >
          &lt;
        </button>
        {paginationItems.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-10 min-w-7 items-center justify-center font-black text-indigo-100/60"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-black transition ${
                item === activePage
                  ? "border-blue-400/40 bg-blue-600 text-white shadow-[0_0_24px_rgba(37,99,235,0.35)]"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
              onClick={() => onSetPage(() => item)}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          className="h-10 min-w-10 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-indigo-100/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          disabled={activePage >= totalPages}
          onClick={() => onSetPage((current) => Math.min(totalPages, current + 1))}
        >
          &gt;
        </button>
        <button
          type="button"
          className="h-10 min-w-10 rounded-lg border border-white/10 bg-white/5 px-3 font-bold text-indigo-100/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          disabled={activePage >= totalPages}
          onClick={() => onSetPage(() => totalPages)}
        >
          &gt;&gt;
        </button>
      </div>
    </div>
  );
}
