import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { CreditSortOption } from "../types";

type CreditFiltersBarProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  sort: CreditSortOption;
  onSortChange: (value: CreditSortOption) => void;
  limit: number;
  onLimitChange: (value: number) => void;
};

const SORT_OPTIONS: Array<{ value: CreditSortOption; label: string }> = [
  { value: "issued_at_desc", label: "Mới nhất" },
  { value: "issued_at_asc", label: "Cũ nhất" },
  { value: "updated_at_desc", label: "Cập nhật gần đây" },
  { value: "available_amount_desc", label: "Dư khả dụng giảm dần" },
  { value: "available_amount_asc", label: "Dư khả dụng tăng dần" },
];

const LIMIT_OPTIONS = [10, 20, 50, 100];

export function CreditFiltersBar({
  searchTerm,
  onSearchTermChange,
  sort,
  onSortChange,
  limit,
  onLimitChange,
}: CreditFiltersBarProps) {
  return (
    <div className="rounded-[20px] border border-white/15 bg-slate-900/50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative w-full lg:flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-300/70" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Tìm theo mã credit, mã đơn, khách hàng, liên hệ..."
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-10 pr-3 text-sm text-white outline-none focus:border-indigo-400"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as CreditSortOption)}
            className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value) || 20)}
            className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
          >
            {LIMIT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}/trang
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
