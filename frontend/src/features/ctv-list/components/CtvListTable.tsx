import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import Pagination from "@/components/ui/Pagination";
import type { CtvItem } from "../types";
import { ROLE_ID_CUSTOMER } from "../constants";
import { CtvRow } from "./CtvRow";
import { CtvCard } from "./CtvCard";

type CtvListTableProps = {
  rows: CtvItem[];
  roleTab: number;
  start: number;
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onView: (item: CtvItem) => void;
  onEdit: (item: CtvItem) => void;
};

export function CtvListTable({
  rows: currentRows,
  roleTab,
  start,
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onView,
  onEdit,
}: CtvListTableProps) {
  const variant = roleTab === ROLE_ID_CUSTOMER ? "customer" : "ctv";

  return (
    <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
      <ResponsiveTable
        showCardOnMobile
        cardView={
          currentRows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-white/70 text-lg mb-2">
                Không tìm thấy CTV / khách hàng nào
              </p>
              <p className="text-white/60 text-sm">
                Thử thay đổi từ khóa hoặc bộ lọc
              </p>
            </div>
          ) : (
            <TableCard
              data={currentRows}
              renderCard={(item, idx) => (
                <CtvCard
                  item={item as CtvItem}
                  index={start + idx + 1}
                  onView={onView}
                  onEdit={onEdit}
                  variant={variant}
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
              <th className="min-w-[100px]">TÀI KHOẢN</th>
              {roleTab === ROLE_ID_CUSTOMER ? (
                <>
                  <th className="min-w-[100px]">HỌ</th>
                  <th className="min-w-[80px]">TÊN</th>
                </>
              ) : (
                <th className="min-w-[120px]">TÊN</th>
              )}
              <th className="min-w-[160px]">EMAIL</th>
              <th className="w-28 text-right">SỐ DƯ</th>
              <th className="w-28 text-right">TỔNG TIÊU</th>
              {roleTab === ROLE_ID_CUSTOMER && (
                <th className="w-24 text-center">HẠNG</th>
              )}
              <th className="w-28">TRẠNG THÁI</th>
              <th className="w-28 text-right pr-4">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {currentRows.length === 0 ? (
              <tr>
                <td
                  colSpan={roleTab === ROLE_ID_CUSTOMER ? 10 : 8}
                  className="px-4 py-12 text-center text-white/70"
                >
                  <p className="text-lg mb-2">Không tìm thấy CTV / khách hàng nào</p>
                  <p className="text-sm text-white/60">
                    Thử thay đổi từ khóa hoặc bộ lọc
                  </p>
                </td>
              </tr>
            ) : (
              currentRows.map((item, index) => (
                <CtvRow
                  key={item.id}
                  item={item}
                  index={start + index + 1}
                  onView={onView}
                  onEdit={onEdit}
                  variant={variant}
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
  );
}
