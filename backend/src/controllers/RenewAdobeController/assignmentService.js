const { db } = require("../../db");
const logger = require("../../utils/logger");
const adobeRenewV2 = require("../../services/adobe-renew-v2");
const {
  lookupAndRecordIfNeeded,
} = require("../../services/userAccountMappingService");
const { TABLE, COLS, MAX_USERS_PER_ACCOUNT } = require("./accountTable");
const {
  ACTIVE_LICENSE_STATUSES,
  normalizeLicenseStatus,
} = require("./statusUtils");

function buildAvailableAccounts(accounts) {
  return accounts
    .filter((account) => {
      const licenseStatus = normalizeLicenseStatus(account[COLS.LICENSE_STATUS]);
      const isActive =
        account[COLS.IS_ACTIVE] !== false &&
        account[COLS.IS_ACTIVE] !== 0 &&
        account[COLS.IS_ACTIVE] !== "0";

      return isActive && ACTIVE_LICENSE_STATUSES.has(licenseStatus);
    })
    .map((account) => ({
      ...account,
      currentCount: Math.max(0, parseInt(account[COLS.USER_COUNT], 10) || 0),
    }))
    .filter((account) => account.currentCount < MAX_USERS_PER_ACCOUNT)
    .sort((a, b) => {
      const slotsA = MAX_USERS_PER_ACCOUNT - a.currentCount;
      const slotsB = MAX_USERS_PER_ACCOUNT - b.currentCount;
      return slotsA - slotsB;
    });
}

async function assignUserToAvailableAccount(userEmail) {
  const normalizedEmail = String(userEmail || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Thiếu email.");
  }

  const accounts = await db(TABLE)
    .select(
      COLS.ID,
      COLS.EMAIL,
      COLS.PASSWORD_ENC,
      COLS.ORG_NAME,
      COLS.LICENSE_STATUS,
      COLS.USER_COUNT,
      COLS.ALERT_CONFIG,
      COLS.MAIL_BACKUP_ID,
      COLS.IS_ACTIVE
    )
    .orderBy(COLS.ID, "asc");

  const available = buildAvailableAccounts(accounts);
  if (available.length === 0) {
    throw new Error("Không có tài khoản nào còn gói và còn slot.");
  }

  const target = available[0];
  const accountId = target[COLS.ID];
  const accountEmail = target[COLS.EMAIL];
  const accountPassword = target[COLS.PASSWORD_ENC] || "";
  const mailBackupId =
    target[COLS.MAIL_BACKUP_ID] != null
      ? Number(target[COLS.MAIL_BACKUP_ID])
      : null;
  const savedCookies = target[COLS.ALERT_CONFIG]?.cookies || [];

  logger.info(
    "[renew-adobe] assignUserToAvailableAccount: email=%s → account=%s",
    normalizedEmail,
    accountId
  );

  const v2 = await adobeRenewV2.addUsersWithProductV2(
    accountEmail,
    accountPassword,
    [normalizedEmail],
    {
      savedCookies,
      mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
    }
  );

  if (!v2.success) {
    throw new Error(v2.error || "addUsersWithProductV2 thất bại");
  }

  const updatePayload = {
    [COLS.USER_COUNT]: v2.userCount ?? (v2.manageTeamMembers?.length ?? 0),
    [COLS.USERS_SNAPSHOT]: JSON.stringify(v2.manageTeamMembers || []),
  };
  if (v2.savedCookies) {
    updatePayload[COLS.ALERT_CONFIG] = v2.savedCookies;
  }

  await db(TABLE).where(COLS.ID, accountId).update(updatePayload);

  const addedEmails =
    v2.addResult?.added?.length > 0 ? v2.addResult.added : [normalizedEmail];
  await lookupAndRecordIfNeeded(addedEmails, accountId).catch((error) => {
    logger.warn("[renew-adobe] assignUserToAvailableAccount mapping failed", {
      email: normalizedEmail,
      accountId,
      error: error.message,
    });
  });

  return {
    accountId,
    accountEmail,
    profileName: target[COLS.ORG_NAME] ?? null,
    userCount: updatePayload[COLS.USER_COUNT],
  };
}

module.exports = {
  buildAvailableAccounts,
  assignUserToAvailableAccount,
};
