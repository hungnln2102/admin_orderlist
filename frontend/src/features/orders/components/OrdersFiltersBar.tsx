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
    <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
      {/* Cột trên mobile để nút Tạo Đơn không nằm ngoài viewport (hàng ngang + overflow ẩn scrollbar). */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative w-full min-w-0 sm:min-w-[11rem] sm:flex-1 sm:basis-0 lg:min-w-[14rem]">
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

        <div className="flex w-full min-w-0 flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-nowrap sm:items-center sm:gap-3">
          <div
            className="hidden h-8 w-px shrink-0 self-center bg-white/10 sm:block"
            aria-hidden
          />

          <DashboardDateRangeFilter
            value={durationRange}
            onChange={onDurationRangeChange}
            className="w-full min-w-0 sm:w-[min(16rem,72vw)] sm:min-w-[11.5rem] sm:shrink-0 md:w-[16.5rem] md:min-w-[16.5rem]"
          />

          <div className="flex w-full min-w-0 items-stretch gap-2 sm:w-auto sm:shrink-0">
            <div className="relative min-w-0 flex-1 sm:w-[9rem] sm:flex-none sm:shrink-0">
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
              <div className="shrink-0 self-center">
                <GradientButton
                  icon={PlusIcon}
                  onClick={openCreateModal}
                  className="!px-4 !py-2 text-xs sm:!px-5 sm:!py-2.5 sm:text-sm whitespace-nowrap"
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
