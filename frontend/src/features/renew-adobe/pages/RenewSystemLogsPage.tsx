import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon,
  BugAntIcon,
} from "@heroicons/react/24/outline";
import {
  fetchRenewSystemLogs,
  type RenewSystemLogEntry,
  type RenewSystemLogLevel,
  type RenewSystemLogSource,
} from "@/features/renew-adobe/api/renewAdobeApi";
import { LogMeta } from "./system-logs/LogMeta";
import {
  LEVEL_OPTIONS,
  LOG_SOURCE_TABS,
  describeLogLevelVi,
  getUserLogActionText,
  getUserLogBadgeText,
  levelClassName,
  orderCodeClassName,
  vi,
} from "./system-logs/logFormatters";


export default function RenewSystemLogsPage() {
  const [logs, setLogs] = useState<RenewSystemLogEntry[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [level, setLevel] = useState<RenewSystemLogLevel>("all");
  const [activeTab, setActiveTab] = useState<RenewSystemLogSource>("system");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(
    () =>
      logs.reduce(
        (acc, item) => {
          acc.total += 1;
          const currentLevel = item.level.toLowerCase();
          if (currentLevel === "error") acc.errors += 1;
          else if (currentLevel === "warn") acc.warnings += 1;
          else acc.normal += 1;
          return acc;
        },
        { total: 0, errors: 0, warnings: 0, normal: 0 }
      ),
    [logs]
  );

  const loadLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchRenewSystemLogs({ level: activeTab === "system" ? level : "all", source: activeTab, search, limit: 150 })
      .then((data) => {
        setLogs(data.logs);
        setFiles(data.files);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : vi("Không thể tải log hệ thống."))
      )
      .finally(() => setLoading(false));
  }, [activeTab, level, search]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-amber-400/20 bg-gradient-to-br from-slate-950 via-slate-950 to-amber-950/30 p-6 shadow-2xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-500/10 text-amber-200">
              <DocumentTextIcon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-200/70">
                {vi("Hệ thống Renew")}
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white">
                {vi("Log Hệ Thống")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/55">
                {vi("Theo dõi log backend liên quan Renew Adobe, webhook và các cảnh báo vận hành gần nhất.")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/25 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            {vi("Làm mới")}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <InformationCircleIcon className="h-7 w-7 text-indigo-300" />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-white/35">
            {vi("Tổng log")}
          </p>
          <p className="mt-1 text-3xl font-black text-white">{summary.total}</p>
        </div>
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5">
          <BugAntIcon className="h-7 w-7 text-rose-200" />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-rose-100/55">Error</p>
          <p className="mt-1 text-3xl font-black text-rose-100">{summary.errors}</p>
        </div>
        <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
          <ExclamationTriangleIcon className="h-7 w-7 text-amber-200" />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-amber-100/55">Warn</p>
          <p className="mt-1 text-3xl font-black text-amber-100">{summary.warnings}</p>
        </div>
        <div className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-5">
          <ClockIcon className="h-7 w-7 text-sky-200" />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-sky-100/55">
            {activeTab === "system" ? vi("File log") : vi("Hoạt động")}
          </p>
          <p className="mt-1 text-3xl font-black text-sky-100">
            {activeTab === "system" ? files.length : summary.total}
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-3 shadow-2xl">
        <div className="grid gap-3 md:grid-cols-2">
          {LOG_SOURCE_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  isActive
                    ? "border-amber-300/40 bg-amber-500/15 text-white shadow-[0_18px_40px_-30px_rgba(251,191,36,0.9)]"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="block text-sm font-black uppercase tracking-[0.16em]">
                  {tab.label}
                </span>
                <span className="mt-1 block text-xs font-medium leading-5 text-white/45">
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-2xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {activeTab === "system" ? (
            <div className="flex flex-wrap gap-2">
              {LEVEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLevel(option.value)}
                  className={`rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                    level === option.value
                      ? "border-amber-300/40 bg-amber-500/20 text-amber-100"
                      : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-100">
              {vi("Hiển thị thao tác người dùng gần nhất")}
            </div>
          )}
          <form onSubmit={handleSearchSubmit} className="flex min-w-0 gap-2 lg:w-[420px]">
            <div className="relative min-w-0 flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={vi("Tìm email, orderCode, lỗi...")}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-white/30 focus:border-amber-300/40"
              />
            </div>
            <button
              type="submit"
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-white transition hover:bg-white/[0.1]"
            >
              {vi("Tìm")}
            </button>
          </form>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center text-sm font-semibold text-white/55">
            {vi("Đang tải log hệ thống...")}
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-lg font-bold text-white">{vi("Chưa có log để hiển thị")}</p>
            <p className="mt-2 text-sm text-white/50">
              {vi("Nếu môi trường chưa bật LOG_FILE hoặc production logging, backend sẽ chưa sinh file log.")}
            </p>
          </div>
        ) : (
          logs.map((item, index) => (
            <article
              key={`${item.sourceFile || "log"}-${item.timestamp || index}-${index}`}
              className="rounded-[24px] border border-white/10 bg-slate-950/75 p-5 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.95)] transition hover:border-amber-300/20"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${
                        activeTab === "user" ? orderCodeClassName : levelClassName(item.level)
                      }`}
                    >
                      {activeTab === "user" ? getUserLogBadgeText(item) : item.level || "info"}
                    </span>
                    <span className="text-xs font-semibold text-white/40">
                      {activeTab === "user" ? getUserLogActionText(item) : item.sourceFile || "runtime"}
                    </span>
                    {item.timestamp ? (
                      <span className="text-xs font-semibold text-white/40">
                        {item.timestamp}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 break-words text-sm font-semibold leading-6 text-white/90">
                    {item.message || item.raw || "?"}
                  </p>
                  {activeTab === "system" ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                      {describeLogLevelVi(item.level)}
                    </p>
                  ) : null}
                  <LogMeta item={item} compact={activeTab === "user"} />
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
