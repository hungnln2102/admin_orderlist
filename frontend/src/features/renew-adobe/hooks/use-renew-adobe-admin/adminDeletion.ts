import { useCallback, useState } from "react";
import { deleteAdobeAdminAccount } from "../../api/renewAdobeApi";
import type { AdobeAdminAccount } from "../../types";

type UseAdminAccountDeletionParams = {
  loadAccounts: () => void;
  setCheckError: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useAdminAccountDeletion({
  loadAccounts,
  setCheckError,
}: UseAdminAccountDeletionParams) {
  const [deletingAdminAccountId, setDeletingAdminAccountId] = useState<number | null>(null);
  const [adminAccountPendingDelete, setAdminAccountPendingDelete] =
    useState<AdobeAdminAccount | null>(null);

  const openDeleteAdminModal = useCallback(
    (account: AdobeAdminAccount) => {
      setCheckError(null);
      setAdminAccountPendingDelete(account);
    },
    [setCheckError]
  );

  const closeDeleteAdminModal = useCallback(() => {
    if (deletingAdminAccountId !== null) return;
    setAdminAccountPendingDelete(null);
  }, [deletingAdminAccountId]);

  const confirmDeleteAdminAccount = useCallback(() => {
    const account = adminAccountPendingDelete;
    if (!account) return;
    setCheckError(null);
    setDeletingAdminAccountId(account.id);
    deleteAdobeAdminAccount(account.id)
      .then(() => {
        loadAccounts();
        setAdminAccountPendingDelete(null);
      })
      .catch((err) =>
        setCheckError(err?.message ?? "Lá»—i khi xÃ³a tÃ i khoáº£n admin.")
      )
      .finally(() => setDeletingAdminAccountId(null));
  }, [adminAccountPendingDelete, loadAccounts, setCheckError]);

  return {
    deletingAdminAccountId,
    adminAccountPendingDelete,
    openDeleteAdminModal,
    closeDeleteAdminModal,
    confirmDeleteAdminAccount,
  };
}
