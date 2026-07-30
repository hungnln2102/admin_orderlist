import {
  ArrowPathIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { AdobeAdminAccount } from "../types";

type RenewAdobeAccountActionsProps = {
  account: AdobeAdminAccount;
  checkingId: number | null;
  deletingAdminAccountId: number | null;
  isCheckingAll: boolean;
  isBeingChecked?: boolean;
  compact?: boolean;
  onCheck: (account: AdobeAdminAccount) => void;
  onDeleteAdmin: (account: AdobeAdminAccount) => void;
  onEditAccount: (account: AdobeAdminAccount) => void;
};

export function RenewAdobeAccountActions({
  account,
  checkingId,
  deletingAdminAccountId,
  isCheckingAll,
  isBeingChecked = false,
  compact = false,
  onCheck,
  onDeleteAdmin,
  onEditAccount,
}: RenewAdobeAccountActionsProps) {
  const disabled =
    checkingId !== null || isCheckingAll || deletingAdminAccountId !== null;
  const checkIsLoading = checkingId === account.id || isBeingChecked;
  const deleteIsLoading = deletingAdminAccountId === account.id;

  return (
    <div
      className={
        compact
          ? "mt-2 flex flex-nowrap items-center gap-2"
          : "inline-flex flex-nowrap items-center justify-center gap-2"
      }
    >
      <button
        type="button"
        onClick={() => onCheck(account)}
        disabled={disabled}
        title={
          checkingId === account.id
            ? "Đang check..."
            : isBeingChecked
              ? "Checking..."
              : "Check trạng thái"
        }
        aria-label="Check account"
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 hover:bg-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_10px_rgba(99,102,241,0.02)]"
      >
        {checkIsLoading ? (
          <ArrowPathIcon className="h-4 w-4 animate-spin text-indigo-400" />
        ) : (
          <EyeIcon className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        onClick={() => onEditAccount(account)}
        title="Sửa thông tin"
        aria-label="Sửa account"
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/20 hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_10px_rgba(245,158,11,0.02)]"
      >
        <PencilSquareIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDeleteAdmin(account)}
        disabled={disabled}
        title={deleteIsLoading ? "Đang xóa..." : "Xóa tài khoản"}
        aria-label="Xóa account"
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_10px_rgba(244,63,94,0.02)]"
      >
        {deleteIsLoading ? (
          <ArrowPathIcon className="h-4 w-4 animate-spin text-rose-400" />
        ) : (
          <TrashIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
