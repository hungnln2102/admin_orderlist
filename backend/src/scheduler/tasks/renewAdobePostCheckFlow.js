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
const {
  recordUsersAssigned,
  syncOrdersToMapping,
} = require("../../services/userAccountMappingService");
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

const ACCOUNT_TABLE_DEF = RENEW_ADOBE_SCHEMA.ACCOUNT;
const ACCOUNT_TABLE = tableName(ACCOUNT_TABLE_DEF.TABLE, SCHEMA_RENEW_ADOBE);
const ACCOUNT_COLS = ACCOUNT_TABLE_DEF.COLS;

const MAP_TABLE_DEF = RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING;
const MAP_TABLE = tableName(MAP_TABLE_DEF.TABLE, SCHEMA_RENEW_ADOBE);
const MAP_COLS = MAP_TABLE_DEF.COLS;

const ORDER_TABLE = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const ORDER_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;

const PRODUCT_SYSTEM_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.TABLE,
  SCHEMA_RENEW_ADOBE
);
const PRODUCT_SYSTEM_COLS = RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.COLS;

const MAX_USERS_PER_ACCOUNT = 10;
const RENEW_ADOBE_SYSTEM_CODE = "renew_adobe";
const ACTIVE_ORDER_STATUSES = [STATUS.PAID, STATUS.RENEWAL, STATUS.PROCESSING];

function resolveAccountUserLimit(account) {
  const n = Number(
    resolveLisenceCount({
      usersSnapshot: account?.[ACCOUNT_COLS.USERS_SNAPSHOT],
      alertConfig: account?.[ACCOUNT_COLS.ALERT_CONFIG],
    }) || 0
  );
  if (Number.isFinite(n) && n > 0) return n;
  return MAX_USERS_PER_ACCOUNT;
}

async function retryOnce(taskName, handler) {
  try {
    return await handler(1);
  } catch (firstError) {
    logger.warn("[CRON][post-check-fix] %s failed attempt 1: %s", taskName, firstError.message);
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

async function buildEmailToOrderMap(emails) {
  if (!emails || emails.length === 0) return {};
  const rows = await db(ORDER_TABLE)
    .whereIn(
      db.raw(`LOWER(${ORDER_COLS.INFORMATION_ORDER})`),
      emails.map((email) => String(email || "").toLowerCase())
    )
    .whereNotIn(ORDER_COLS.STATUS, [
      STATUS.EXPIRED,
      STATUS.CANCELED,
      STATUS.REFUNDED,
      STATUS.PENDING_REFUND,
    ])
    .orderBy(ORDER_COLS.ORDER_DATE, "desc")
    .select(ORDER_COLS.INFORMATION_ORDER, ORDER_COLS.ID_ORDER);

  const map = {};
  for (const row of rows) {
    const email = (row[ORDER_COLS.INFORMATION_ORDER] || "").toLowerCase().trim();
    if (email && !map[email]) map[email] = row[ORDER_COLS.ID_ORDER];
  }
  return map;
}

async function collectUnassignedRenewAdobeUsers() {
  const variantIds = await getRenewAdobeVariantIds();
  if (variantIds.length === 0) return [];

  const rows = await db({ m: MAP_TABLE })
    .join({ o: ORDER_TABLE }, "m.id_order", "o.id_order")
    .whereIn("o.id_product", variantIds)
    .whereIn("o.status", ACTIVE_ORDER_STATUSES)
    .whereNotNull("o.information_order")
    .whereRaw(
      `(o.${ORDER_COLS.EXPIRY_DATE})::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh' > (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`
    )
    .where((qb) =>
      qb.whereNull(`m.${MAP_COLS.ADOBE_ACCOUNT_ID}`).orWhere(`m.${MAP_COLS.PRODUCT}`, false)
    )
    .select(`m.${MAP_COLS.USER_EMAIL} as user_email`);

  const unique = new Set();
  for (const row of rows) {
    const email = (row.user_email || "").toString().trim().toLowerCase();
    if (email) unique.add(email);
  }

  // Snapshot users lấy trực tiếp từ Adobe trong bước check là nguồn sự thật.
  // Nếu email đã có trong users_snapshot của bất kỳ account active nào thì không add lại.
  const accounts = await db(ACCOUNT_TABLE)
    .select(ACCOUNT_COLS.EMAIL, ACCOUNT_COLS.USERS_SNAPSHOT)
    .where(ACCOUNT_COLS.IS_ACTIVE, true)
    .whereNotNull(ACCOUNT_COLS.USERS_SNAPSHOT);
  const alreadyOnAdobe = new Set();
  for (const account of accounts) {
    const adminEmail = (account[ACCOUNT_COLS.EMAIL] || "").toString().trim().toLowerCase();
    let users = [];
    try {
      users = JSON.parse(account[ACCOUNT_COLS.USERS_SNAPSHOT] || "[]");
    } catch {
      users = [];
    }
    if (!Array.isArray(users)) continue;
    for (const user of users) {
      const email = (user?.email || "").toString().trim().toLowerCase();
      if (!email || email === adminEmail) continue;
      alreadyOnAdobe.add(email);
    }
  }

  return [...unique].filter((email) => !alreadyOnAdobe.has(email));
}

async function reassignUsersToAvailableAccounts(emailsToReassign, jobRun) {
  if (emailsToReassign.length === 0) {
    return {
      assigned: 0,
      remaining: [],
      failedAccounts: [],
    };
  }

  const allAccounts = await db(ACCOUNT_TABLE)
    .select(
      ACCOUNT_COLS.ID,
      ACCOUNT_COLS.EMAIL,
      ACCOUNT_COLS.PASSWORD_ENC,
      ACCOUNT_COLS.USER_COUNT,
      ACCOUNT_COLS.LICENSE_STATUS,
      ACCOUNT_COLS.USERS_SNAPSHOT,
      ...(ACCOUNT_COLS.MAIL_BACKUP_ID ? [ACCOUNT_COLS.MAIL_BACKUP_ID] : []),
      ...(ACCOUNT_COLS.OTP_SOURCE ? [ACCOUNT_COLS.OTP_SOURCE] : []),
      ...(ACCOUNT_COLS.ALERT_CONFIG ? [ACCOUNT_COLS.ALERT_CONFIG] : [])
    )
    .where(ACCOUNT_COLS.IS_ACTIVE, true)
    .where(ACCOUNT_COLS.LICENSE_STATUS, "Paid");

  const available = allAccounts
    .map((account) => ({
      ...account,
      currentCount: Math.max(0, Number.parseInt(account[ACCOUNT_COLS.USER_COUNT], 10) || 0),
      userLimit: resolveAccountUserLimit(account),
    }))
    .filter((account) => account.currentCount < account.userLimit)
    .sort((a, b) => {
      const slotsA = a.userLimit - a.currentCount;
      const slotsB = b.userLimit - b.currentCount;
      return slotsA - slotsB;
    });

  let remaining = [...emailsToReassign];
  let assigned = 0;
  const failedAccounts = [];

  for (const account of available) {
    if (remaining.length === 0) break;

    const accountId = account[ACCOUNT_COLS.ID];
    const accountEmail = account[ACCOUNT_COLS.EMAIL];
    const accountPassword = account[ACCOUNT_COLS.PASSWORD_ENC] || "";
    const slotsLeft = Math.max(0, account.userLimit - account.currentCount);
    const chunk = remaining.splice(0, slotsLeft);
    if (chunk.length === 0) continue;

    try {
      const mailBackupId = account[ACCOUNT_COLS.MAIL_BACKUP_ID] != null
        ? Number(account[ACCOUNT_COLS.MAIL_BACKUP_ID])
        : null;
      const savedCookies = account[ACCOUNT_COLS.ALERT_CONFIG]?.cookies || [];
      const otpSource =
        ACCOUNT_COLS.OTP_SOURCE && account[ACCOUNT_COLS.OTP_SOURCE]
          ? String(account[ACCOUNT_COLS.OTP_SOURCE]).trim().toLowerCase()
          : "imap";

      const addResult = await retryOnce(
        `addUsersWithProductV2(account=${accountId})`,
        async () =>
          adobeRenewV2.addUsersWithProductV2(accountEmail, accountPassword, chunk, {
            savedCookies,
            mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
            otpSource,
          })
      );

      if (!addResult.success) throw new Error(addResult.error || "addUsersWithProductV2 thất bại");

      const lisencecount = resolveLisenceCount({
        usersSnapshot: account[ACCOUNT_COLS.USERS_SNAPSHOT],
        alertConfig: account[ACCOUNT_COLS.ALERT_CONFIG],
      });
      const updatePayload = {
        [ACCOUNT_COLS.USER_COUNT]:
          addResult.userCount ?? (addResult.manageTeamMembers?.length ?? 0),
        [ACCOUNT_COLS.USERS_SNAPSHOT]: JSON.stringify(
          attachLisenceCount(addResult.manageTeamMembers || [], lisencecount)
        ),
      };
      if (addResult.savedCookies) {
        updatePayload[ACCOUNT_COLS.ALERT_CONFIG] = mergeRenewAdobeAlertConfig(
          account[ACCOUNT_COLS.ALERT_CONFIG],
          addResult.savedCookies,
          account[ACCOUNT_COLS.USERS_SNAPSHOT]
        );
      }
      await db(ACCOUNT_TABLE).where(ACCOUNT_COLS.ID, accountId).update(updatePayload);

      const emailOrderMap = await buildEmailToOrderMap(chunk);
      for (const email of chunk) {
        const orderId = emailOrderMap[(email || "").toLowerCase()] || null;
        if (!orderId) continue;
        await recordUsersAssigned([email], orderId, accountId).catch((error) => {
          logger.warn("[CRON][post-check-fix] recordUsersAssigned failed: %s", error.message);
        });
      }

      assigned += chunk.length;
      addCounter(jobRun, "users_fixed", chunk.length);
    } catch (error) {
      failedAccounts.push({
        accountId,
        accountEmail,
        error: error.message,
      });
      remaining = [...chunk, ...remaining];
      addCounter(jobRun, "failed_accounts", 1);
      logger.error(
        "[CRON][post-check-fix] account=%s (%s) failed: %s",
        accountId,
        accountEmail,
        error.message
      );
    }
  }

  return {
    assigned,
    remaining,
    failedAccounts,
  };
}

async function runRenewAdobePostCheckFlow({ trigger = "cron" } = {}) {
  const jobRun = startJobRun("renew-adobe-post-check-fix", { trigger });
  setCounter(jobRun, "users_to_fix", 0);
  setCounter(jobRun, "users_fixed", 0);
  setCounter(jobRun, "remaining_unfixed", 0);
  setCounter(jobRun, "failed_accounts", 0);

  const syncResult = await syncOrdersToMapping().catch((error) => {
    logger.warn("[CRON][post-check-fix] syncOrdersToMapping failed: %s", error.message);
    return { inserted: 0, removed: 0 };
  });

  const emailsToFix = await collectUnassignedRenewAdobeUsers();
  setCounter(jobRun, "users_to_fix", emailsToFix.length);

  if (emailsToFix.length === 0) {
    finishJobRun(jobRun, {
      sync_inserted: syncResult.inserted || 0,
      sync_removed: syncResult.removed || 0,
    });
    return {
      usersToFix: 0,
      usersFixed: 0,
      remainingUnfixed: 0,
      failedAccounts: [],
      syncResult,
    };
  }

  const assignResult = await reassignUsersToAvailableAccounts(emailsToFix, jobRun);
  const remainingAfterRun = await collectUnassignedRenewAdobeUsers().catch(() => assignResult.remaining);
  setCounter(jobRun, "remaining_unfixed", remainingAfterRun.length);

  const summary = {
    usersToFix: emailsToFix.length,
    usersFixed: assignResult.assigned,
    remainingUnfixed: remainingAfterRun.length,
    failedAccounts: assignResult.failedAccounts,
    syncResult,
  };

  if (summary.failedAccounts.length > 0 || summary.remainingUnfixed > 0) {
    notifyWarn({
      source: "backend",
      message:
        `[CRON][post-check-fix] trigger=${trigger} users_to_fix=${summary.usersToFix}, ` +
        `users_fixed=${summary.usersFixed}, remaining_unfixed=${summary.remainingUnfixed}, ` +
        `failed_accounts=${summary.failedAccounts.length}`,
    });
  }

  finishJobRun(jobRun, {
    sync_inserted: syncResult.inserted || 0,
    sync_removed: syncResult.removed || 0,
  });
  return summary;
}

module.exports = {
  collectUnassignedRenewAdobeUsers,
  runRenewAdobePostCheckFlow,
};

