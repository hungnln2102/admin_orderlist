import { EyeIcon, PencilIcon } from "@heroicons/react/24/outline";
import type { CustomerStatusItem } from "../types";
import { CUSTOMER_STATUS_LABELS } from "../types";
import { formatCustomerCurrency } from "../constants";

type CustomerStatusCardProps = {
  item: CustomerStatusItem;
  index: number;
  onView: (item: CustomerStatusItem) => void;
  onEdit: (item: CustomerStatusItem) => void;
};

const statusClass: Record<CustomerStatusItem["status"], string> = {
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  inactive: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  suspended: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export function CustomerStatusCard({
  item,
  index,
  onView,
  onEdit,
}: CustomerStatusCardProps) {
  const statusLabel = CUSTOMER_STATUS_LABELS[item.status];
  const statusStyle = statusClass[item.status];

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-indigo-300/70 tabular-nums">
              #{index}
            </span>
            <span className="text-sm text-white/70">{item.account}</span>
            <h3 className="text-base font-semibold text-white truncate">
              {item.lastName} {item.firstName}
            </h3>
            <span
              className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${statusStyle}`}
            >
              {statusLabel}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="text-white/60">Email</div>
            <div className="text-white/90 truncate text-right">{item.email}</div>
            <div className="text-white/60">Số dư</div>
            <div className="text-white font-medium tabular-nums text-right">
              {formatCustomerCurrency(item.balance)}
            </div>
            <div className="text-white/60">Tổng tiêu</div>
            <div className="text-white font-medium tabular-nums text-right">
              {formatCustomerCurrency(item.totalSpent)}
            </div>
            <div className="text-white/60">Hạng</div>
            <div className="text-right">
              <span className="inline-flex items-center rounded-lg bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/30">
                {item.rank}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onView(item)}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
            title="Xem chi tiết"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
            title="Chỉnh sửa"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
