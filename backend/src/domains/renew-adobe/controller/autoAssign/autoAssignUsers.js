const adobeRenewV2 = require("@/services/renew-adobe/adobe-renew-v2");
const {
  resolveLisenceCount,
  mergeRenewAdobeAlertConfig,
  userCountDbValue,
} = require("@/domains/renew-adobe/controller/usersSnapshotUtils");
const {
  db,
  logger,
  TABLE,
  COLS,
  MAX_USERS_PER_ACCOUNT,
  MAP_TABLE,
  MAP_COLS,
  buildAvailableAccounts,
  TBL_ORDER,
  ORD_COLS,
  ALLOWED_ORDER_STATUSES,
  getRenewAdobeVariantIds,
  upsertRenewAdobeOrderUserTrackingForAccount,
  logAutoAssign,
} = require("@/domains/renew-adobe/controller/autoAssign/shared");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("@/config/dbSchema");
const OTP_CFG_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.OTP_CONFIGS.TABLE,
  SCHEMA_RENEW_ADOBE
);
const OTP_CFG_COLS = RENEW_ADOBE_SCHEMA.OTP_CONFIGS.COLS;

async function autoAssignUsers({ onProgress = null } = {}) {
  const variantIds = await getRenewAdobeVariantIds();
  let activeOrders = [];

  if (variantIds.length > 0) {
    activeOrders = await db(TBL_ORDER)
      .select(
        `${TBL_ORDER}.${ORD_COLS.INFORMATION_ORDER} as email`,
        `${TBL_ORDER}.${ORD_COLS.STATUS} as status`,
        `${TBL_ORDER}.${ORD_COLS.EXPIRY_DATE} as expiry_date`
      )
      .whereIn(ORD_COLS.ID_PRODUCT, variantIds)
      .whereIn(ORD_COLS.STATUS, ALLOWED_ORDER_STATUSES)
      .whereNotNull(ORD_COLS.INFORMATION_ORDER);
  }

  const now = new Date();
  const activeEmails = new Set();
  for (const order of activeOrders) {
    if (order.expiry_date && new Date(order.expiry_date) < now) {
      continue;
    }
    const email = (order.email || "").trim().toLowerCase();
    if (email) {
      activeEmails.add(email);
    }
  }

  logAutoAssign(onProgress, { step: "active_orders", count: activeEmails.size });

  const accounts = await db(TABLE)
    .leftJoin({ cfg: OTP_CFG_TABLE }, `cfg.${OTP_CFG_COLS.ID}`, `${TABLE}.${COLS.OTP_CONFIG_ID}`)
    .select(
      `${TABLE}.${COLS.ID}`,
      `${TABLE}.${COLS.EMAIL}`,
      `${TABLE}.${COLS.PASSWORD_ENC}`,
      `${TABLE}.${COLS.ORG_NAME}`,
      `${TABLE}.${COLS.LICENSE_STATUS}`,
      `${TABLE}.${COLS.USER_COUNT}`,
      `${TABLE}.${COLS.ALERT_CONFIG}`,
      `cfg.${OTP_CFG_COLS.OTP_SOURCE} as otp_source`,
      `cfg.${OTP_CFG_COLS.MAIL_BACKUP_ID} as mail_backup_id`,
      `cfg.${OTP_CFG_COLS.YUNA_ORDER_CODE} as yuna_order_code`,
      ...(COLS.ID_PRODUCT ? [`${TABLE}.${COLS.ID_PRODUCT}`] : [])
    )
    .where(`${TABLE}.${COLS.IS_ACTIVE}`, true)
    .orderBy(`${TABLE}.${COLS.ID}`, "asc");

  const existingEmails = new Set();
  const mappedRows = await db(MAP_TABLE)
    .whereNotNull(MAP_COLS.ADOBE_ACCOUNT_ID)
    .select(MAP_COLS.USER_EMAIL);
  for (const r of mappedRows) {
    const em = String(r[MAP_COLS.USER_EMAIL] || "")
      .trim()
      .toLowerCase();
    if (em) existingEmails.add(em);
  }

  const emailsToAdd = [...activeEmails].filter((email) => !existingEmails.has(email));
  logAutoAssign(onProgress, { step: "emails_to_add", count: emailsToAdd.length });

  if (emailsToAdd.length === 0) {
    return { assigned: 0, skipped: 0, errors: [] };
  }

  const available = await buildAvailableAccounts(accounts);
  logAutoAssign(onProgress, {
    step: "available_accounts",
    count: available.length,
    slots: available.map((account) => ({
      id: account[COLS.ID],
      slots: Math.max(0, (account.userLimit || MAX_USERS_PER_ACCOUNT) - account.currentCount),
      limit: account.userLimit || MAX_USERS_PER_ACCOUNT,
    })),
  });

  if (available.length === 0) {
    logAutoAssign(onProgress, {
      step: "no_slots",
      message: "Không có tài khoản nào còn slot",
    });
    return { assigned: 0, skipped: emailsToAdd.length, errors: [] };
  }

  const remaining = [...emailsToAdd];
  const distribution = [];

  for (const account of available) {
    if (remaining.length === 0) {
      break;
    }

    const slotsLeft = Math.max(
      0,
      (account.userLimit || MAX_USERS_PER_ACCOUNT) - account.currentCount
    );
    const take = Math.min(slotsLeft, remaining.length);
    const chunk = remaining.splice(0, take);
    if (chunk.length > 0) {
      distribution.push({ account, emails: chunk });
    }
  }

  let totalAssigned = 0;
  const errors = [];

  for (const { account, emails } of distribution) {
    const accountId = account[COLS.ID];
    const accountEmail = account[COLS.EMAIL];
    const accountPassword = account[COLS.PASSWORD_ENC] || "";

    logAutoAssign(onProgress, {
      step: "adding",
      accountId,
      accountEmail,
      userCount: emails.length,
    });

    try {
      const mailBackupId =
        account.mail_backup_id != null
          ? Number(account.mail_backup_id)
          : null;
      const savedCookies = account[COLS.ALERT_CONFIG]?.cookies || [];
      const otpSource =
        account.otp_source
          ? String(account.otp_source).trim().toLowerCase()
          : "imap";
      const v2 = await adobeRenewV2.addUsersWithProductV2(
        accountEmail,
        accountPassword,
        emails,
        {
          savedCookies,
          savedCookiesFromDb: account[COLS.ALERT_CONFIG] ?? null,
          mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
          otpSource,
          yunaOrderCode: account.yuna_order_code || null,
          orgId: account[COLS.ORG_ID] || null,
          maxUsers: account.userLimit || MAX_USERS_PER_ACCOUNT,
        }
      );

      if (!v2.success) {
        throw new Error(v2.error || "addUsersWithProductV2 thất bại");
      }

      const lisencecount = resolveLisenceCount({
        usersSnapshot: null,
        alertConfig: account[COLS.ALERT_CONFIG],
      });
      const updatePayload = {
        [COLS.USER_COUNT]: userCountDbValue(
          lisencecount,
          v2.userCount ?? (v2.manageTeamMembers?.length ?? 0)
        ),
      };
      if (v2.savedCookies) {
        updatePayload[COLS.ALERT_CONFIG] = mergeRenewAdobeAlertConfig(
          account[COLS.ALERT_CONFIG],
          v2.savedCookies,
          null
        );
      }
      await db(TABLE).where(COLS.ID, accountId).update(updatePayload);

      const addedCount = v2.addResult?.added?.length ?? emails.length;
      totalAssigned += addedCount;

      await upsertRenewAdobeOrderUserTrackingForAccount(accountId).catch((error) => {
        logger.warn("[renew-adobe] autoAssign order_user_tracking failed", {
          accountId,
          error: error.message,
        });
      });

      logAutoAssign(onProgress, {
        step: "done",
        accountId,
        added: addedCount,
        assignProduct: v2.assignResult?.success ?? false,
      });
    } catch (err) {
      logger.error(
        "[renew-adobe] autoAssign add failed: account=%s, error=%s",
        accountId,
        err.message
      );
      errors.push(`Account ${accountId}: ${err.message}`);
    }
  }

  const skipped = remaining.length;
  logAutoAssign(onProgress, {
    step: "complete",
    assigned: totalAssigned,
    skipped,
    errors: errors.length,
  });

  return { assigned: totalAssigned, skipped, errors };
}

const runAutoAssign = async (_req, res) => {
  try {
    const result = await autoAssignUsers();
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error("[renew-adobe] runAutoAssign failed", { error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  autoAssignUsers,
  runAutoAssign,
};
