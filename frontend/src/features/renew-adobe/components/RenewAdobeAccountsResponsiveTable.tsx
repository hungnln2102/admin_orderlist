import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import { maskPassword } from "../utils/accountUtils";
import type { AdobeAdminAccount } from "../types";
import { StatusBadge } from "./StatusBadge";
import { UrlAccessCell } from "./UrlAccessCell";
import { RenewAdobeAccountActions } from "./RenewAdobeAccountActions";
import {
  formatAdobeAdminSlotRatio,
  getOtpSourceLabel,
  RenewAdobeAccountMobileCard,
} from "./RenewAdobeAccountMobileCard";

type RenewAdobeAccountsResponsiveTableProps = {
  accounts: AdobeAdminAccount[];
  currentRows: AdobeAdminAccount[];
  start: number;
  checkingId: number | null;
  deletingAdminAccountId: number | null;
  isCheckingAll: boolean;
  checkingIds?: Set<number>;
  onCheck: (account: AdobeAdminAccount) => void;
  onDeleteAdmin: (account: AdobeAdminAccount) => void;
  onEditAccount: (account: AdobeAdminAccount) => void;
  onSaveUrlAccess: (accountId: number, url: string) => void;
};

export function RenewAdobeAccountsResponsiveTable({
  accounts,
  currentRows,
  start,
  checkingId,
  deletingAdminAccountId,
  isCheckingAll,
  checkingIds,
  onCheck,
  onDeleteAdmin,
  onEditAccount,
  onSaveUrlAccess,
}: RenewAdobeAccountsResponsiveTableProps) {
  return (
          <ResponsiveTable
            showCardOnMobile
            cardView={
              currentRows.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-white/70 text-lg mb-2">
                    {accounts.length === 0
                      ? "Chưa có tài khoản nào"
                      : "Không tìm thấy tài khoản nào"}
                  </p>
                  <p className="text-white/60 text-sm">
                    {accounts.length === 0
                      ? "Thêm tài khoản vào bảng system_automation.accounts_admin"
                      : "Thử thay đổi từ khóa tìm kiếm"}
                  </p>
                </div>
              ) : (
                <TableCard
                  data={currentRows}
                  renderCard={(item, idx) => {
                    const account = item as AdobeAdminAccount;
                    return (
                      <RenewAdobeAccountMobileCard
                        account={account}
                        index={start + idx + 1}
                        checkingId={checkingId}
                        deletingAdminAccountId={deletingAdminAccountId}
                        isCheckingAll={isCheckingAll}
                        onCheck={onCheck}
                        onDeleteAdmin={onDeleteAdmin}
                        onEditAccount={onEditAccount}
                      />
                    );
                  }}
                  className="p-4"
                />
              )
            }
          >
            <table className="min-w-full divide-y divide-white/5 text-white">
              <thead>
                <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                  <th className="min-w-[180px]">EMAIL</th>
                  <th className="min-w-[100px]">PASSWORD</th>
                  <th className="min-w-[120px]">OTP</th>
                  <th className="min-w-[120px]">OTP SOURCE</th>
                  <th className="min-w-[140px]">TEAM</th>
                  <th className="min-w-[120px]">ID PRODUCT</th>
                  <th className="w-28 text-center" title="user tracking / user_count">
                    SLOT
                  </th>
                  <th className="w-36">LICENSE</th>
                  <th className="w-20 text-center">LINK PRODUCT</th>
                  <th className="w-28 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-12 text-center text-white/70"
                    >
                      <p className="text-lg mb-2">
                        {accounts.length === 0
                          ? "Chưa có tài khoản nào"
                          : "Không tìm thấy tài khoản nào"}
                      </p>
                      <p className="text-sm text-white/60">
                        {accounts.length === 0
                          ? "Thêm tài khoản vào bảng system_automation.accounts_admin"
                          : "Thử thay đổi từ khóa tìm kiếm"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentRows.map((item) => {
                    const account = item as AdobeAdminAccount;
                    const isBeingChecked = checkingIds?.has(account.id) ?? false;

                    return (
                      <tr
                        key={account.id}
                        className={isBeingChecked ? "bg-indigo-500/10 animate-pulse" : ""}
                      >
                        <td className="px-2 sm:px-4 py-3 text-sm text-white/90 break-all">
                          {account.email}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm text-white/60 font-mono">
                          {maskPassword(account.password_encrypted)}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm text-white/80 break-all max-w-[200px]">
                          <p className="text-xs text-white/70">{account.alias ?? "—"}</p>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm text-white/80">
                          {getOtpSourceLabel(account.otp_source)}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm text-white/80">
                          {account.org_name ?? "—"}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm text-white/80 font-mono text-xs break-all max-w-[220px]">
                          {account.id_product ?? "—"}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm text-white/80 text-center tabular-nums whitespace-nowrap">
                          {formatAdobeAdminSlotRatio(account)}
                        </td>
                        <td className="px-2 sm:px-4 py-3">
                          <StatusBadge
                            status={account.license_status}
                            account={account}
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-center">
                          <UrlAccessCell
                            value={account.access_url ?? ""}
                            onSave={(url) => onSaveUrlAccess(account.id, url)}
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-center">
                          <RenewAdobeAccountActions
                            account={account}
                            checkingId={checkingId}
                            deletingAdminAccountId={deletingAdminAccountId}
                            isCheckingAll={isCheckingAll}
                            isBeingChecked={isBeingChecked}
                            onCheck={onCheck}
                            onDeleteAdmin={onDeleteAdmin}
                            onEditAccount={onEditAccount}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </ResponsiveTable>
  );
}
