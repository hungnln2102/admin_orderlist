import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
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
  const { isActive, canFixViaAdes, canFixViaAdobe, showFixButton } = getRowActionState(
    displayStatus,
    row.systemNote,
    row.accountId,
    Boolean(onFixUser)
  );

  const deleteDisabled = !!deletingId || !!fixingId || !!fixAllProgress;
  const actionBtnCls = compact
    ? "rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/20 px-2.5 py-1 text-xs font-semibold hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_10px_rgba(244,63,94,0.02)] cursor-pointer disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
    : "rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-semibold hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_10px_rgba(244,63,94,0.02)] cursor-pointer";
  const fixBtnCls = compact
    ? "rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/20 px-2.5 py-1 text-xs font-semibold hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_10px_rgba(245,158,11,0.02)] cursor-pointer disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
    : "rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-semibold hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_10px_rgba(245,158,11,0.02)] cursor-pointer";
  const disabledFixBtnCls = compact
    ? "rounded-xl bg-slate-500/5 text-slate-400/40 border border-white/5 px-2.5 py-1 text-xs font-semibold cursor-not-allowed opacity-50"
    : "rounded-xl bg-slate-500/5 text-slate-400/40 border border-white/5 px-3 py-1.5 text-xs font-semibold cursor-not-allowed opacity-50";
  const isFixLoading = fixingId === row.email || adesRenewingId === row.email;
  const canClickFix = canFixViaAdes || canFixViaAdobe;
  const disableFix = isFixLoading || deleteDisabled || !canClickFix || isActive;
  const handleFix = () => {
    if (canFixViaAdes) {
      onOpenAdesRenew(row);
      return;
    }
    if (canFixViaAdobe) {
      onFixUser?.(row.email);
    }
  };

  return (
    <>
      {showFixButton ? (
        <button
          type="button"
          onClick={handleFix}
          disabled={disableFix}
          className={disableFix ? disabledFixBtnCls : fixBtnCls}
          title={isActive ? "Đơn đã fix, không cần thao tác thêm" : "Fix user"}
        >
          {isFixLoading ? "Đang fix..." : "Fix"}
        </button>
      ) : null}

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

      <button
        type="button"
        onClick={() => onOpenEdit(row)}
        disabled={deletingTrackingId === row.order_code}
        className={`inline-flex items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:border-indigo-500/50 hover:bg-indigo-500/20 disabled:opacity-40 hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_10px_rgba(99,102,241,0.02)] cursor-pointer ${
          compact ? "h-8 w-8 shrink-0" : "px-3 py-1.5"
        }`}
        title="Sửa hệ thống fix"
        aria-label="Sửa"
      >
        <PencilSquareIcon className={compact ? "h-4 w-4" : "h-4.5 w-4.5"} />
      </button>

      <button
        type="button"
        onClick={() => onOpenDeleteTracking(row)}
        disabled={deletingTrackingId === row.order_code}
        className={`inline-flex items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/20 disabled:opacity-40 hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_10px_rgba(244,63,94,0.02)] cursor-pointer ${
          compact ? "h-8 w-8 shrink-0" : "px-3 py-1.5"
        }`}
        title="Xoá đơn khỏi tracking"
        aria-label="Xoá khỏi tracking"
      >
        <TrashIcon className={compact ? "h-4 w-4" : "h-4.5 w-4.5"} />
      </button>
    </>
  );
}
