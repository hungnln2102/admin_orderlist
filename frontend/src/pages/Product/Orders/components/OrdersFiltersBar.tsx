import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import GradientButton from "../../../../components/ui/GradientButton";
import { SEARCH_FIELD_OPTIONS } from "../constants";

type OrdersFiltersBarProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchField: string;
  setSearchField: (value: string) => void;
  isActiveDataset: boolean;
  openCreateModal: () => void;
};

export function OrdersFiltersBar({
  searchTerm,
  setSearchTerm,
  searchField,
  setSearchField,
  isActiveDataset,
  openCreateModal,
}: OrdersFiltersBarProps) {
  return (
    <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row lg:flex-wrap gap-4 items-stretch lg:items-center">
        <div className="relative w-full lg:flex-1 lg:min-w-[280px]">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300 pointer-events-none z-10 opacity-70" />
          <input
            type="text"
            placeholder="Tìm kiếm đơn hàng, khách hàng..."
            className="w-full pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            style={{ paddingLeft: "3.25rem" }}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto lg:flex-shrink-0">
          <div className="hidden lg:block w-px h-8 bg-white/10 mx-1" aria-hidden />

          <div className="relative w-full sm:w-auto sm:min-w-[140px] lg:w-[170px]">
            <select
              className="w-full px-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none cursor-pointer transition-all appearance-none"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%23818cf8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'m19.5 8.25-7.5 7.5-7.5-7.5\' /%3E%3C/svg%3E")',
                backgroundPosition: "right 1rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.1rem",
                paddingRight: "2.5rem",
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
            <GradientButton icon={PlusIcon} onClick={openCreateModal}>
              Tạo Đơn
            </GradientButton>
          )}
        </div>
      </div>
    </div>
  );
}
