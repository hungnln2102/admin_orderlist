import { useAdminAccountDeletion } from "./use-renew-adobe-admin/adminDeletion";
import { useAdminAccountsData } from "./use-renew-adobe-admin/accountsData";
import { useAdminCheckFlow } from "./use-renew-adobe-admin/checkFlow";
import { useAdminUrlAccess } from "./use-renew-adobe-admin/urlAccess";
import { useAdminUserActions } from "./use-renew-adobe-admin/userActions";

export function useRenewAdobeAdmin() {
  const { accounts, setAccounts, loading, error, loadAccounts } =
    useAdminAccountsData();

  const {
    checkingId,
    checkError,
    setCheckError,
    checkAllProgress,
    autoAssignPhase,
    autoAssignResult,
    isCheckingAll,
    cronTestLoading,
    cronTestBanner,
    dismissCheckAllProgress,
    handleCheckAll,
    handleCancelCheckAll,
    handleTestCronJob,
    handleCheck,
  } = useAdminCheckFlow({ setAccounts, loadAccounts });

  const {
    deletingId,
    fixingId,
    fixAllProgress,
    handleDeleteUser,
    handleFixUser,
    handleFixAllUsers,
  } = useAdminUserActions({ loadAccounts, setCheckError });

  const {
    deletingAdminAccountId,
    adminAccountPendingDelete,
    openDeleteAdminModal,
    closeDeleteAdminModal,
    confirmDeleteAdminAccount,
  } = useAdminAccountDeletion({ loadAccounts, setCheckError });

  const handleSaveUrlAccess = useAdminUrlAccess(setAccounts);

  return {
    accounts,
    loading,
    error,
    checkingId,
    checkError,
    deletingAdminAccountId,
    adminAccountPendingDelete,
    openDeleteAdminModal,
    closeDeleteAdminModal,
    confirmDeleteAdminAccount,
    deletingId,
    fixingId,
    fixAllProgress,
    checkAllProgress,
    autoAssignPhase,
    autoAssignResult,
    isCheckingAll,
    cronTestLoading,
    cronTestBanner,
    loadAccounts,
    dismissCheckAllProgress,
    handleCheckAll,
    handleCancelCheckAll,
    handleTestCronJob,
    handleDeleteUser,
    handleFixUser,
    handleFixAllUsers,
    handleSaveUrlAccess,
    handleCheck,
  };
}
