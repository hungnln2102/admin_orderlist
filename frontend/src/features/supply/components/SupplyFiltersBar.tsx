import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import GradientButton from "@/components/ui/GradientButton";

type SupplyFiltersBarProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  onAddSupplier: () => void;
};

export function SupplyFiltersBar({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onAddSupplier,
}: SupplyFiltersBarProps) {
  return (
    <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative w-full lg:flex-1">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300 pointer-events-none z-10 opacity-70" />
          <input
            type="text"
            placeholder="Tìm kiếm nhà cung cấp..."
            className="w-full pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            style={{ paddingLeft: "3.25rem" }}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex w-full lg:w-auto gap-3 items-center">
          <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>
          <div className="relative w-full lg:w-[180px]">
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
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all" className="bg-slate-900 text-white">
                Tất cả trạng thái
              </option>
              <option value="active" className="bg-slate-900 text-white">
                Đang hoạt động
              </option>
              <option value="inactive" className="bg-slate-900 text-white">
                Tạm dừng
              </option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
          <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>
          <GradientButton
            icon={PlusIcon}
            onClick={onAddSupplier}
            className="!py-2.5 !px-5 text-sm"
          >
            Thêm NCC
          </GradientButton>
        </div>
      </div>
    </div>
  );
}
