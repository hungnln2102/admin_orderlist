type ProductTablePaginationProps = {
  rowsPerPage: number;
  onRowsPerPageChange: (rows: number) => void;
  clampedCurrent: number;
  totalPages: number;
  paginationItems: Array<number | "ellipsis">;
  handlePageSelect: (page: number) => void;
};

export function ProductTablePagination({
  rowsPerPage,
  onRowsPerPageChange,
  clampedCurrent,
  totalPages,
  paginationItems,
  handlePageSelect,
}: ProductTablePaginationProps) {
  const pageOptions = [10, 20, 50];
  const controlButtonClass =
    "w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition-all hover:bg-white/10 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95";
  const pageButtonClass =
    "w-10 h-10 flex items-center justify-center rounded-xl font-bold border border-white/10 bg-white/5 text-white/80 transition-all hover:bg-white/10 hover:border-white/20 active:scale-95";
  const activePageClass =
    "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-white/20 shadow-[0_8px_20px_-6px_rgba(99,102,241,0.6)]";

  return (
    <div className="flex flex-col gap-3 border-t border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white/80 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <span>Hiển thị</span>
        <select
          className="rounded-lg border border-white/20 bg-slate-900 px-3 py-1 text-white shadow-sm focus:border-indigo-400 focus:outline-none"
          value={rowsPerPage}
          onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
        >
          {pageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span>dòng</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          className={controlButtonClass}
          onClick={() => handlePageSelect(1)}
          disabled={clampedCurrent === 1}
          aria-label="Trang đầu"
        >
          {"<<"}
        </button>
        <button
          className={controlButtonClass}
          onClick={() => handlePageSelect(clampedCurrent - 1)}
          disabled={clampedCurrent === 1}
          aria-label="Trang trước"
        >
          {"<"}
        </button>
        {paginationItems.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="w-10 h-10 flex items-center justify-center text-white/50"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              className={`${pageButtonClass} ${
                clampedCurrent === item ? activePageClass : ""
              }`}
              onClick={() => handlePageSelect(item)}
            >
              {item}
            </button>
          )
        )}
        <button
          className={controlButtonClass}
          onClick={() => handlePageSelect(clampedCurrent + 1)}
          disabled={clampedCurrent === totalPages}
          aria-label="Trang sau"
        >
          {">"}
        </button>
        <button
          className={controlButtonClass}
          onClick={() => handlePageSelect(totalPages)}
          disabled={clampedCurrent === totalPages}
          aria-label="Trang cuối"
        >
          {">>"}
        </button>
      </div>
    </div>
  );
}
