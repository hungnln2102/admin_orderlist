import {
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
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
    <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-900/70 p-3.5 shadow-2xl backdrop-blur-md sm:rounded-3xl sm:p-4.5 lg:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
        {/* Unified Search & Scope Box */}
        <div className="group relative flex min-w-0 flex-1 items-center rounded-2xl border border-white/10 bg-slate-950/60 transition-all duration-200 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/30 hover:border-white/20 xl:max-w-2xl">
          {/* Scope Select Dropdown (Left side of Search Bar) */}
          <div className="relative shrink-0 border-r border-white/10">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400/80">
              <FunnelIcon className="h-4 w-4" />
            </div>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              aria-label="Chọn trường tìm kiếm"
              className="h-11 cursor-pointer appearance-none bg-transparent py-2.5 pl-9 pr-7 text-xs font-semibold text-indigo-200 outline-none transition-colors hover:text-white sm:text-sm"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%23818cf8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'m19.5 8.25-7.5 7.5-7.5-7.5\' /%3E%3C/svg%3E")',
                backgroundPosition: "right 0.5rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "0.9rem",
              }}
            >
              {SEARCH_FIELD_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-slate-900 font-medium text-white"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input Field */}
          <div className="relative flex min-w-0 flex-1 items-center">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-400 sm:h-5 sm:w-5" />
            <input
              type="text"
              placeholder="Tìm kiếm đơn hàng, khách hàng..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full min-w-0 border-none bg-transparent py-2.5 pl-10 pr-9 text-xs text-white placeholder-slate-400/70 outline-none sm:text-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                title="Xóa tìm kiếm"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Section: Date Range & Action Buttons */}
        <div className="flex flex-col gap-3 min-[540px]:flex-row min-[540px]:items-center min-[540px]:justify-between xl:shrink-0 xl:justify-end">
          {/* Date Range Picker */}
          <div className="w-full min-w-0 min-[540px]:w-[260px] sm:w-[280px]">
            <DashboardDateRangeFilter
              value={durationRange}
              onChange={onDurationRangeChange}
              className="w-full min-w-0"
            />
          </div>

          {/* Buttons: Export & Create Order */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onExportExcel}
              disabled={exportDisabled}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-200 shadow-lg shadow-emerald-950/20 transition-all hover:border-emerald-400/50 hover:bg-emerald-500/20 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 min-[540px]:flex-initial sm:text-sm"
              title="Xuất Excel các đơn đang được lọc"
            >
              <ArrowDownTrayIcon className="h-4 w-4 shrink-0" />
              <span>Xuất Excel</span>
            </button>

            {isActiveDataset && (
              <GradientButton
                icon={PlusIcon}
                onClick={openCreateModal}
                className="h-11 flex-1 !rounded-2xl whitespace-nowrap !px-4 !py-0 text-xs shadow-lg transition-all active:scale-95 min-[540px]:flex-initial sm:!px-5 sm:text-sm"
              >
                Tạo Đơn
              </GradientButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



