import { useMemo, useState } from "react";
import { RenewAdobeAccountsTable } from "@/features/renew-adobe/components/RenewAdobeAccountsTable";
import { AddUserByEmail } from "@/features/renew-adobe/components/AddUserByEmail";
import { AddAdminAccountModal } from "@/features/renew-adobe/components/AddAdminAccountModal";
import { RenewAdobeHeader } from "@/features/renew-adobe/components/RenewAdobeHeader";
import { RenewAdobeProgressPanel } from "@/features/renew-adobe/components/RenewAdobeProgressPanel";
import { UserOrdersTable } from "@/features/renew-adobe/components/UserOrdersTable";
import type { AdobeAdminAccount } from "@/features/renew-adobe/types";
import { useRenewAdobeAdmin } from "@/features/renew-adobe/hooks/useRenewAdobeAdmin";

const PAGE_SIZE = 10;

export default function RenewAdobeAdmin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const {
    accounts,
    loading,
    error,
    checkingId,
    checkError,
    deletingId,
    fixingId,
    checkAllProgress,
    autoAssignPhase,
    autoAssignResult,
    isCheckingAll,
    loadAccounts,
    dismissCheckAllProgress,
    handleCheckAll,
    handleCancelCheckAll,
    handleDeleteUser,
    handleFixUser,
    handleSaveUrlAccess,
    handleCheck,
  } = useRenewAdobeAdmin();

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return accounts;
    const q = searchTerm.trim().toLowerCase();
    return accounts.filter(
      (item) =>
        item.email.toLowerCase().includes(q) ||
        (item.org_name ?? "").toLowerCase().includes(q)
    );
  }, [accounts, searchTerm]);

  const totalItems = filtered.length;
  const currentRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      <AddAdminAccountModal
        open={addAdminOpen}
        onClose={() => setAddAdminOpen(false)}
        onCreated={loadAccounts}
      />
      <RenewAdobeHeader
        isCheckingAll={isCheckingAll}
        loading={loading}
        accountCount={accounts.length}
        checkingId={checkingId}
        onCheckAll={handleCheckAll}
        onCancelCheckAll={handleCancelCheckAll}
        onAddAdmin={() => setAddAdminOpen(true)}
      />

      {checkAllProgress && checkAllProgress.total > 0 && (
        <RenewAdobeProgressPanel
          total={checkAllProgress.total}
          completed={checkAllProgress.completed}
          failed={checkAllProgress.failed}
          isCheckingAll={isCheckingAll}
          autoAssignPhase={autoAssignPhase}
          autoAssignResult={autoAssignResult}
          onClose={dismissCheckAllProgress}
        />
      )}

      <RenewAdobeAccountsTable
        accounts={accounts}
        currentRows={currentRows}
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        searchTerm={searchTerm}
        loading={loading}
        error={error}
        checkError={checkError}
        checkingId={checkingId}
        isCheckingAll={isCheckingAll}
        checkingIds={checkAllProgress?.checkingIds}
        onSearchTermChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        onPageChange={setCurrentPage}
        onCheck={handleCheck}
        onSaveUrlAccess={handleSaveUrlAccess}
      />

      <div className="mt-6 space-y-6">
        <UserOrdersTable
          accounts={accounts}
          onDeleteUser={handleDeleteUser}
          deletingId={deletingId}
          onFixUser={handleFixUser}
          fixingId={fixingId}
        />
        <AddUserByEmail onAdded={loadAccounts} />
      </div>
    </div>
  );
}

