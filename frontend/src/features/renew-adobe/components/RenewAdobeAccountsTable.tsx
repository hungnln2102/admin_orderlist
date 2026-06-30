import { useState } from "react";
import {
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Pagination from "@/components/ui/Pagination";
import type { AdobeAdminAccount } from "../types";
import { EditAccountModal } from "./EditAccountModal";
import { RenewAdobeAccountsResponsiveTable } from "./RenewAdobeAccountsResponsiveTable";

export type RenewAdobeAccountsTableProps = {
  accounts: AdobeAdminAccount[];
  currentRows: AdobeAdminAccount[];
  currentPage: number;
  totalItems: number;
  pageSize: number;
  searchTerm: string;
  loading: boolean;
  error: string | null;
  checkError: string | null;
  checkingId: number | null;
  deletingAdminAccountId: number | null;
  isCheckingAll: boolean;
  checkingIds?: Set<number>;
  onSearchTermChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onCheck: (account: AdobeAdminAccount) => void;
  onDeleteAdmin: (account: AdobeAdminAccount) => void;
  onSaveUrlAccess: (accountId: number, url: string) => void;
  onRefresh?: () => void;
};

export function RenewAdobeAccountsTable({
  accounts,
  currentRows,
  currentPage,
  totalItems,
  pageSize,
  searchTerm,
  loading,
  error,
  checkError,
  checkingId,
  deletingAdminAccountId,
  isCheckingAll,
  checkingIds,
  onSearchTermChange,
  onPageChange,
  onCheck,
  onDeleteAdmin,
  onSaveUrlAccess,
  onRefresh,
}: RenewAdobeAccountsTableProps) {
  const start = (currentPage - 1) * pageSize;
  const [editingAccount, setEditingAccount] = useState<AdobeAdminAccount | null>(null);


  return (
    <div className="space-y-6">
      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300/70 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo email, alias, org, id product..."
            className="w-full pl-11 pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-500/10 border-b border-rose-400/20 text-rose-300 text-sm">
            {error}
          </div>
        )}
        {checkError && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-400/20 text-amber-300 text-sm">
            {checkError}
          </div>
        )}
        {loading ? (
          <div className="p-12 text-center text-white/70">
            Đang tải danh sách...
          </div>
        ) : (
          <RenewAdobeAccountsResponsiveTable
            accounts={accounts}
            currentRows={currentRows}
            start={start}
            checkingId={checkingId}
            deletingAdminAccountId={deletingAdminAccountId}
            isCheckingAll={isCheckingAll}
            checkingIds={checkingIds}
            onCheck={onCheck}
            onDeleteAdmin={onDeleteAdmin}
            onEditAccount={setEditingAccount}
            onSaveUrlAccess={onSaveUrlAccess}
          />
        )}

        {!loading && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:px-6">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>
      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSaved={() => onRefresh?.()}
        />
      )}
    </div>
  );
}
