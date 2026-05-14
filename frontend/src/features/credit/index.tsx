import { CreditFiltersBar } from "./components/CreditFiltersBar";
import { CreditStatsSection } from "./components/CreditStatsSection";
import { CreditTableSection } from "./components/CreditTableSection";
import { useCreditLogsFetch } from "./hooks/useCreditLogsFetch";
import { useCreditLogsList } from "./hooks/useCreditLogsList";

export default function CreditLogsPage() {
  const {
    searchTerm,
    setSearchTerm,
    statusGroup,
    setStatusGroup,
    sort,
    setSort,
    page,
    setPage,
    limit,
    setLimit,
    queryParams,
  } = useCreditLogsList();

  const { data, loading, error, reload } = useCreditLogsFetch(queryParams);

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-white/15 bg-gradient-to-br from-slate-800/70 via-slate-700/55 to-slate-900/75 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200/80">Bán hàng</p>
        <h1 className="mt-2 text-2xl font-black text-white">Credit Logs</h1>
        <p className="mt-1 text-sm text-slate-300">
          Quản lý credit theo khách hàng: khả dụng, đã áp dụng và không khả dụng.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <CreditStatsSection
        stats={data.stats}
        statusGroup={statusGroup}
        onChangeGroup={setStatusGroup}
      />

      <CreditFiltersBar
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        sort={sort}
        onSortChange={setSort}
        limit={limit}
        onLimitChange={setLimit}
      />

      <CreditTableSection
        loading={loading}
        items={data.items}
        pagination={data.pagination}
        onPageChange={setPage}
        onReload={reload}
      />

      <div className="text-xs text-slate-400">
        Bộ lọc hiện tại: <span className="text-slate-200">{statusGroup}</span> - Trang{" "}
        <span className="text-slate-200">{page}</span>
      </div>
    </div>
  );
}
