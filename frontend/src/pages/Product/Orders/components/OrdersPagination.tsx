type OrdersPaginationProps = {
  filteredOrdersLength: number;
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  currentPage: number;
  totalPages: number;
  paginationPages: Array<number | string>;
  setCurrentPage: (value: number | ((prev: number) => number)) => void;
};

export function OrdersPagination({
  filteredOrdersLength,
  rowsPerPage,
  setRowsPerPage,
  currentPage,
  totalPages,
  paginationPages,
  setCurrentPage,
}: OrdersPaginationProps) {
  if (filteredOrdersLength === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 text-white px-4 py-3 sm:px-6">
      <div className="flex items-center space-x-2 text-sm text-white/80">
        <span>Hiển thị</span>
        <select
          id="rowsPerPage"
          value={rowsPerPage}
          onChange={(event) => setRowsPerPage(Number(event.target.value))}
          className="rounded-md border border-white/20 bg-slate-900/70 py-1 pl-2 pr-7 text-white focus:border-indigo-400 focus:ring-indigo-400"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span>dòng</span>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <button
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Trang đầu"
        >
          {"<<"}
        </button>
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Trang trước"
        >
          {"<"}
        </button>
        <div className="flex items-center gap-1">
          {paginationPages.map((page, index) =>
            page === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-1 text-white/50"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                disabled={page === currentPage}
                className={`h-9 min-w-[36px] rounded-lg px-3 text-sm font-semibold transition border ${
                  page === currentPage
                    ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/40"
                    : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>
        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Trang sau"
        >
          {">"}
        </button>
        <button
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Trang cuối"
        >
          {">>"}
        </button>
      </div>
    </div>
  );
}
