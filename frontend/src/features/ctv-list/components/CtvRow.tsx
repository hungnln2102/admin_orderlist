import { EyeIcon, PencilIcon } from "@heroicons/react/24/outline";
import type { CtvItem } from "../types";
import { CTV_STATUS_LABELS } from "../types";
import { formatCtvCurrency } from "../constants";

type CtvRowProps = {
  item: CtvItem;
  index: number;
  onView: (item: CtvItem) => void;
  onEdit: (item: CtvItem) => void;
  /** true = form Khách hàng (cột HỌ, TÊN riêng); false = form CTV (một cột TÊN) */
  variant?: "ctv" | "customer";
};

const statusClass: Record<CtvItem["status"], string> = {
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  inactive: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  suspended: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export function CtvRow({ item, index, onView, onEdit, variant = "ctv" }: CtvRowProps) {
  const statusLabel = CTV_STATUS_LABELS[item.status];
  const statusStyle = statusClass[item.status];
  const isCustomerForm = variant === "customer";

  return (
    <tr className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      <td className="px-2 py-3 sm:px-4 text-center text-sm text-white/80 tabular-nums whitespace-nowrap">
        {index}
      </td>
      <td className="px-2 py-3 sm:px-4 text-sm text-white/90 whitespace-nowrap">
        {item.account}
      </td>
      {isCustomerForm ? (
        <>
          <td className="px-2 py-3 sm:px-4 text-sm text-white/90 whitespace-nowrap">
            {item.lastName ?? ""}
          </td>
          <td className="px-2 py-3 sm:px-4 text-sm font-medium text-white whitespace-nowrap">
            {item.firstName ?? ""}
          </td>
        </>
      ) : (
        <td className="px-2 py-3 sm:px-4 text-sm font-medium text-white whitespace-nowrap">
          {item.name}
        </td>
      )}
      <td className="px-2 py-3 sm:px-4 text-sm text-white/80 max-w-[180px] truncate" title={item.email}>
        {item.email}
      </td>
      <td className="px-2 py-3 sm:px-4 text-right text-sm text-white/90 tabular-nums whitespace-nowrap">
        {formatCtvCurrency(item.balance)}
      </td>
      <td className="px-2 py-3 sm:px-4 text-right text-sm text-white/90 tabular-nums whitespace-nowrap">
        {formatCtvCurrency(item.totalSpent)}
      </td>
      {isCustomerForm && (
        <td className="px-2 py-3 sm:px-4 text-center text-sm text-white/90 font-medium whitespace-nowrap">
          {item.rank}
        </td>
      )}
      <td className="px-2 py-3 sm:px-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}
        >
          {statusLabel}
        </span>
      </td>
      <td className="px-2 py-3 sm:px-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onView(item)}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            title="Xem chi tiết"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            title="Chỉnh sửa"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
