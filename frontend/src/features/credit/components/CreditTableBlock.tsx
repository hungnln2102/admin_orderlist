import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import { CheckCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { CreditLogItem } from "../types";
import {
  formatDateTime,
  formatMoneyVnd,
  resolveCreditStatusClass,
  resolveCreditStatusText,
} from "../utils/creditTransform";

export type CreditActionType = "delete" | "complete";

type CreditTableBlockProps = {
  title: string;
  description: string;
  loading: boolean;
  items: CreditLogItem[];
  emptyMessage: string;
  onAction: (item: CreditLogItem, action: CreditActionType) => void | Promise<void>;
  showActions?: boolean;
  showAvailableColumn?: boolean;
  mergeUsageColumn?: boolean;
  isActionBusy?: (id: number) => boolean;
};

function ActionButtons({
  item,
  onAction,
  isBusy,
}: {
  item: CreditLogItem;
  onAction: (item: CreditLogItem, action: CreditActionType) => void | Promise<void>;
  isBusy: boolean;
}) {
  const disabled = item.is_unavailable || isBusy;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        title="Xóa credit (chuyển không khả dụng)"
        onClick={() => void onAction(item, "delete")}
        className="rounded-md border border-rose-500/30 bg-rose-500/10 p-1 text-rose-300 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={disabled}
        title="Đã hoàn (chuyển không khả dụng)"
        onClick={() => void onAction(item, "complete")}
        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-1 text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <CheckCircleIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function CreditCard({
  item,
  onAction,
  showActions,
  isActionBusy,
}: {
  item: CreditLogItem;
  onAction: (item: CreditLogItem, action: CreditActionType) => void | Promise<void>;
  showActions: boolean;
  isActionBusy: (id: number) => boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-indigo-200/80">Mã credit</p>
          <p className="text-sm font-bold text-white">{item.credit_code || "—"}</p>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${resolveCreditStatusClass(item)}`}
        >
          {resolveCreditStatusText(item)}
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
      {showActions ? (
        <div className="mt-3">
          <ActionButtons item={item} onAction={onAction} isBusy={isActionBusy(item.id)} />
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center text-sm text-slate-300">
      {message}
    </div>
  );
}

export function CreditTableBlock({
  title,
  description,
  loading,
  items,
  emptyMessage,
  onAction,
  showActions = true,
  showAvailableColumn = true,
  mergeUsageColumn = false,
  isActionBusy = () => false,
}: CreditTableBlockProps) {
  const usageColumns = mergeUsageColumn ? 1 : 2;
  const baseColumns = 5 + (showAvailableColumn ? 1 : 0) + usageColumns;
  const columnCount = baseColumns + (showActions ? 1 : 0);

  return (
    <div className="rounded-[20px] border border-white/15 bg-slate-900/50 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-xs text-slate-300">{description}</p>
      </div>

      <ResponsiveTable
        showCardOnMobile
        cardView={
          loading ? (
            <div className="p-6 text-center text-sm text-indigo-200">Đang tải credit logs...</div>
          ) : items.length === 0 ? (
            <EmptyState message={emptyMessage} />
          ) : (
            <TableCard
              data={items as unknown as Record<string, unknown>[]}
              renderCard={(item) => (
                <CreditCard
                  item={item as unknown as CreditLogItem}
                  onAction={onAction}
                  showActions={showActions}
                  isActionBusy={isActionBusy}
                />
              )}
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
              {mergeUsageColumn ? (
                <th className="w-[20%]">Sử dụng</th>
              ) : (
                <th className="w-[11%]">Tổng credit</th>
              )}
              {showAvailableColumn ? <th className="w-[11%]">Khả dụng</th> : null}
              {mergeUsageColumn ? null : <th className="w-[11%]">Đã áp dụng</th>}
              <th className="w-[10%]">Trạng thái</th>
              <th className="w-[12%]">Lần áp dụng gần nhất</th>
              {showActions ? <th className="w-[9%] text-center">Thao tác</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columnCount} className="px-3 py-8 text-center text-indigo-200">
                  Đang tải credit logs...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-3 py-8">
                  <EmptyState message={emptyMessage} />
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
                  {mergeUsageColumn ? (
                    <td className="px-3 py-3">
                      <p>{formatMoneyVnd(item.applied_total)} / {formatMoneyVnd(item.refund_amount)}</p>
                      <p className="text-xs text-slate-300">{item.applied_count} lượt</p>
                    </td>
                  ) : (
                    <td className="px-3 py-3">{formatMoneyVnd(item.refund_amount)}</td>
                  )}
                  {showAvailableColumn ? (
                    <td className="px-3 py-3">{formatMoneyVnd(item.available_amount)}</td>
                  ) : null}
                  {mergeUsageColumn ? null : (
                    <td className="px-3 py-3">
                      <p>{formatMoneyVnd(item.applied_total)}</p>
                      <p className="text-xs text-slate-300">{item.applied_count} lượt</p>
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${resolveCreditStatusClass(item)}`}
                    >
                      {resolveCreditStatusText(item)}
                    </span>
                  </td>
                  <td className="px-3 py-3">{formatDateTime(item.last_applied_at)}</td>
                  {showActions ? (
                    <td className="px-3 py-3">
                      <ActionButtons
                        item={item}
                        onAction={onAction}
                        isBusy={isActionBusy(item.id)}
                      />
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ResponsiveTable>
    </div>
  );
}
