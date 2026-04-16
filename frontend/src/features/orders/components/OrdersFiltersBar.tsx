import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
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
  durationRange,
  onDurationRangeChange,
}: OrdersFiltersBarProps) {
  return (
    <div className="min-w-0 rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
      {/* Tới lg: xếp cột để khối co theo chiều ngang; từ lg: một hàng + wrap phần filter phải khi thiếu chỗ. */}
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative w-full min-w-0 lg:min-w-[11rem] lg:flex-1 lg:basis-0 xl:min-w-[14rem]">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300 pointer-events-none z-10 opacity-70" />
          <input
            type="text"
            placeholder="Tìm kiếm đơn hàng, khách hàng..."
            className="w-full min-w-0 pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            style={{ paddingLeft: "3.25rem" }}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-3 lg:ml-auto lg:w-auto lg:max-w-full lg:flex-1 lg:basis-0 lg:justify-end">
          <div
            className="hidden h-8 w-px shrink-0 self-center bg-white/10 lg:block"
            aria-hidden
          />

          <DashboardDateRangeFilter
            value={durationRange}
            onChange={onDurationRangeChange}
            className="w-full min-w-0 max-w-full flex-[1_1_12rem] sm:min-w-0 lg:max-w-[min(18rem,100%)] lg:shrink"
          />

          <div className="flex min-w-0 w-full flex-[1_1_14rem] flex-wrap items-stretch gap-2 sm:w-auto sm:min-w-0 sm:justify-end">
            <div className="relative min-w-0 flex-1 basis-[8.5rem] sm:max-w-[11rem] sm:flex-none">
              <select
                className="w-full min-w-0 px-3.5 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none cursor-pointer transition-all appearance-none"
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

            {isActiveDataset && (
              <div className="min-w-0 shrink-0 self-center">
                <GradientButton
                  icon={PlusIcon}
                  onClick={openCreateModal}
                  className="!px-4 !py-2 text-xs sm:!px-5 sm:!py-2.5 sm:text-sm whitespace-nowrap max-w-full"
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
