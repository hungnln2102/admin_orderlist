const logger = require("../../utils/logger");
const { db } = require("../../db");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  SCHEMA_ORDERS,
  ORDERS_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const adobeRenewV2 = require("../../services/adobe-renew-v2");
const { STATUS } = require("../../utils/statuses");
const { runCheckForAccountId } = require("../../controllers/RenewAdobeController");
const { runCheckAllAccountsFlow } = require("../../controllers/RenewAdobeController/autoAssign");
const { notifyWarn } = require("../../utils/telegramErrorNotifier");
const {
  startJobRun,
  setCounter,
  addCounter,
  finishJobRun,
} = require("./shared/jobRunLogger");
const {
  attachLisenceCount,
  resolveLisenceCount,
  mergeRenewAdobeAlertConfig,
} = require("../../controllers/RenewAdobeController/usersSnapshotUtils");

const ACCOUNT_TABLE = tableName(RENEW_ADOBE_SCHEMA.ACCOUNT.TABLE, SCHEMA_RENEW_ADOBE);
const ACCOUNT_COLS = RENEW_ADOBE_SCHEMA.ACCOUNT.COLS;

const PRODUCT_SYSTEM_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.TABLE,
  SCHEMA_RENEW_ADOBE
);
const PRODUCT_SYSTEM_COLS = RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.COLS;

const ORDER_TABLE = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const ORDER_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;

const MAP_SCHEMA = RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING;
const MAP_TABLE = tableName(MAP_SCHEMA.TABLE, SCHEMA_RENEW_ADOBE);
const MAP_COLS = MAP_SCHEMA.COLS;

const RENEW_ADOBE_SYSTEM_CODE = "renew_adobe";
const ACTIVE_ORDER_STATUSES = [STATUS.PAID, STATUS.RENEWAL, STATUS.PROCESSING];

async function retryOnce(taskName, handler) {
  try {
    return await handler(1);
  } catch (firstError) {
    logger.warn("[CRON][cleanup-23-30] %s failed attempt 1: %s", taskName, firstError.message);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return handler(2);
  }
}

async function getRenewAdobeVariantIds() {
  const rows = await db(PRODUCT_SYSTEM_TABLE)
    .where(PRODUCT_SYSTEM_COLS.SYSTEM_CODE, RENEW_ADOBE_SYSTEM_CODE)
    .select(PRODUCT_SYSTEM_COLS.VARIANT_ID);
  return rows.map((row) => row[PRODUCT_SYSTEM_COLS.VARIANT_ID]).filter((id) => id != null);
}

async function getActiveOrderEmails(variantIds) {
  if (!variantIds || variantIds.length === 0) return new Set();
  const rows = await db(ORDER_TABLE)
    .select(ORDER_COLS.INFORMATION_ORDER)
    .whereIn(ORDER_COLS.ID_PRODUCT, variantIds)
    .whereIn(ORDER_COLS.STATUS, ACTIVE_ORDER_STATUSES)
    .whereNotNull(ORDER_COLS.INFORMATION_ORDER)
    .whereRaw(
      `(${ORDER_TABLE}.${ORDER_COLS.EXPIRY_DATE})::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh' > (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`
    );
  return new Set(
    rows
      .map((row) => (row[ORDER_COLS.INFORMATION_ORDER] || "").toLowerCase().trim())
      .filter(Boolean)
  );
}

async function collectExpiredOrDueUsers(variantIds) {
  if (!variantIds || variantIds.length === 0) return new Set();
  const rows = await db(ORDER_TABLE)
    .select(ORDER_COLS.INFORMATION_ORDER)
    .whereIn(ORDER_COLS.ID_PRODUCT, variantIds)
    .whereNotNull(ORDER_COLS.INFORMATION_ORDER)
    .whereRaw(
      `(${ORDER_TABLE}.${ORDER_COLS.EXPIRY_DATE})::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh' <= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`
    );
  return new Set(
    rows
      .map((row) => (row[ORDER_COLS.INFORMATION_ORDER] || "").toLowerCase().trim())
      .filter(Boolean)
  );
}

function extractEmailsToDeleteFromAccountSnapshot({ usersSnapshot, adminEmail, activeEmails, expiredOrDueEmails }) {
  const users = Array.isArray(usersSnapshot) ? usersSnapshot : [];
  return users
    .map((user) => (user?.email || "").trim())
    .filter((email) => {
      const lower = email.toLowerCase();
      if (!lower || lower === adminEmail) return false;
      if (expiredOrDueEmails.has(lower)) return true;
      return !activeEmails.has(lower);
    });
}

async function runRenewAdobeCleanup2330Flow({
  trigger = "cron",
  runCheckBeforeCleanup = true,
} = {}) {
  const jobRun = startJobRun("renew-adobe-cleanup-23-30", {
    trigger,
    runCheckBeforeCleanup,
  });
  setCounter(jobRun, "checked_accounts", 0);
  setCounter(jobRun, "check_failed_accounts", 0);
  setCounter(jobRun, "users_to_remove", 0);
  setCounter(jobRun, "users_removed", 0);
  setCounter(jobRun, "failed_users", 0);
  setCounter(jobRun, "failed_accounts", 0);

  let checkResult = null;
  if (runCheckBeforeCleanup) {
    checkResult = await runCheckAllAccountsFlow({
      runCheckForAccountId,
      includeAutoAssign: false,
      logPrefix: "[CRON][23:30][check-before-cleanup]",
    });
    setCounter(jobRun, "checked_accounts", Number(checkResult.completed || 0));
    setCounter(jobRun, "check_failed_accounts", Number(checkResult.failed || 0));
  }

  const variantIds = await getRenewAdobeVariantIds();
  const activeEmails = await getActiveOrderEmails(variantIds);
  const expiredOrDueEmails = await collectExpiredOrDueUsers(variantIds);

  const accounts = await db(ACCOUNT_TABLE)
    .select(
      ACCOUNT_COLS.ID,
      ACCOUNT_COLS.EMAIL,
      ACCOUNT_COLS.PASSWORD_ENC,
      ACCOUNT_COLS.USERS_SNAPSHOT,
      ACCOUNT_COLS.IS_ACTIVE,
      ACCOUNT_COLS.ALERT_CONFIG,
      ACCOUNT_COLS.MAIL_BACKUP_ID
    )
    .where(ACCOUNT_COLS.IS_ACTIVE, true)
    .whereNotNull(ACCOUNT_COLS.USERS_SNAPSHOT);

  const failedAccounts = [];

  for (const account of accounts) {
    let usersSnapshot = [];
    try {
      usersSnapshot = JSON.parse(account[ACCOUNT_COLS.USERS_SNAPSHOT] || "[]");
    } catch {
      usersSnapshot = [];
    }
    if (!Array.isArray(usersSnapshot) || usersSnapshot.length === 0) continue;

    const adminEmail = (account[ACCOUNT_COLS.EMAIL] || "").toLowerCase().trim();
    const toDelete = extractEmailsToDeleteFromAccountSnapshot({
      usersSnapshot,
      adminEmail,
      activeEmails,
      expiredOrDueEmails,
    });

    if (toDelete.length === 0) continue;

    addCounter(jobRun, "users_to_remove", toDelete.length);

    try {
      const password = account[ACCOUNT_COLS.PASSWORD_ENC] || "";
      if (!password) throw new Error("Thiếu password_encrypted");

      const mailBackupId = account[ACCOUNT_COLS.MAIL_BACKUP_ID] != null
        ? Number(account[ACCOUNT_COLS.MAIL_BACKUP_ID])
        : null;
      const deleteResult = await retryOnce(
        `autoDeleteUsers(account=${account[ACCOUNT_COLS.ID]})`,
        async () =>
          adobeRenewV2.autoDeleteUsers(account[ACCOUNT_COLS.EMAIL], password, toDelete, {
            savedCookiesFromDb: account[ACCOUNT_COLS.ALERT_CONFIG] || null,
            mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
          })
      );

      addCounter(jobRun, "users_removed", Number(deleteResult.deleted?.length || 0));
      addCounter(jobRun, "failed_users", Number(deleteResult.failed?.length || 0));

      if (Array.isArray(deleteResult.deleted) && deleteResult.deleted.length > 0) {
        const deletedLower = deleteResult.deleted.map((email) => String(email || "").toLowerCase());
        await db(MAP_TABLE)
          .whereIn(db.raw(`LOWER(${MAP_COLS.USER_EMAIL})`), deletedLower)
          .andWhere(MAP_COLS.ADOBE_ACCOUNT_ID, account[ACCOUNT_COLS.ID])
          .update({
            [MAP_COLS.PRODUCT]: false,
            [MAP_COLS.UPDATED_AT]: new Date(),
          });
      }

      if (deleteResult.savedCookies) {
        await db(ACCOUNT_TABLE)
          .where(ACCOUNT_COLS.ID, account[ACCOUNT_COLS.ID])
          .update({
            [ACCOUNT_COLS.ALERT_CONFIG]: mergeRenewAdobeAlertConfig(
              account[ACCOUNT_COLS.ALERT_CONFIG],
              deleteResult.savedCookies,
              account[ACCOUNT_COLS.USERS_SNAPSHOT]
            ),
          });
      }

      if (deleteResult.snapshot && Array.isArray(deleteResult.snapshot.manageTeamMembers)) {
        const lisencecount = resolveLisenceCount({
          usersSnapshot: account[ACCOUNT_COLS.USERS_SNAPSHOT],
          alertConfig: account[ACCOUNT_COLS.ALERT_CONFIG],
        });
        await db(ACCOUNT_TABLE)
          .where(ACCOUNT_COLS.ID, account[ACCOUNT_COLS.ID])
          .update({
            [ACCOUNT_COLS.USERS_SNAPSHOT]: JSON.stringify(
              attachLisenceCount(deleteResult.snapshot.manageTeamMembers, lisencecount)
            ),
            ...(deleteResult.snapshot.orgName != null && {
              [ACCOUNT_COLS.ORG_NAME]: deleteResult.snapshot.orgName,
            }),
            ...(deleteResult.snapshot.licenseStatus != null && {
              [ACCOUNT_COLS.LICENSE_STATUS]: deleteResult.snapshot.licenseStatus,
            }),
            [ACCOUNT_COLS.USER_COUNT]: deleteResult.snapshot.manageTeamMembers.length,
          });
      } else {
        await runCheckForAccountId(account[ACCOUNT_COLS.ID]).catch((error) => {
          logger.warn(
            "[CRON][cleanup-23-30] runCheckForAccountId(%s) failed: %s",
            account[ACCOUNT_COLS.ID],
            error.message
          );
        });
      }
    } catch (error) {
      addCounter(jobRun, "failed_accounts", 1);
      failedAccounts.push({
        accountId: account[ACCOUNT_COLS.ID],
        accountEmail: account[ACCOUNT_COLS.EMAIL],
        error: error.message,
      });
      logger.error(
        "[CRON][cleanup-23-30] account=%s (%s) failed: %s",
        account[ACCOUNT_COLS.ID],
        account[ACCOUNT_COLS.EMAIL],
        error.message
      );
    }
  }

  const summary = {
    checkResult,
    usersToRemove: Number(jobRun.counters.users_to_remove || 0),
    usersRemoved: Number(jobRun.counters.users_removed || 0),
    failedUsers: Number(jobRun.counters.failed_users || 0),
    failedAccounts,
  };

  if (summary.failedUsers > 0 || summary.failedAccounts.length > 0) {
    notifyWarn({
      source: "backend",
      message:
        `[CRON][cleanup-23-30] trigger=${trigger} users_to_remove=${summary.usersToRemove}, ` +
        `users_removed=${summary.usersRemoved}, failed_users=${summary.failedUsers}, ` +
        `failed_accounts=${summary.failedAccounts.length}`,
    });
  }

  finishJobRun(jobRun);
  return summary;
}

module.exports = {
  collectExpiredOrDueUsers,
  runRenewAdobeCleanup2330Flow,
};

