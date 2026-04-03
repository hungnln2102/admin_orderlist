import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import Pagination from "@/components/ui/Pagination";
import type { PromoUsageItem } from "../types";
import { PromoUsageRow } from "./PromoUsageRow";

type PromoUsageHistorySectionProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  currentRows: PromoUsageItem[];
  totalItems: number;
  start: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function PromoUsageHistorySection({
  searchTerm,
  setSearchTerm,
  currentRows,
  totalItems,
  start,
  currentPage,
  pageSize,
  onPageChange,
}: PromoUsageHistorySectionProps) {
  return (
    <>
      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300/70 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo mã KM, tài khoản, mã đơn, giảm giá..."
            className="w-full pl-11 pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              onPageChange(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        <ResponsiveTable showCardOnMobile={false}>
          <table className="min-w-full divide-y divide-white/5 text-white">
            <thead>
              <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                <th className="w-12 text-center">STT</th>
                <th className="min-w-[120px]">MÃ KHUYẾN MÃI</th>
                <th className="min-w-[120px]">TÀI KHOẢN</th>
                <th className="min-w-[140px]">THỜI GIAN SỬ DỤNG</th>
                <th className="min-w-[100px]">MÃ ĐƠN</th>
                <th className="min-w-[100px]">GIẢM GIÁ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-white/70">
                    <p className="text-lg mb-2">Chưa có lịch sử sử dụng</p>
                    <p className="text-sm text-white/60">
                      Dữ liệu sẽ hiển thị khi có mã được sử dụng
                    </p>
                  </td>
                </tr>
              ) : (
                currentRows.map((item, index) => (
                  <PromoUsageRow
                    key={item.id}
                    item={item}
                    index={start + index + 1}
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
      </div>
    </>
  );
}
