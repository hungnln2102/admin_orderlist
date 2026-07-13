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
          : "inline-flex flex-nowrap items-center justify-center gap-1.5"
      }
    >
      <button
        type="button"
        onClick={() => onCheck(account)}
        disabled={disabled}
        title={
          checkingId === account.id
            ? "??ang check..."
            : isBeingChecked
              ? "Checking..."
              : "Check"
        }
        aria-label="Check account"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {checkIsLoading ? (
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
        ) : (
          <EyeIcon className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        onClick={() => onEditAccount(account)}
        title="Sửa"
        aria-label="Sửa account"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300 border border-amber-400/35 hover:bg-amber-500/25"
      >
        <PencilSquareIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDeleteAdmin(account)}
        disabled={disabled}
        title={deleteIsLoading ? "??ang x??a..." : "X??a"}
        aria-label="X??a account"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300 border border-rose-400/35 hover:bg-rose-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {deleteIsLoading ? (
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
        ) : (
          <TrashIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
