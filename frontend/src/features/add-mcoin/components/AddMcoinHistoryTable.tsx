import Pagination from "@/components/ui/Pagination";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import type { CoinHistoryItem } from "../types";
import { formatCoinAmount, formatCoinDate } from "../constants";

type AddMcoinHistoryTableProps = {
  rows: CoinHistoryItem[];
  start: number;
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function AddMcoinHistoryTable({
  rows: currentRows,
  start,
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
}: AddMcoinHistoryTableProps) {
  return (
      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        <ResponsiveTable
          showCardOnMobile
          cardView={
            currentRows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-white/70 text-lg mb-2">Chưa có giao dịch nào</p>
                <p className="text-white/60 text-sm">Thử thay đổi từ khóa hoặc thêm giao dịch</p>
              </div>
            ) : (
              <TableCard
                data={currentRows}
                renderCard={(item, idx) => {
                  const row = item as CoinHistoryItem;
                  const isAdd = row.type === "add";
                  return (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-white/10 bg-slate-800/40 p-4 shadow-lg backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-indigo-300/70 tabular-nums">
                          #{start + idx + 1}
                        </span>
                        <span className="text-sm font-medium text-white">{row.account}</span>
                        <span
                          className={
                            isAdd
                              ? "inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : "inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium bg-rose-500/20 text-rose-300 border-rose-500/30"
                          }
                        >
                          {isAdd ? "Nạp" : "Tiêu"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                        <div className="text-white/60">Số xu</div>
                        <div
                          className={`tabular-nums text-right font-medium ${isAdd ? "text-emerald-300" : "text-rose-300"}`}
                        >
                          {isAdd ? "+" : "-"}
                          {formatCoinAmount(row.amount)}
                        </div>
                        <div className="text-white/60">Mô tả</div>
                        <div className="text-white/90 text-right truncate">{row.description || "—"}</div>
                        <div className="text-white/60">Thời gian</div>
                        <div className="text-white/80 text-right text-xs">{formatCoinDate(row.createdAt)}</div>
                      </div>
                    </div>
                  );
                }}
                className="p-4"
              />
            )
          }
        >
          <table className="min-w-full divide-y divide-white/5 text-white">
            <thead>
              <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                <th className="w-12 text-center">STT</th>
                <th className="min-w-[100px]">TÀI KHOẢN</th>
                <th className="w-24 text-center">LOẠI</th>
                <th className="w-28 text-right">SỐ XU</th>
                <th className="min-w-[140px]">MÔ TẢ</th>
                <th className="min-w-[120px]">THỜI GIAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-white/70">
                    <p className="text-lg mb-2">Chưa có giao dịch nào</p>
                    <p className="text-sm text-white/60">Thử thay đổi từ khóa hoặc thêm giao dịch</p>
                  </td>
                </tr>
              ) : (
                currentRows.map((row, i) => {
                  const isAdd = row.type === "add";
                  return (
                    <tr
                      key={row.id}
                      className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-2 py-3 sm:px-4 text-center text-sm text-white/80 tabular-nums whitespace-nowrap">
                        {start + i + 1}
                      </td>
                      <td className="px-2 py-3 sm:px-4 text-sm text-white/90 whitespace-nowrap">
                        {row.account}
                      </td>
                      <td className="px-2 py-3 sm:px-4 text-center whitespace-nowrap">
                        <span
                          className={
                            isAdd
                              ? "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium bg-rose-500/20 text-rose-300 border-rose-500/30"
                          }
                        >
                          {isAdd ? "Nạp" : "Tiêu"}
                        </span>
                      </td>
                      <td
                        className={`px-2 py-3 sm:px-4 text-right text-sm tabular-nums whitespace-nowrap ${isAdd ? "text-emerald-300" : "text-rose-300"}`}
                      >
                        {isAdd ? "+" : "-"}
                        {formatCoinAmount(row.amount)}
                      </td>
                      <td className="px-2 py-3 sm:px-4 text-sm text-white/80 whitespace-nowrap max-w-[200px] truncate" title={row.description}>
                        {row.description || "—"}
                      </td>
                      <td className="px-2 py-3 sm:px-4 text-sm text-white/70 whitespace-nowrap">
                        {formatCoinDate(row.createdAt)}
                      </td>
                    </tr>
                  );
                })
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
  );
}
