import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import Pagination from "@/components/ui/Pagination";
import { PROMO_STATUS_OPTIONS, type PromoCodeItem, type PromoStatus } from "../types";
import { PromoCodeCard } from "./PromoCodeCard";
import { PromoCodeRow } from "./PromoCodeRow";

type PromoCodesListSectionProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: PromoStatus | "all";
  setStatusFilter: (value: PromoStatus | "all") => void;
  loading: boolean;
  error: string | null;
  items: PromoCodeItem[];
  currentRows: PromoCodeItem[];
  totalItems: number;
  start: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onView: (item: PromoCodeItem) => void;
  onEdit: (item: PromoCodeItem) => void;
};

export function PromoCodesListSection({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  loading,
  error,
  items,
  currentRows,
  totalItems,
  start,
  currentPage,
  pageSize,
  onPageChange,
  onView,
  onEdit,
}: PromoCodesListSectionProps) {
  return (
    <>
      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-4 items-stretch lg:items-center">
          <div className="relative w-full lg:flex-1 lg:min-w-[240px]">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300/70 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo mã, chiết khấu, điều kiện..."
              className="w-full pl-11 pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                onPageChange(1);
              }}
            />
          </div>
          <div className="relative w-full sm:w-auto sm:min-w-[180px] lg:w-[200px]">
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
              onChange={(event) => {
                setStatusFilter(event.target.value as PromoStatus | "all");
                onPageChange(1);
              }}
            >
              {PROMO_STATUS_OPTIONS.map((option) => (
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
        </div>
      </div>

      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-white/70">
            Đang tải danh sách mã khuyến mãi...
          </div>
        ) : (
          <>
            <ResponsiveTable
              showCardOnMobile
              cardView={
                currentRows.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-white/70 text-lg mb-2">
                      {items.length === 0
                        ? "Chưa có mã khuyến mãi"
                        : "Không tìm thấy mã khuyến mãi nào"}
                    </p>
                    <p className="text-white/60 text-sm">
                      {items.length === 0
                        ? ""
                        : "Thử thay đổi từ khóa hoặc bộ lọc"}
                    </p>
                  </div>
                ) : (
                  <TableCard
                    data={currentRows}
                    renderCard={(item, index) => (
                      <PromoCodeCard
                        item={item as PromoCodeItem}
                        index={start + index + 1}
                        onView={onView}
                        onEdit={onEdit}
                      />
                    )}
                    className="p-4"
                  />
                )
              }
            >
              <table className="min-w-full divide-y divide-white/5 text-white">
                <thead>
                  <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                    <th className="w-12 text-center">STT</th>
                    <th className="min-w-[120px]">MÃ KHUYẾN MÃI</th>
                    <th className="min-w-[90px]">CHIẾT KHẤU</th>
                    <th className="min-w-[100px]">TỐI ĐA</th>
                    <th className="min-w-[140px]">ĐIỀU KIỆN</th>
                    <th className="w-28">TRẠNG THÁI</th>
                    <th className="w-28 text-right pr-4">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-white/70">
                        <p className="text-lg mb-2">
                          {items.length === 0
                            ? "Chưa có mã khuyến mãi"
                            : "Không tìm thấy mã khuyến mãi nào"}
                        </p>
                        <p className="text-sm text-white/60">
                          {items.length === 0
                            ? ""
                            : "Thử thay đổi từ khóa hoặc bộ lọc"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((item, index) => (
                      <PromoCodeRow
                        key={item.id}
                        item={item}
                        index={start + index + 1}
                        onView={onView}
                        onEdit={onEdit}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </ResponsiveTable>

            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:px-6">
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={onPageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
