import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type IpWhitelistSearchSummaryProps = {
  searchTerm: string;
  totalCount: number;
  visibleCount: number;
  onSearchChange: (value: string) => void;
};

export function IpWhitelistSearchSummary({
  searchTerm,
  totalCount,
  visibleCount,
  onSearchChange,
}: IpWhitelistSearchSummaryProps) {
  return (
      <div className="rounded-[32px] border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-4 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm lg:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px] lg:items-start">
          {/*
            self-start: cột search không stretch theo chiều cao hàng grid.
            flex + shrink-0 icon: tránh absolute đè lên placeholder.
          */}
          <div className="flex w-full min-w-0 items-center gap-3 self-start rounded-2xl border border-white/10 bg-slate-950/40 py-2.5 pl-4 pr-4 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/50">
            <MagnifyingGlassIcon
              className="pointer-events-none h-5 w-5 shrink-0 text-indigo-300/70"
              aria-hidden
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                onSearchChange(event.target.value);
              }}
              placeholder="Tìm theo IP hoặc mô tả..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-white outline-none ring-0 placeholder:text-slate-400/70"
            />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Tổng IP
            </p>
            <p className="mt-2 text-2xl font-bold text-white">{totalCount}</p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Hiển thị
            </p>
            <p className="mt-2 text-2xl font-bold text-white">{visibleCount}</p>
          </div>
        </div>
      </div>
  );
}
