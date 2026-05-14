import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import type { CreditLogItem, CreditLogsPagination } from "../types";
import {
  formatDateTime,
  formatMoneyVnd,
  resolveAvailabilityClass,
  resolveAvailabilityText,
} from "../utils/creditTransform";

type CreditTableSectionProps = {
  loading: boolean;
  items: CreditLogItem[];
  pagination: CreditLogsPagination;
  onPageChange: (next: number) => void;
};

function CreditCard({ item }: { item: CreditLogItem }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-indigo-200/80">Mã credit</p>
          <p className="text-sm font-bold text-white">{item.credit_code || "—"}</p>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${resolveAvailabilityClass(item)}`}
        >
          {resolveAvailabilityText(item)}
        </span>
      </div>
      <div className="mt-3 space-y-1 text-xs text-slate-200">
        <p>Khách: {item.customer_name || "—"}</p>
        <p>Đơn nguồn: {item.source_order_code || "—"}</p>
        <p>Tổng credit: {formatMoneyVnd(item.refund_amount)}</p>
        <p>Còn khả dụng: {formatMoneyVnd(item.available_amount)}</p>
        <p>Đã áp dụng: {formatMoneyVnd(item.applied_total)}</p>
        <p>Lần áp dụng gần nhất: {formatDateTime(item.last_applied_at)}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center text-sm text-slate-300">
      Không có credit logs phù hợp bộ lọc.
    </div>
  );
}

export function CreditTableSection({
  loading,
  items,
  pagination,
  onPageChange,
}: CreditTableSectionProps) {
  const canPrev = pagination.page > 1;
  const canNext = pagination.page < pagination.total_pages;

  return (
    <div className="rounded-[20px] border border-white/15 bg-slate-900/50 p-4">
      <ResponsiveTable
        showCardOnMobile
        cardView={
          loading ? (
            <div className="p-6 text-center text-sm text-indigo-200">Đang tải credit logs...</div>
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <TableCard
              data={items as unknown as Record<string, unknown>[]}
              renderCard={(item) => <CreditCard item={item as unknown as CreditLogItem} />}
            />
          )
        }
      >
        <table className="min-w-full table-fixed text-sm text-white">
          <thead>
            <tr className="[&>th]:border-b [&>th]:border-white/10 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:text-[11px] [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-indigo-200/80">
              <th className="w-[14%]">Mã credit</th>
              <th className="w-[16%]">Khách hàng</th>
              <th className="w-[12%]">Đơn nguồn</th>
              <th className="w-[11%]">Tổng credit</th>
              <th className="w-[11%]">Khả dụng</th>
              <th className="w-[11%]">Đã áp dụng</th>
              <th className="w-[10%]">Trạng thái</th>
              <th className="w-[15%]">Lần áp dụng gần nhất</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-indigo-200">
                  Đang tải credit logs...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8">
                  <EmptyState />
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-3 py-3 font-semibold">{item.credit_code || "—"}</td>
                  <td className="px-3 py-3">
                    <p>{item.customer_name || "—"}</p>
                    <p className="text-xs text-slate-300">{item.customer_contact || "—"}</p>
                  </td>
                  <td className="px-3 py-3">{item.source_order_code || "—"}</td>
                  <td className="px-3 py-3">{formatMoneyVnd(item.refund_amount)}</td>
                  <td className="px-3 py-3">{formatMoneyVnd(item.available_amount)}</td>
                  <td className="px-3 py-3">
                    <p>{formatMoneyVnd(item.applied_total)}</p>
                    <p className="text-xs text-slate-300">{item.applied_count} lượt</p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${resolveAvailabilityClass(item)}`}
                    >
                      {resolveAvailabilityText(item)}
                    </span>
                  </td>
                  <td className="px-3 py-3">{formatDateTime(item.last_applied_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ResponsiveTable>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
        <span>
          Trang {pagination.page}/{Math.max(1, pagination.total_pages)} - Tổng {pagination.total}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            className="rounded-lg border border-white/10 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => onPageChange(pagination.page + 1)}
            className="rounded-lg border border-white/10 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
