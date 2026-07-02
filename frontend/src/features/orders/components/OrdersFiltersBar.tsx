import {
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";
import {
  DashboardDateRangeFilter,
  type DashboardDateRangeValue,
} from "@/features/dashboard/components/DashboardDateRangeFilter";
import { SEARCH_FIELD_OPTIONS } from "../constants";

type OrdersFiltersBarProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchField: string;
  setSearchField: (value: string) => void;
  isActiveDataset: boolean;
  openCreateModal: () => void;
  onExportExcel: () => void;
  exportDisabled?: boolean;
  durationRange: DashboardDateRangeValue | null;
  onDurationRangeChange: (next: DashboardDateRangeValue | null) => void;
};

export function OrdersFiltersBar({
  searchTerm,
  setSearchTerm,
  searchField,
  setSearchField,
  isActiveDataset,
  openCreateModal,
  onExportExcel,
  exportDisabled = false,
  durationRange,
  onDurationRangeChange,
}: OrdersFiltersBarProps) {
  return (
    <div className="min-w-0 rounded-[24px] border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-3 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm sm:rounded-[32px] sm:p-4 lg:p-5">
      <div className="flex min-w-0 flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative w-full min-w-0 lg:min-w-[11rem] lg:flex-1 lg:basis-0 xl:min-w-[14rem]">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-indigo-300 opacity-70" />
          <input
            type="text"
            placeholder="Tìm kiếm đơn hàng, khách hàng..."
            className="w-full min-w-0 rounded-2xl border border-white/10 bg-slate-950/40 py-2.5 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-400/70 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
            style={{ paddingLeft: "3.25rem" }}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(14rem,1fr)_auto] sm:items-center sm:gap-3 lg:ml-auto lg:w-auto lg:max-w-full lg:flex-1 lg:basis-0 lg:grid-cols-[minmax(12rem,18rem)_auto] lg:justify-end">
          <DashboardDateRangeFilter
            value={durationRange}
            onChange={onDurationRangeChange}
            className="w-full min-w-0 max-w-full"
          />

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto sm:min-w-0 sm:justify-end">
            <div className="relative min-w-0 sm:w-[11rem]">
              <select
                className="h-11 w-full min-w-0 cursor-pointer appearance-none rounded-2xl border border-white/10 bg-slate-950/40 px-3.5 text-sm text-white outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
                style={{
                  backgroundImage:
                    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%23818cf8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'m19.5 8.25-7.5 7.5-7.5-7.5\' /%3E%3C/svg%3E")',
                  backgroundPosition: "right 0.65rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.1rem",
                  paddingRight: "2.25rem",
                }}
                value={searchField}
                onChange={(event) => setSearchField(event.target.value)}
              >
                {SEARCH_FIELD_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-slate-900 text-white"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onExportExcel}
              disabled={exportDisabled}
              className="inline-flex h-11 min-w-0 shrink-0 items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-100 shadow-[0_12px_26px_-18px_rgba(16,185,129,0.85)] transition-all hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-45 sm:px-4 sm:text-sm"
              title="Xuất Excel các đơn đang được lọc"
            >
              <ArrowDownTrayIcon className="h-4 w-4 shrink-0" />
              <span className="hidden whitespace-nowrap min-[390px]:inline sm:inline">
                Xuất Excel
              </span>
            </button>

            {isActiveDataset && (
              <div className="col-span-2 mt-1 min-w-0 shrink-0 justify-self-start sm:col-span-1 sm:mt-0 sm:self-center">
                <GradientButton
                  icon={PlusIcon}
                  onClick={openCreateModal}
                  className="whitespace-nowrap !px-4 !py-2 text-xs sm:!px-5 sm:!py-2.5 sm:text-sm"
                >
                  Tạo Đơn
                </GradientButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


