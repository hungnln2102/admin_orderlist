const {
  getMappingCountsByAdobeAccountIds,
} = require("../../../../services/userAccountMappingService");
const { TABLE, COLS, MAX_USERS_PER_ACCOUNT } = require("../accountTable");
const {
  ACTIVE_LICENSE_STATUSES,
  normalizeLicenseStatus,
} = require("../statusUtils");
const {
  resolveAccountUserLimit,
  resolveAccountSeatLimit,
} = require("../usersSnapshotUtils");

function hasActivePackageByContractCount(account) {
  const n = Number(resolveAccountSeatLimit(account) || 0);
  return Number.isFinite(n) && n > 0;
}

async function buildAvailableAccounts(accounts) {
  const filtered = accounts.filter((account) => {
    const licenseStatus = normalizeLicenseStatus(account[COLS.LICENSE_STATUS]);
    const isActive =
      account[COLS.IS_ACTIVE] !== false &&
      account[COLS.IS_ACTIVE] !== 0 &&
      account[COLS.IS_ACTIVE] !== "0";
    const hasPackageByContract = hasActivePackageByContractCount(account);
    return (
      isActive &&
      (hasPackageByContract || ACTIVE_LICENSE_STATUSES.has(licenseStatus))
    );
  });

  const ids = filtered.map((a) => Number(a[COLS.ID])).filter((n) => n > 0);
  const countMap = await getMappingCountsByAdobeAccountIds(ids);

  return filtered
    .map((account) => {
      const id = Number(account[COLS.ID]);
      return {
        ...account,
        currentCount: countMap.get(id) ?? 0,
        userLimit: resolveAccountUserLimit(account, MAX_USERS_PER_ACCOUNT),
      };
    })
    .filter((account) => account.currentCount < account.userLimit)
    .sort((a, b) => {
      const slotsA = a.userLimit - a.currentCount;
      const slotsB = b.userLimit - b.currentCount;
      return slotsA - slotsB;
    });
}

function getAccountsBaseSelectCols() {
  return [
    COLS.ID,
    COLS.EMAIL,
    COLS.PASSWORD_ENC,
    COLS.ORG_NAME,
    COLS.LICENSE_STATUS,
    COLS.USER_COUNT,
    COLS.ALERT_CONFIG,
    ...(COLS.OTP_SOURCE ? [COLS.OTP_SOURCE] : []),
    COLS.MAIL_BACKUP_ID,
    COLS.IS_ACTIVE,
    ...(COLS.ID_PRODUCT ? [COLS.ID_PRODUCT] : []),
  ];
}

module.exports = {
  TABLE,
  COLS,
  buildAvailableAccounts,
  getAccountsBaseSelectCols,
};
