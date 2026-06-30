import { maskPassword } from "../utils/accountUtils";
import type { AdobeAdminAccount } from "../types";
import { RenewAdobeAccountActions } from "./RenewAdobeAccountActions";
import { StatusBadge } from "./StatusBadge";

type RenewAdobeAccountMobileCardProps = {
  account: AdobeAdminAccount;
  index: number;
  checkingId: number | null;
  deletingAdminAccountId: number | null;
  isCheckingAll: boolean;
  onCheck: (account: AdobeAdminAccount) => void;
  onDeleteAdmin: (account: AdobeAdminAccount) => void;
  onEditAccount: (account: AdobeAdminAccount) => void;
};

export function formatAdobeAdminSlotRatio(account: AdobeAdminAccount): string {
  const trackingUserCount = account.tracking_user_count ?? 0;
  const licenseUserCount = Number(account.user_count) || 0;
  return `${trackingUserCount}/${licenseUserCount}`;
}

export const getOtpSourceLabel = (source?: AdobeAdminAccount["otp_source"]) => {
  if (source === "tinyhost") return "TinyHost";
  if (source === "hdsd") return "otp.hdsd.net";
  if (source === "ades") return "OTP Ades";
  return "IMAP";
};

export function RenewAdobeAccountMobileCard({
  account,
  index,
  checkingId,
  deletingAdminAccountId,
  isCheckingAll,
  onCheck,
  onDeleteAdmin,
  onEditAccount,
}: RenewAdobeAccountMobileCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-xs text-white/50">#{index}</p>
      <p className="text-sm font-medium text-white break-all">{account.email}</p>
      <p className="text-xs text-white/60">
        M???t kh???u: {maskPassword(account.password_encrypted)}
      </p>
      <p className="text-xs text-white/70 break-all">OTP</p>
      <p className="text-xs text-white/70 break-all">
        Ngu???n OTP: {getOtpSourceLabel(account.otp_source)}
      </p>
      <p className="text-xs text-white/70 break-all">
        Alias: {account.alias ?? "???"}
      </p>
      <p className="text-xs text-white/70">Org: {account.org_name ?? "???"}</p>
      <p className="text-xs text-white/70 break-all">
        ID Product: {account.id_product ?? "???"}
      </p>
      <p className="text-xs text-white/70">
        Slot (user tracking / license): {formatAdobeAdminSlotRatio(account)}
      </p>
      <StatusBadge status={account.license_status} account={account} />
      <RenewAdobeAccountActions
        account={account}
        checkingId={checkingId}
        deletingAdminAccountId={deletingAdminAccountId}
        isCheckingAll={isCheckingAll}
        compact
        onCheck={onCheck}
        onDeleteAdmin={onDeleteAdmin}
        onEditAccount={onEditAccount}
      />
    </div>
  );
}
