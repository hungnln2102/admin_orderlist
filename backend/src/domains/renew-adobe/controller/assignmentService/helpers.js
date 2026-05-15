const { db } = require("../../../../db");
const logger = require("../../../../utils/logger");
const adobeRenewV2 = require("../../../../services/renew-adobe/adobe-renew-v2");
const {
  lookupAndRecordIfNeeded,
  markUsersProductFalseByAccount,
} = require("../../../../services/userAccountMappingService");
const {
  upsertRenewAdobeOrderUserTrackingForAccount,
} = require("../../../../services/renew-adobe/orderUserTrackingService");
const { resolveLisenceCount, mergeRenewAdobeAlertConfig, userCountDbValue } = require("../usersSnapshotUtils");
const { TABLE, COLS } = require("./availableAccounts");

function isAdobeSlotFullAddError(msg) {
  return String(msg || "").includes("đầy slot");
}

function normalizeDistinctEmails(userEmailsRaw) {
  return [
    ...new Set(
      (Array.isArray(userEmailsRaw) ? userEmailsRaw : [])
        .map((e) => String(e || "").trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function getTargetRuntimeConfig(target) {
  const mailBackupId =
    target[COLS.MAIL_BACKUP_ID] != null
      ? Number(target[COLS.MAIL_BACKUP_ID])
      : null;
  const savedCookies = target[COLS.ALERT_CONFIG]?.cookies || [];
  const otpSource =
    COLS.OTP_SOURCE && target[COLS.OTP_SOURCE]
      ? String(target[COLS.OTP_SOURCE]).trim().toLowerCase()
      : "imap";
  return {
    mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
    savedCookies,
    otpSource,
  };
}

async function addUsersToAdobe({ target, emails }) {
  const accountEmail = target[COLS.EMAIL];
  const accountPassword = target[COLS.PASSWORD_ENC] || "";
  const { mailBackupId, savedCookies, otpSource } = getTargetRuntimeConfig(target);

  return adobeRenewV2.addUsersWithProductV2(
    accountEmail,
    accountPassword,
    emails,
    {
      savedCookies,
      savedCookiesFromDb: target[COLS.ALERT_CONFIG] ?? null,
      mailBackupId,
      otpSource,
      maxUsers: target.userLimit,
    }
  );
}

async function persistAfterAddSuccess({
  context,
  target,
  accountId,
  fallbackAddedEmails,
  v2,
}) {
  const lisencecount = resolveLisenceCount({
    usersSnapshot: null,
    alertConfig: target[COLS.ALERT_CONFIG],
  });
  const updatePayload = {
    [COLS.USER_COUNT]: userCountDbValue(
      lisencecount,
      v2.userCount ?? (v2.manageTeamMembers?.length ?? 0)
    ),
  };
  if (v2.savedCookies) {
    updatePayload[COLS.ALERT_CONFIG] = mergeRenewAdobeAlertConfig(
      target[COLS.ALERT_CONFIG],
      v2.savedCookies,
      null
    );
  }
  await db(TABLE).where(COLS.ID, accountId).update(updatePayload);

  const addedEmails =
    v2.addResult?.added?.length > 0 ? v2.addResult.added : fallbackAddedEmails;
  await lookupAndRecordIfNeeded(addedEmails, accountId).catch((error) => {
    logger.warn(`[renew-adobe] ${context} mapping failed`, {
      accountId,
      error: error.message,
    });
  });
  const noProductEmails = Array.isArray(v2.addResult?.noProduct)
    ? v2.addResult.noProduct
    : [];
  if (noProductEmails.length > 0) {
    await markUsersProductFalseByAccount(noProductEmails, accountId).catch((error) => {
      logger.warn(`[renew-adobe] ${context} mark product=false failed`, {
        accountId,
        emails: noProductEmails,
        error: error.message,
      });
    });
  }

  await upsertRenewAdobeOrderUserTrackingForAccount(accountId).catch((error) => {
    logger.warn(`[renew-adobe] ${context} order_user_tracking failed`, {
      accountId,
      error: error.message,
    });
  });

  return updatePayload;
}

module.exports = {
  isAdobeSlotFullAddError,
  normalizeDistinctEmails,
  addUsersToAdobe,
  persistAfterAddSuccess,
};
