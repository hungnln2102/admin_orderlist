import { ArrowPathIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { UserOrdersTableActionProps } from "./types";
import { getRowActionState } from "./row-action-state";

type Props = UserOrdersTableActionProps & {
  compact?: boolean;
};

export function RowActionButtons({
  row,
  displayStatus,
  onDeleteUser,
  deletingId,
  onFixUser,
  fixingId,
  fixAllProgress,
  deletingTrackingId,
  adesRenewingId,
  onOpenEdit,
  onOpenDeleteTracking,
  onOpenAdesRenew,
  compact = false,
}: Props) {
  const { showAdesRenew, showAdobeFix } = getRowActionState(
    displayStatus,
    row.systemNote,
    row.accountId,
    Boolean(onFixUser)
  );

  const deleteDisabled = !!deletingId || !!fixingId || !!fixAllProgress;
  const actionBtnCls = compact
    ? "rounded-lg bg-rose-500/20 text-rose-300 border border-rose-400/40 px-2.5 py-1 text-xs font-semibold hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
    : "rounded-lg bg-rose-500/20 text-rose-300 border border-rose-400/40 px-3 py-1.5 text-xs font-semibold";
  const fixBtnCls = compact
    ? "rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2.5 py-1 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
    : "rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3 py-1.5 text-xs font-semibold";

  return (
    <>
      {showAdesRenew && (
        <button
          type="button"
          onClick={() => onOpenAdesRenew(row)}
          disabled={adesRenewingId === row.email}
          className="inline-flex items-center gap-1 rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/15 px-2.5 py-1 text-xs font-semibold text-fuchsia-200 hover:bg-fuchsia-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Renew qua Fix Ades"
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
          {adesRenewingId === row.email ? "Đang renew…" : "Renew Ades"}
        </button>
      )}

      {row.accountId > 0 && onDeleteUser && (
        <button
          type="button"
          onClick={() => onDeleteUser(row.accountId, row.email)}
          disabled={deleteDisabled}
          className={actionBtnCls}
        >
          Xóa user
        </button>
      )}

      {showAdobeFix && (
        <button
          type="button"
          onClick={() => onFixUser?.(row.email)}
          disabled={deleteDisabled}
          className={fixBtnCls}
        >
          {fixingId === row.email ? "Đang fix..." : "Fix"}
        </button>
      )}

      <button
        type="button"
        onClick={() => onOpenEdit(row)}
        disabled={deletingTrackingId === row.order_code}
        className={`inline-flex items-center justify-center rounded-lg border border-indigo-400/40 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25 disabled:opacity-40 ${
          compact ? "h-7 w-7" : "px-2 py-1.5"
        }`}
        title="Sửa hệ thống fix"
        aria-label="Sửa"
      >
        <PencilSquareIcon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>

      <button
        type="button"
        onClick={() => onOpenDeleteTracking(row)}
        disabled={deletingTrackingId === row.order_code}
        className={`inline-flex items-center justify-center rounded-lg border border-rose-400/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 disabled:opacity-40 ${
          compact ? "h-7 w-7" : "px-2 py-1.5"
        }`}
        title="Xoá đơn khỏi tracking"
        aria-label="Xoá khỏi tracking"
      >
        <TrashIcon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </>
  );
}
